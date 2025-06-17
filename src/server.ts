import express from 'express';
import helmet from 'helmet';
import { pinoHttp } from 'pino-http';

import { globalErrorHandler } from '@/api/middlewares/error.middleware';
import mainRouter from '@/api/routes';
import config from '@/config';
import logger from '@/infrastructure/logging/logger';

const app = express();

app.use(express.json());
app.use(helmet());
app.use(pinoHttp({ logger }));

app.use('/api/v1', mainRouter);

app.get('/health', (_req, res) => {
  res.status(200).json({ status: 'ok', timestamp: new Date().toISOString() });
});

app.use(globalErrorHandler);

app.listen(config.port, () => {
  logger.info(`Server running on http://localhost:${config.port}`);
});
