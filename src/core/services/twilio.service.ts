import config from '@/config';
import { ApiError } from '@/core/errors/ApiError';
import { twilioClient } from '@/infrastructure/http/twilio.client';
import logger from '@/infrastructure/logging/logger';

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
  // Aquí puedes procesar el payload del webhook de Twilio
  // y, por ejemplo, enviar un email con la información recibida.
};
