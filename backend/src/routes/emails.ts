import { Router } from 'express';
import { randomUUID } from 'crypto';
import { z } from 'zod';
import { pool } from '../db';
import { AuthedRequest, requireAuth } from '../auth';
import { enqueueEmail } from '../queue';
import { ensureSenders } from '../services/mailer';
import { bulkIndex, searchEmails } from '../services/search';
import { stripHtml } from '../util';

const router = Router();
router.use(requireAuth);

const scheduleSchema = z.object({
  subject: z.string().min(1).max(300),
  body: z.string().min(1),
  leads: z.array(z.string().email()).min(1).max(50_000),
  startTime: z.string().datetime(),
  delaySeconds: z.number().min(0).max(86_400).default(0),
  hourlyLimit: z.number().int().min(1).max(100_000).optional(),
});

router.post('/schedule', async (req: AuthedRequest, res) => {
  const parsed = scheduleSchema.safeParse(req.body);
  if (!parsed.success) return res.status(400).json({ error: parsed.error.issues[0].message });
  const { subject, body, startTime, delaySeconds, hourlyLimit } = parsed.data;
  const leads = [...new Set(parsed.data.leads.map((l) => l.toLowerCase()))];

  const senders = await ensureSenders();
  if (!senders.length) return res.status(503).json({ error: 'No sender accounts available. Check your internet connection or set ETHEREAL_ACCOUNTS in .env.' });
  const start = new Date(startTime).getTime();
  const rows = leads.map((to, i) => ({
    id: randomUUID(), to, sender: senders[i % senders.length], // round-robin across senders
    at: new Date(start + i * delaySeconds * 1000),
  }));

  // 1) persist (source of truth)  2) enqueue delayed jobs. If step 2 dies, boot-time reconcile re-enqueues.
  const client = await pool.connect();
  try {
    await client.query('BEGIN');
    for (const r of rows) {
      await client.query(
        `INSERT INTO emails (id,user_id,to_email,subject,body,sender_id,scheduled_at,hourly_limit)
         VALUES ($1,$2,$3,$4,$5,$6,$7,$8)`,
        [r.id, req.userId, r.to, subject, body, r.sender.id, r.at, hourlyLimit ?? null]);
    }
    await client.query('COMMIT');
  } catch (e) {
    await client.query('ROLLBACK'); throw e;
  } finally { client.release(); }

  await Promise.all(rows.map((r) => enqueueEmail(r.id, r.at)));
  await bulkIndex(rows.map((r) => ({
    id: r.id, userId: req.userId!, to: r.to, subject, body: stripHtml(body), status: 'scheduled',
    sender: r.sender.email, scheduledAt: r.at.toISOString(), sentAt: null,
  })));
  res.status(201).json({ scheduled: rows.length, duplicatesRemoved: parsed.data.leads.length - rows.length });
});

const listQuery = (statuses: string[], orderCol: string) => async (req: AuthedRequest, res: any) => {
  const { rows } = await pool.query(
    `SELECT e.id, e.to_email AS "to", e.subject, left(regexp_replace(regexp_replace(e.body, '<[^>]*>', ' ', 'g'), '&nbsp;|\\s+', ' ', 'g'), 160) AS preview, e.status, e.scheduled_at AS "scheduledAt",
            e.sent_at AS "sentAt", e.preview_url AS "previewUrl", e.error, s.email AS sender
     FROM emails e JOIN senders s ON s.id = e.sender_id
     WHERE e.user_id=$1 AND e.status = ANY($2) ORDER BY ${orderCol} LIMIT 500`, [req.userId, statuses]);
  res.json(rows);
};
router.get('/counts', async (req: AuthedRequest, res) => {
  const { rows: [c] } = await pool.query(
    `SELECT count(*) FILTER (WHERE status IN ('scheduled','processing'))::int AS scheduled,
            count(*) FILTER (WHERE status IN ('sent','failed'))::int AS sent
     FROM emails WHERE user_id=$1`, [req.userId]);
  res.json(c);
});
router.get('/scheduled', listQuery(['scheduled', 'processing'], 'e.scheduled_at ASC'));
router.get('/sent', listQuery(['sent', 'failed'], 'COALESCE(e.sent_at, e.scheduled_at) DESC'));

router.get('/search', async (req: AuthedRequest, res) => {
  try {
    const q = String(req.query.q ?? '').trim();
    const tab = String(req.query.tab ?? '');
    const statuses = tab === 'scheduled' ? ['scheduled', 'processing'] : tab === 'sent' ? ['sent', 'failed'] : ['scheduled', 'processing', 'sent', 'failed'];
    const ids = await searchEmails(req.userId!, q); // Elasticsearch ranks, Postgres is the source of truth
    if (!ids.length) return res.json([]);
    const { rows } = await pool.query(
      `SELECT e.id, e.to_email AS "to", e.subject, left(regexp_replace(regexp_replace(e.body, '<[^>]*>', ' ', 'g'), '&nbsp;|\\s+', ' ', 'g'), 160) AS preview, e.status, e.scheduled_at AS "scheduledAt",
              e.sent_at AS "sentAt", e.preview_url AS "previewUrl", e.error, s.email AS sender
       FROM emails e JOIN senders s ON s.id = e.sender_id
       WHERE e.user_id=$1 AND e.id = ANY($2::uuid[]) AND e.status = ANY($3)`, [req.userId, ids, statuses]);
    const order = new Map(ids.map((id, i) => [id, i]));
    rows.sort((a, b) => (order.get(a.id) ?? 0) - (order.get(b.id) ?? 0));
    res.json(rows);
  } catch (e) { res.status(503).json({ error: 'Search unavailable' }); }
});

export default router;
