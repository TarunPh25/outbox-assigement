import nodemailer, { Transporter } from 'nodemailer';
import { pool } from '../db';
import { config } from '../config';

export interface Sender {
  id: number; email: string; smtp_user: string; smtp_pass: string; host: string; port: number; secure: boolean;
}

const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));

async function insertSender(user: string, pass: string, host: string, port: number, secure: boolean) {
  const { rows: [s] } = await pool.query<Sender>(
    `INSERT INTO senders (email, smtp_user, smtp_pass, host, port, secure) VALUES ($1,$2,$3,$4,$5,$6)
     ON CONFLICT (email) DO UPDATE SET smtp_pass = EXCLUDED.smtp_pass, host = EXCLUDED.host, port = EXCLUDED.port, secure = EXCLUDED.secure RETURNING *`,
    [user, user, pass, host, port, secure]);
  return s;
}

/**
 * Make sure Ethereal (fake SMTP) senders exist. Never throws: if the Ethereal API is unreachable
 * the server still starts, and this is retried the next time someone schedules emails.
 *
 * Offline/manual option: set ETHEREAL_ACCOUNTS="user1:pass1,user2:pass2" in .env
 * (create accounts at https://ethereal.email/create).
 */
export async function ensureSenders(): Promise<Sender[]> {
  // 1) manual accounts from env
  for (const pair of (process.env.ETHEREAL_ACCOUNTS ?? '').split(',').map((s) => s.trim()).filter(Boolean)) {
    const [user, pass] = pair.split(':');
    if (user && pass) {
      const port = Number(process.env.ETHEREAL_SMTP_PORT ?? 587);
      await insertSender(user, pass, process.env.ETHEREAL_SMTP_HOST ?? 'smtp.ethereal.email', port, port === 465);
    }
  }

  // 2) auto-create the rest via the Ethereal API (with retries)
  let { rows } = await pool.query<Sender>('SELECT * FROM senders ORDER BY id');
  while (rows.length < config.senderCount) {
    let created = false;
    for (let attempt = 1; attempt <= 3 && !created; attempt++) {
      try {
        const acc = await nodemailer.createTestAccount();
        rows.push(await insertSender(acc.user, acc.pass, acc.smtp.host, acc.smtp.port, acc.smtp.secure));
        console.log(`[mailer] created Ethereal sender ${acc.user}`);
        created = true;
      } catch (e) {
        console.warn(`[mailer] Ethereal API attempt ${attempt}/3 failed: ${(e as Error).message}`);
        await sleep(1500 * attempt);
      }
    }
    if (!created) {
      console.warn('[mailer] Could not create more senders. Using what exists; set ETHEREAL_ACCOUNTS in .env to add some manually.');
      break;
    }
  }
  return rows;
}

const transporters = new Map<number, Transporter>();
export function transporterFor(s: Sender): Transporter {
  let t = transporters.get(s.id);
  if (!t) {
    t = nodemailer.createTransport({
      host: s.host, port: s.port, secure: s.secure, auth: { user: s.smtp_user, pass: s.smtp_pass },
      connectionTimeout: 15_000, greetingTimeout: 15_000, socketTimeout: 30_000,
    });
    transporters.set(s.id, t);
  }
  return t;
}
