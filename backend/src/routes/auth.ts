import { Router } from 'express';
import { OAuth2Client } from 'google-auth-library';
import { randomUUID } from 'crypto';
import { config } from '../config';
import { pool } from '../db';
import { AuthedRequest, requireAuth, signSession } from '../auth';

const router = Router();
const google = new OAuth2Client(config.google.clientId, config.google.clientSecret, config.google.redirectUri);

router.get('/google', (req, res) => {
  const state = randomUUID();
  res.cookie('oauth_state', state, { httpOnly: true, sameSite: 'lax', maxAge: 10 * 60_000 });
  res.redirect(google.generateAuthUrl({ scope: ['openid', 'email', 'profile'], state, prompt: 'select_account' }));
});

router.get('/google/callback', async (req, res) => {
  try {
    if (!req.query.code || req.query.state !== req.cookies.oauth_state) throw new Error('bad state');
    const { tokens } = await google.getToken(String(req.query.code));
    const ticket = await google.verifyIdToken({ idToken: tokens.id_token!, audience: config.google.clientId });
    const p = ticket.getPayload()!;
    const { rows: [user] } = await pool.query(
      `INSERT INTO users (id, google_id, email, name, avatar) VALUES ($1,$2,$3,$4,$5)
       ON CONFLICT (google_id) DO UPDATE SET email=EXCLUDED.email, name=EXCLUDED.name, avatar=EXCLUDED.avatar
       RETURNING id`, [randomUUID(), p.sub, p.email, p.name ?? p.email, p.picture ?? null]);
    res.cookie('token', signSession(user.id), { httpOnly: true, sameSite: 'lax', maxAge: 7 * 86400_000 });
    res.redirect(`${config.frontendUrl}/dashboard`);
  } catch (e) {
    console.error('[auth]', (e as Error).message);
    res.redirect(`${config.frontendUrl}/?error=login_failed`);
  }
});

router.get('/demo', async (_req, res) => {
  try {
    const demoGoogleId = 'demo-user-google-id-001';
    let { rows: [user] } = await pool.query('SELECT id FROM users WHERE google_id=$1', [demoGoogleId]);
    if (!user) {
      const { rows } = await pool.query(
        `INSERT INTO users (id, google_id, email, name, avatar)
         VALUES ($1, $2, $3, $4, $5)
         RETURNING id`,
        [randomUUID(), demoGoogleId, 'vansh.arora@reachinbox.ai', 'Vansh Arora', null]
      );
      user = rows[0];
    } else {
      await pool.query('UPDATE users SET name=$1, email=$2 WHERE id=$3', ['Vansh Arora', 'vansh.arora@reachinbox.ai', user.id]);
    }
    res.cookie('token', signSession(user.id), { httpOnly: true, sameSite: 'lax', maxAge: 7 * 86400_000 });
    res.redirect(`${config.frontendUrl}/dashboard`);
  } catch (e) {
    console.error('[auth demo]', (e as Error).message);
    res.redirect(`${config.frontendUrl}/?error=demo_failed`);
  }
});

router.get('/me', requireAuth, async (req: AuthedRequest, res) => {
  const { rows: [u] } = await pool.query('SELECT id, name, email, avatar FROM users WHERE id=$1', [req.userId]);
  res.json(u);
});

router.post('/logout', (_req, res) => { res.clearCookie('token'); res.json({ ok: true }); });

export default router;
