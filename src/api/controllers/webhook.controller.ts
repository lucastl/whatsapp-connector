import { NextFunction, Request, Response } from 'express';
import twilio from 'twilio';

import { asyncHandler } from '@/api/utils/asyncHandler';
import { asterVoipTriggerSchema } from '@/api/validators/webhook.validator';
import config from '@/config';
import { AppError } from '@/core/errors/AppError';
import { handleTwilioWebhook as handleTwilioWebhookService } from '@/core/services/twilio.service';
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

const twilioAuthToken = config.twilio.authToken;
if (!twilioAuthToken) {
  throw new Error('Twilio Auth Token is not set in the configuration.');
}

export const handleTwilioWebhook = [
  // Twilio signature validation middleware
  (req: Request, res: Response, next: NextFunction) => {
    const signature = req.headers['x-twilio-signature'] as string;
    // Ensure Express is configured with app.set('trust proxy', 1) in your main app file
    // This ensures req.protocol reflects the original protocol (e.g., 'https') behind a proxy.
    // In your main Express app (e.g., app.ts or server.ts), add:
    //    app.set('trust proxy', 1);
    // Example:
    //    import express from 'express';
    //    const app = express();
    //    app.set('trust proxy', 1);
    const url = `${req.protocol}://${req.get('host')}${req.originalUrl}`;
    const isValid = twilio.validateRequest(twilioAuthToken, signature, url, req.body);

    if (!isValid) {
      req.log.warn('Twilio webhook signature validation failed');
      res.status(403).json({ message: 'Invalid Twilio signature' });
      return;
    }
    next();
  },
  // Actual handler
  (req: Request, res: Response): void => {
    handleTwilioWebhookService(req.body);
    res.sendStatus(200);
  },
];
