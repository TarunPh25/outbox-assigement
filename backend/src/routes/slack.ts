import { Router } from 'express';
import { config } from '../config';
import { pool } from '../db';
import { AuthedRequest, requireAuth } from '../auth';
import { authorizeUrl, completeOAuth, disconnect } from '../services/slack';

const router = Router();

router.get('/status', requireAuth, async (req: AuthedRequest, res) => {
  const { rows: [u] } = await pool.query('SELECT slack_webhook_url, slack_channel FROM users WHERE id=$1', [req.userId]);
  res.json({ connected: !!u.slack_webhook_url, channel: u.slack_channel });
});

router.get('/connect', requireAuth, (req: AuthedRequest, res) => {
  if (!config.slack.clientId) return res.status(500).json({ error: 'Slack is not configured' });
  res.redirect(authorizeUrl(req.userId!));
});

// Slack redirects the browser here; identity comes from the signed `state`, not the cookie.
router.get('/callback', async (req, res) => {
  try {
    await completeOAuth(String(req.query.code), String(req.query.state));
    res.redirect(`${config.frontendUrl}/dashboard?slack=connected`);
  } catch (e) {
    console.error('[slack]', (e as Error).message);
    res.redirect(`${config.frontendUrl}/dashboard?slack=error`);
  }
});

router.post('/disconnect', requireAuth, async (req: AuthedRequest, res) => {
  await disconnect(req.userId!); res.json({ ok: true });
});

export default router;
