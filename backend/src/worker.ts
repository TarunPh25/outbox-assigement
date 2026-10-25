import { getTestMessageUrl } from 'nodemailer';
import { DelayedError, Job, Worker } from 'bullmq';
import { config } from './config';
import { pool } from './db';
import { createRedis } from './redis';
import { EmailJobData, QUEUE_NAME } from './queue';
import { Sender, transporterFor } from './services/mailer';
import { markLimitNotified, tryConsume } from './services/rateLimiter';
import { hasSlack, notifyRateLimit } from './services/slack';
import { indexEmail } from './services/search';
import { stripHtml } from './util';

const STALE_CLAIM = "interval '2 minutes'";

/**
 * Idempotency: atomically flip scheduled -> processing. If the email is already sent/failed/being
 * processed by a live worker, the UPDATE matches 0 rows and we skip. A claim older than 2 minutes is
 * considered orphaned (worker crashed) and can be re-claimed.
 */
async function claim(id: string) {
  const { rows } = await pool.query(
    `UPDATE emails SET status='processing', claimed_at=now(), attempts=attempts+1
     WHERE id=$1 AND (status='scheduled' OR (status='processing' AND claimed_at < now() - ${STALE_CLAIM}))
     RETURNING *`, [id]);
  return rows[0];
}

const toDoc = (e: any, sender: string) => ({
  id: e.id, userId: e.user_id, to: e.to_email, subject: e.subject, body: stripHtml(e.body),
  status: e.status, sender, scheduledAt: new Date(e.scheduled_at).toISOString(),
  sentAt: e.sent_at ? new Date(e.sent_at).toISOString() : null,
});

async function processor(job: Job<EmailJobData>, token?: string) {
  const email = await claim(job.data.emailId);
  if (!email) return 'skipped (already handled)';

  const { rows: [sender] } = await pool.query<Sender>('SELECT * FROM senders WHERE id=$1', [email.sender_id]);
  const limit = Math.min(email.hourly_limit ?? Infinity, config.maxPerHourPerSender);

  const rl = await tryConsume(sender.id, limit);
  if (!rl.allowed) {
    // Do NOT fail/drop: push the same job to the start of the next hour window.
    // BullMQ delayed jobs with equal timestamps keep insertion order, which preserves ordering.
    const { rows: [u] } = await pool.query(
      `UPDATE emails SET status='scheduled', scheduled_at=$2, attempts=attempts-1 WHERE id=$1 RETURNING *`,
      [email.id, new Date(rl.nextWindow)]);
    await indexEmail(toDoc(u, sender.email));
    // Only consume the once-per-hour alert slot if Slack is actually connected, so a later connect still gets alerts.
    if ((await hasSlack(email.user_id)) && (await markLimitNotified(sender.id, rl.windowStart))) {
      await notifyRateLimit(email.user_id, sender.email, limit, rl.nextWindow);
    }
    await job.moveToDelayed(rl.nextWindow, token);
    throw new DelayedError();
  }

  try {
    const info = await transporterFor(sender).sendMail({
      from: sender.email, to: email.to_email, subject: email.subject, html: email.body, text: stripHtml(email.body),
      messageId: `<${email.id}@reachinbox.local>`, // stable id: a duplicate would be recognisable downstream
    });
    const { rows: [u] } = await pool.query(
      `UPDATE emails SET status='sent', sent_at=now(), preview_url=$2, error=NULL WHERE id=$1 RETURNING *`,
      [email.id, getTestMessageUrl(info) || null]);
    await indexEmail(toDoc(u, sender.email));
    return 'sent';
  } catch (err) {
    // Release the claim so the BullMQ retry can pick it up (we consumed a rate slot; acceptable & conservative).
    await pool.query(`UPDATE emails SET status='scheduled', error=$2 WHERE id=$1`, [email.id, (err as Error).message]);
    throw err;
  }
}

export function startWorker() {
  const worker = new Worker<EmailJobData>(QUEUE_NAME, processor, {
    connection: createRedis(),
    concurrency: config.workerConcurrency,
    // Global min spacing between sends across ALL workers: 1 job per MIN_DELAY ms.
    limiter: { max: 1, duration: config.minDelayMs },
  });

  worker.on('failed', async (job, err) => {
    if (!job || err instanceof DelayedError) return;
    if (job.attemptsMade >= (job.opts.attempts ?? 1)) {
      const { rows: [u] } = await pool.query(
        `UPDATE emails SET status='failed', error=$2 WHERE id=$1 AND status<>'sent' RETURNING *`,
        [job.data.emailId, err.message]);
      if (u) {
        const { rows: [s] } = await pool.query('SELECT email FROM senders WHERE id=$1', [u.sender_id]);
        await indexEmail(toDoc(u, s.email));
      }
    }
  });
  worker.on('error', (e) => console.error('[worker]', e.message));
  return worker;
}
