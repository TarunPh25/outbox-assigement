import jwt from 'jsonwebtoken';
import { config } from '../config';
import { pool } from '../db';

export function authorizeUrl(userId: string) {
  const state = jwt.sign({ userId }, config.jwtSecret, { expiresIn: '10m' });
  const p = new URLSearchParams({
    client_id: config.slack.clientId, scope: 'incoming-webhook',
    redirect_uri: config.slack.redirectUri, state,
  });
  return `https://slack.com/oauth/v2/authorize?${p}`;
}

/** Exchange ?code for an incoming-webhook URL and store it for the user. */
export async function completeOAuth(code: string, state: string) {
  const { userId } = jwt.verify(state, config.jwtSecret) as { userId: string };
  const res = await fetch('https://slack.com/api/oauth.v2.access', {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({
      code, client_id: config.slack.clientId, client_secret: config.slack.clientSecret,
      redirect_uri: config.slack.redirectUri,
    }),
  });
  const data: any = await res.json();
  if (!data.ok || !data.incoming_webhook?.url) throw new Error(`Slack OAuth failed: ${data.error ?? 'no webhook'}`);
  await pool.query('UPDATE users SET slack_webhook_url=$1, slack_channel=$2 WHERE id=$3',
    [data.incoming_webhook.url, data.incoming_webhook.channel, userId]);
}

export async function disconnect(userId: string) {
  await pool.query('UPDATE users SET slack_webhook_url=NULL, slack_channel=NULL WHERE id=$1', [userId]);
}

export async function hasSlack(userId: string) {
  const { rows: [u] } = await pool.query('SELECT slack_webhook_url FROM users WHERE id=$1', [userId]);
  return !!u?.slack_webhook_url;
}

/** Looks up the webhook at call time, so connecting later works without redeploy; no webhook => silently skip. */
export async function notifyRateLimit(userId: string, senderEmail: string, limit: number, resumeAt: number) {
  const { rows: [u] } = await pool.query('SELECT slack_webhook_url FROM users WHERE id=$1', [userId]);
  if (!u?.slack_webhook_url) { console.log('[slack] rate limit hit but Slack not connected, skipping'); return; }
  try {
    const res = await fetch(u.slack_webhook_url, {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        text: `:warning: *Hourly email limit reached* for sender \`${senderEmail}\` (${limit}/hour). ` +
          `Remaining emails are rescheduled to ${new Date(resumeAt).toISOString()}.`,
      }),
    });
    if (!res.ok) console.warn('[slack] webhook responded', res.status, await res.text());
    else console.log(`[slack] rate-limit alert sent for ${senderEmail}`);
  } catch (e) { console.warn('[slack] notify failed', (e as Error).message); }
}
