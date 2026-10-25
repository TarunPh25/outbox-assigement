import { Pool } from 'pg';
import { config } from './config';

export const pool = new Pool({ connectionString: config.databaseUrl });

export async function migrate() {
  await pool.query(`
    CREATE TABLE IF NOT EXISTS users (
      id UUID PRIMARY KEY,
      google_id TEXT UNIQUE NOT NULL,
      email TEXT NOT NULL,
      name TEXT NOT NULL,
      avatar TEXT,
      slack_webhook_url TEXT,
      slack_channel TEXT,
      created_at TIMESTAMPTZ NOT NULL DEFAULT now()
    );
    CREATE TABLE IF NOT EXISTS senders (
      id SERIAL PRIMARY KEY,
      email TEXT UNIQUE NOT NULL,
      smtp_user TEXT NOT NULL,
      smtp_pass TEXT NOT NULL,
      host TEXT NOT NULL,
      port INT NOT NULL,
      secure BOOLEAN NOT NULL DEFAULT false
    );
    CREATE TABLE IF NOT EXISTS emails (
      id UUID PRIMARY KEY,
      user_id UUID NOT NULL REFERENCES users(id),
      to_email TEXT NOT NULL,
      subject TEXT NOT NULL,
      body TEXT NOT NULL,
      sender_id INT NOT NULL REFERENCES senders(id),
      status TEXT NOT NULL DEFAULT 'scheduled',
      scheduled_at TIMESTAMPTZ NOT NULL,
      sent_at TIMESTAMPTZ,
      hourly_limit INT,
      attempts INT NOT NULL DEFAULT 0,
      claimed_at TIMESTAMPTZ,
      preview_url TEXT,
      error TEXT,
      created_at TIMESTAMPTZ NOT NULL DEFAULT now()
    );
    CREATE INDEX IF NOT EXISTS emails_user_status_idx ON emails (user_id, status, scheduled_at);
  `);
}
