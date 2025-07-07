import { Request, Response } from 'express';

import { asyncHandler } from '@/api/utils/asyncHandler';
import {
  asterVoipTriggerSchema,
  metaWebhookVerificationSchema,
} from '@/api/validators/webhook.validator';
import config from '@/config';
import { AppError } from '@/core/errors/AppError';
import {
  handleIncomingMetaMessage,
  handleIncomingTwilioMessage,
  triggerSurveyTemplate,
} from '@/core/services/messaging.service';
import {
  astervoipTriggersTotal,
  messagingWebhookReceivedTotal,
} from '@/infrastructure/monitoring/metrics';

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

  messagingWebhookReceivedTotal.inc({ provider: 'meta' });

  handleIncomingMetaMessage(req.body);
  res.sendStatus(200);
};

export const verifyMetaWebhook = (req: Request, res: Response): void => {
  const validationResult = metaWebhookVerificationSchema.safeParse(req.query);

  if (
    validationResult.success &&
    validationResult.data['hub.mode'] === 'subscribe' &&
    validationResult.data['hub.verify_token'] === config.whatsapp.verifyToken
  ) {
    req.log.info('Meta webhook verified successfully!');
    res.status(200).send(validationResult.data['hub.challenge']);
  } else {
    req.log.error('Failed to verify Meta webhook.');
    res.sendStatus(403);
  }
};

export const handleTwilioWebhook = (req: Request, res: Response): void => {
  req.log.info('Twilio webhook event received');
  messagingWebhookReceivedTotal.inc({ provider: 'twilio' });
  handleIncomingTwilioMessage(req.body);
  res.sendStatus(200);
};
