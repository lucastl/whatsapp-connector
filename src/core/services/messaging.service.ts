import {
  twilioWebhookSchema,
  whatsappFlowResponseSchema,
} from '@/api/validators/webhook.validator';
import config from '@/config';
import { MESSAGING_TYPES, META_TEMPLATE_NAME } from '@/config/constants';
import { ApiError } from '@/core/errors/ApiError';
import { AppError } from '@/core/errors/AppError';
import { MetaWebhookPayload, SurveyResponse } from '@/core/types/messaging.types';
import logger from '@/infrastructure/logging/logger';
import {
  apiErrorsTotal,
  messagingFlowsCompleted,
  messagingFlowsProcessingErrors,
  messagingInvalidPayloadsTotal,
  messagingTemplatesSentTotal,
} from '@/infrastructure/monitoring/metrics';
import { whatsappHttpClient } from '@/infrastructure/providers/meta/whatsapp.httpClient';
import { twilioClient } from '@/infrastructure/providers/twilio/twilio.client';

import { sendEnrichedEmail } from './email.service';

const META_MESSAGES_ENDPOINT = `/${config.whatsapp.phoneNumberId}/messages`;

const _sendWithMeta = async (customerPhone: string) => {
  const payload = {
    messaging_product: 'whatsapp',
    to: customerPhone,
    type: MESSAGING_TYPES.TEMPLATE,
    template: {
      name: META_TEMPLATE_NAME,
      language: { code: 'es_AR' },
    },
  };
  logger.info({ payload }, `Sending template via Meta to ${customerPhone}`);
  await whatsappHttpClient.post(META_MESSAGES_ENDPOINT, payload);
};

const _sendWithTwilio = async (customerPhone: string) => {
  if (!twilioClient || !config.twilio.whatsappNumber) {
    throw new AppError('Twilio client is not configured correctly.', 500);
  }
  const payload = {
    contentSid: config.twilio.templateSid,
    from: config.twilio.whatsappNumber,
    to: `whatsapp:${customerPhone}`,
  };
  logger.info({ payload }, `Sending template via Twilio to ${customerPhone}`);
  await twilioClient.messages.create(payload);
};

export const triggerSurveyTemplate = async (customerPhone: string): Promise<void> => {
  const provider = config.messagingProvider;
  logger.info(`Sending survey template to ${customerPhone} using provider: ${provider}`);

  try {
    if (provider === 'twilio') {
      await _sendWithTwilio(customerPhone);
    } else {
      await _sendWithMeta(customerPhone);
    }
    messagingTemplatesSentTotal.inc({ provider });
    logger.info(`Template sent successfully to ${customerPhone} via ${provider}`);
  } catch (error) {
    const serviceName = provider === 'twilio' ? 'Twilio' : 'Meta';
    apiErrorsTotal.inc({ service: serviceName.toLowerCase() });
    throw new ApiError(serviceName, error);
  }
};

export const handleIncomingMetaMessage = (payload: MetaWebhookPayload): void => {
  try {
    const validationResult = whatsappFlowResponseSchema.safeParse(payload);
    if (!validationResult.success) {
      logger.warn(
        { errors: validationResult.error.format() },
        'Invalid Meta webhook payload received',
      );
      messagingInvalidPayloadsTotal.inc({ provider: 'meta' });
      return;
    }
    const message = validationResult.data.entry[0].changes[0].value.messages[0];
    const customerPhone = message.from;
    const flowResponse = JSON.parse(message.interactive.nfm_reply.response_json);

    logger.info({ customerPhone, flowResponse }, 'Flow response received and validated');
    messagingFlowsCompleted.inc({ provider: 'meta' });
    sendEnrichedEmail(customerPhone, flowResponse);
  } catch (error) {
    messagingFlowsProcessingErrors.inc({ provider: 'meta' });
    logger.error(error, 'Error processing incoming Meta message. Payload will be ignored.');
  }
};

const _parseTwilioBody = (body: string): SurveyResponse => {
  const response: Record<string, string> = {};
  const lines = body.split('\n');
  lines.forEach((line) => {
    const parts = line.split(':');
    if (parts.length === 2) {
      const key = parts[0].trim().toLowerCase().replace(/ /g, '_');
      const value = parts[1].trim();
      response[key] = value;
    }
  });
  return {
    product_interest: response.product_interest || '',
    best_time_to_call: response.best_time_to_call || '',
    ...response,
  };
};

export const handleIncomingTwilioMessage = (payload: unknown): void => {
  const validationResult = twilioWebhookSchema.safeParse(payload);

  if (!validationResult.success) {
    logger.warn(
      { errors: validationResult.error.format() },
      'Invalid Twilio webhook payload received',
    );
    messagingInvalidPayloadsTotal.inc({ provider: 'twilio' });
    return;
  }

  const { From: customerPhoneWithPrefix, Body } = validationResult.data;
  const customerPhone = customerPhoneWithPrefix.replace('whatsapp:', '');

  try {
    const flowResponse = _parseTwilioBody(Body);
    logger.info({ customerPhone, flowResponse }, 'Twilio response received and parsed');

    messagingFlowsCompleted.inc({ provider: 'twilio' });
    sendEnrichedEmail(customerPhone, flowResponse);
  } catch (error) {
    messagingFlowsProcessingErrors.inc({ provider: 'twilio' });
    logger.error(error, 'Error processing incoming Twilio message.');
  }
};
