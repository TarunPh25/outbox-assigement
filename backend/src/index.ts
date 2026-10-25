import express from 'express';
import cors from 'cors';
import cookieParser from 'cookie-parser';
import { createBullBoard } from '@bull-board/api';
import { BullMQAdapter } from '@bull-board/api/bullMQAdapter';
import { ExpressAdapter } from '@bull-board/express';
import { config } from './config';
import { migrate } from './db';
import { requireAuth } from './auth';
import { emailQueue } from './queue';
import { startWorker } from './worker';
import { ensureSenders } from './services/mailer';
import { initSearch } from './services/search';
import { reconcile } from './services/reconcile';
import authRoutes from './routes/auth';
import emailRoutes from './routes/emails';
import slackRoutes from './routes/slack';

async function main() {
  await migrate();
  await initSearch();
  await ensureSenders();

  const app = express();
  app.use(cors({ origin: config.frontendUrl, credentials: true }));
  app.use(express.json({ limit: '10mb' }));
  app.use(cookieParser());

  // Live queue dashboard (login required): http://localhost:4000/admin/queues
  const board = new ExpressAdapter();
  board.setBasePath('/admin/queues');
  createBullBoard({ queues: [new BullMQAdapter(emailQueue) as any], serverAdapter: board });
  app.use('/admin/queues', requireAuth, board.getRouter());

  app.get('/health', (_req, res) => res.json({ ok: true }));
  app.use('/api/auth', authRoutes);
  app.use('/api/emails', emailRoutes);
  app.use('/api/slack', slackRoutes);

  app.use((err: Error, _req: express.Request, res: express.Response, _next: express.NextFunction) => {
    console.error(err); res.status(500).json({ error: 'Internal server error' });
  });

  await reconcile();
  const worker = startWorker();
  const server = app.listen(config.port, () => console.log(`API on :${config.port}  |  queue UI /admin/queues`));

  const shutdown = async () => {
    server.close(); await worker.close(); // lets in-flight jobs finish; unfinished ones are re-claimed later
    process.exit(0);
  };
  process.on('SIGINT', shutdown); process.on('SIGTERM', shutdown);
}

main().catch((e) => { console.error(e); process.exit(1); });
