import {
  twilioStatusCallbackSchema,
  twilioWebhookSchema,
  whatsappFlowResponseSchema,
} from '@/api/validators/webhook.validator';
import config from '@/config';
import { MESSAGING_TYPES, META_TEMPLATE_NAME } from '@/config/constants';
import { ApiError } from '@/core/errors/ApiError';
import { AppError } from '@/core/errors/AppError';
import { MetaWebhookPayload } from '@/core/types/messaging.types';
import logger from '@/infrastructure/logging/logger';
import {
  apiErrorsTotal,
  messagingFlowsCompleted,
  messagingFlowsProcessingErrors,
  messagingInvalidPayloadsTotal,
  messagingStatusUpdatesTotal,
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

export const handleTwilioStatusUpdate = (payload: unknown): void => {
  const validationResult = twilioStatusCallbackSchema.safeParse(payload);

  if (!validationResult.success) {
    logger.warn(
      { errors: validationResult.error.format() },
      'Invalid Twilio status callback received',
    );
    // Opcional: podrías tener una métrica separada para validaciones de status fallidas
    return;
  }

  const { MessageSid, MessageStatus, ErrorCode, ErrorMessage } = validationResult.data;

  messagingStatusUpdatesTotal.inc({ provider: 'twilio', status: MessageStatus });

  if (MessageStatus === 'failed' || MessageStatus === 'undelivered') {
    logger.error({ MessageSid, ErrorCode, ErrorMessage }, 'Message delivery failed');
  } else {
    logger.info(
      { MessageSid, status: MessageStatus },
      'Received message status update from Twilio',
    );
  }
};

export const handleIncomingTwilioSurvey = async (payload: unknown): Promise<void> => {
  const validationResult = twilioWebhookSchema.safeParse(payload);

  if (!validationResult.success) {
    logger.warn(
      { errors: validationResult.error.format() },
      'Invalid Twilio Studio webhook payload received',
    );
    messagingInvalidPayloadsTotal.inc({ provider: 'twilio_studio' });
    return;
  }

  const { customerPhone: phoneWithPrefix, surveyResponse } = validationResult.data;
  const customerPhone = phoneWithPrefix.replace('whatsapp:', '');

  try {
    logger.info({ customerPhone, surveyResponse }, 'Twilio Studio response received and validated');

    messagingFlowsCompleted.inc({ provider: 'twilio' });
    await sendEnrichedEmail(customerPhone, surveyResponse);
  } catch (error) {
    messagingFlowsProcessingErrors.inc({ provider: 'twilio' });
    logger.error(error, 'Error processing incoming Twilio Studio message.');
  }
};
