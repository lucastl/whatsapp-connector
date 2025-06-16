import express from 'express';
import helmet from 'helmet';
import { pinoHttp } from 'pino-http';
import config from './config';
import logger from './infrastructure/logging/logger';
import mainRouter from './api/routes';

const app = express();

app.use(express.json());
app.use(helmet());
app.use(pinoHttp({ logger }));

app.use('/api/v1', mainRouter);

app.get('/health', (_req, res) => {
  res.status(200).json({ status: 'ok', timestamp: new Date().toISOString() });
});

app.listen(config.port, () => {
  logger.info(`Server running on http://localhost:${config.port}`);
});