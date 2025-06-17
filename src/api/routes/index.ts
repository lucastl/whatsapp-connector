import { Router } from 'express';
import webhookRouter from './webhook.routes';

const mainRouter = Router();

mainRouter.use('/webhooks', webhookRouter);

export default mainRouter;