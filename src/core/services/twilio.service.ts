import config from '@/config';
import { ApiError } from '@/core/errors/ApiError';
import { twilioClient } from '@/infrastructure/http/twilio.client';
import logger from '@/infrastructure/logging/logger';
import { z } from 'zod';

export const sendTwilioMessage = async (to: string, body: string): Promise<void> => {
  logger.info(`Sending WhatsApp message to ${to} via Twilio`);

  try {
    await twilioClient.messages.create({
      from: config.twilio.phoneNumber,
      to: `whatsapp:${to}`,
      body,
    });
    logger.info(`Message sent successfully to ${to} via Twilio`);
  } catch (error) {
    throw new ApiError('Twilio', error);
  }
};

export const handleTwilioWebhook = (payload: unknown): void => {
  logger.info('Twilio webhook event received');
  // Validate the Twilio webhook payload using Zod
  if (!payload || typeof payload !== 'object') {
    logger.warn('Twilio webhook payload is not an object');
    throw new ApiError('Twilio', 'Webhook payload must be an object');
  }

  const twilioWebhookSchema = z.object({
    SmsMessageSid: z.string(),
    NumMedia: z.string(),
    SmsSid: z.string(),
    SmsStatus: z.string(),
    Body: z.string(),
    To: z.string(),
    NumSegments: z.string(),
    MessageSid: z.string(),
    AccountSid: z.string(),
    From: z.string(),
    ApiVersion: z.string(),
    // Add more fields as needed based on your use case
  });

  const result = twilioWebhookSchema.safeParse(payload);

  if (!result.success) {
    logger.warn('Invalid Twilio webhook payload received', { errors: result.error.errors });
    throw new ApiError('Twilio', 'Invalid webhook payload');
  }

  const validPayload = result.data;

  // Process the validated payload
  // For example, trigger business logic based on its content.
  logger.info('Processing Twilio webhook payload', { validPayload });
};
