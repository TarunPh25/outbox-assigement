import { Queue } from 'bullmq';
import { createRedis } from './redis';

export const QUEUE_NAME = 'email-send';
export interface EmailJobData { emailId: string }

export const emailQueue = new Queue<EmailJobData>(QUEUE_NAME, {
  connection: createRedis(),
  defaultJobOptions: {
    attempts: 3,
    backoff: { type: 'exponential', delay: 5000 },
    removeOnComplete: { age: 24 * 3600, count: 5000 },
    removeOnFail: false,
  },
});

/** jobId === emailId, so BullMQ refuses to enqueue the same email twice (idempotent enqueue). */
export const enqueueEmail = (emailId: string, runAt: Date) =>
  emailQueue.add('send', { emailId }, { jobId: emailId, delay: Math.max(0, runAt.getTime() - Date.now()) });
