import { Request, Response } from 'express';

import { asyncHandler } from '@/api/utils/asyncHandler';
import { asterVoipTriggerSchema } from '@/api/validators/webhook.validator';
import config from '@/config';
import { AppError } from '@/core/errors/AppError';
import {
  handleIncomingWhatsappMessage,
  triggerSurveyTemplate,
} from '@/core/services/whatsapp.service';
import { astervoipTriggersTotal } from '@/infrastructure/monitoring/metrics';

export const handleAsterVoipTrigger = asyncHandler(async (req, res) => {
  req.log.info(`AsterVOIP trigger received from: ${req.ip}`);

  const validationResult = asterVoipTriggerSchema.safeParse(req.body);
  if (!validationResult.success) {
    astervoipTriggersTotal.inc({ status: 'validation_error' });
    throw new AppError('The request body contains invalid data.', 400, {
      error: validationResult.error.format(),
      body: req.body,
    });
  }

  astervoipTriggersTotal.inc({ status: 'success' });

  const { customerPhone } = validationResult.data;
  await triggerSurveyTemplate(customerPhone);

  req.log.info(`WhatsApp Template trigger initiated for customer: ${customerPhone}`);

  res.status(202).json({ message: 'Accepted: WhatsApp Template trigger initiated.' });
});

export const handleWhatsappWebhook = (req: Request, res: Response): void => {
  req.log.info('WhatsApp webhook event received');
  handleIncomingWhatsappMessage(req.body);
  res.sendStatus(200);
};

export const verifyWhatsappWebhook = (req: Request, res: Response): void => {
  const mode = req.query['hub.mode'];
  const token = req.query['hub.verify_token'];
  const challenge = req.query['hub.challenge'];

  if (mode && token && mode === 'subscribe' && token === config.whatsapp.verifyToken) {
    req.log.info('WhatsApp webhook verified successfully!');
    res.status(200).send(challenge);
  } else {
    req.log.error('Failed to verify WhatsApp webhook.');
    res.sendStatus(403);
  }
};
