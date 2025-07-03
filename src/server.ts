import 'dotenv/config';

import express from 'express';
import helmet from 'helmet';
import { pinoHttp } from 'pino-http';

import { globalErrorHandler } from '@/api/middlewares/error.middleware';
import { ipWhitelistMiddleware } from '@/api/middlewares/ipWhitelist.middleware';
import { metricsMiddleware } from '@/api/middlewares/metrics.middleware';
import mainRouter from '@/api/routes';
import config from '@/config';
import logger from '@/infrastructure/logging/logger';
import { register } from '@/infrastructure/monitoring/metrics';

const app = express();

app.set('trust proxy', 1);

app.use(express.json());
app.use(helmet());
app.use(pinoHttp({ logger }));

app.use(ipWhitelistMiddleware);
app.use(metricsMiddleware);

app.get('/metrics', async (_req, res) => {
  try {
    res.set('Content-Type', register.contentType);
    res.end(await register.metrics());
  } catch (err) {
    res.status(500).end(err);
  }
});

app.use('/api/v1', mainRouter);

app.get('/health', (_req, res) => {
  res.status(200).json({ status: 'ok', timestamp: new Date().toISOString() });
});

app.use(globalErrorHandler);

app.listen(config.port, () => {
  logger.info(`Server running on http://localhost:${config.port}`);
});
