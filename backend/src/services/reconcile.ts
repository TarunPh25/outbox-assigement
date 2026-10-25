import { pool } from '../db';
import { emailQueue, enqueueEmail } from '../queue';

/**
 * Crash recovery. Redis persists delayed jobs itself (run Redis with AOF), so normally this finds nothing.
 * It covers the gap "row committed in Postgres but job never reached Redis" and Redis data loss.
 * Re-adding is safe: jobId === emailId, so BullMQ ignores ids that already exist.
 */
export async function reconcile() {
  const { rows } = await pool.query(
    `SELECT id, scheduled_at FROM emails WHERE status IN ('scheduled','processing')`);
  let restored = 0;
  for (const r of rows) {
    if (!(await emailQueue.getJob(r.id))) { await enqueueEmail(r.id, new Date(r.scheduled_at)); restored++; }
  }
  console.log(`[reconcile] checked ${rows.length} pending emails, re-enqueued ${restored}`);
}
