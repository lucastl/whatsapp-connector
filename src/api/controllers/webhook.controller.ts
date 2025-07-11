import { Request, Response } from 'express';

import { asyncHandler } from '@/api/utils/asyncHandler';
import {
  asterVoipTriggerSchema,
  metaWebhookVerificationSchema,
} from '@/api/validators/webhook.validator';
import config from '@/config';
import { METRIC_STATUS, SERVICE_NAMES } from '@/config/constants';
import { AppError } from '@/core/errors/AppError';
import { createEmailService } from '@/core/services/email.service';
import { createMessagingService } from '@/core/services/messaging.service';
import { resendClient } from '@/infrastructure/email/resend.client';
import {
  astervoipTriggersTotal,
  messagingWebhookReceivedTotal,
} from '@/infrastructure/monitoring/metrics';
import { whatsappHttpClient } from '@/infrastructure/providers/meta/whatsapp.httpClient';
import { twilioClient } from '@/infrastructure/providers/twilio/twilio.client';

const emailService = createEmailService(resendClient);
const messagingService = createMessagingService(emailService, whatsappHttpClient, twilioClient);

export const handleAsterVoipTrigger = asyncHandler(async (req, res) => {
  req.log.info(`AsterVOIP trigger received from: ${req.ip}`);

  const validationResult = asterVoipTriggerSchema.safeParse(req.body);
  if (!validationResult.success) {
    astervoipTriggersTotal.inc({ status: METRIC_STATUS.VALIDATION_ERROR });
    throw new AppError('The request body contains invalid data.', 400, {
      error: validationResult.error.format(),
      body: req.body,
    });
  }

  astervoipTriggersTotal.inc({ status: METRIC_STATUS.SUCCESS });

  const { customerPhone } = validationResult.data;
  await messagingService.triggerSurveyTemplate(`+549${customerPhone}`);

  req.log.info(`WhatsApp Template trigger initiated for customer: +549${customerPhone}`);

  res.status(202).json({ message: 'Accepted: WhatsApp Template trigger initiated.' });
});

export const handleWhatsappWebhook = (req: Request, res: Response): void => {
  req.log.info('WhatsApp webhook event received');

  messagingWebhookReceivedTotal.inc({ provider: SERVICE_NAMES.META });

  messagingService.handleIncomingMetaMessage(req.body);
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

export const handleTwilioStatusWebhook = (req: Request, res: Response): void => {
  req.log.info('Twilio status callback received');
  messagingService.handleTwilioStatusUpdate(req.body);
  res.sendStatus(204);
};

export const handleTwilioSurveyWebhook = asyncHandler(async (req, res) => {
  req.log.info('Twilio Survey webhook received');
  messagingWebhookReceivedTotal.inc({ provider: SERVICE_NAMES.TWILIO });

  await messagingService.handleIncomingTwilioSurvey(req.body);

  res.sendStatus(204);
});
