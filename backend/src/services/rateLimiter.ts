import { redis } from '../redis';

const HOUR = 3600_000;

/**
 * Atomic fixed-window counter shared by every worker/instance (lives in Redis).
 * Key: rl:{senderId}:{hourWindowStart}. The check-and-increment is one Lua script so two
 * workers can never both take the last slot.
 */
const LUA = `
local c = redis.call('INCR', KEYS[1])
if c == 1 then redis.call('PEXPIRE', KEYS[1], 2 * 3600 * 1000) end
if c > tonumber(ARGV[1]) then
  redis.call('DECR', KEYS[1])
  return 0
end
return 1
`;

export const windowStart = (now = Date.now()) => Math.floor(now / HOUR) * HOUR;

export async function tryConsume(senderId: number, limit: number) {
  const ws = windowStart();
  const ok = (await redis.eval(LUA, 1, `rl:${senderId}:${ws}`, String(limit))) === 1;
  return { allowed: ok, nextWindow: ws + HOUR, windowStart: ws };
}

/** True only for the FIRST limit-hit of a sender in a window, so Slack gets one message, not hundreds. */
export async function markLimitNotified(senderId: number, ws: number) {
  return (await redis.set(`rl:notified:${senderId}:${ws}`, '1', 'PX', 2 * HOUR, 'NX')) === 'OK';
}
