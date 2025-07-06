import { whatsappFlowResponseSchema } from '@/api/validators/webhook.validator';
import config from '@/config';
import { TEMPLATE_NAMES, WHATSAPP_MESSAGE_TYPES } from '@/config/constants';
import { ApiError } from '@/core/errors/ApiError';
import { WhatsappWebhookPayload } from '@/core/types/whatsapp.types';
import { httpClient } from '@/infrastructure/http/httpClient';
import logger from '@/infrastructure/logging/logger';
import {
  apiErrorsTotal,
  whatsappFlowsCompleted,
  whatsappFlowsProcessingErrors,
  whatsappInvalidPayloadsTotal,
  whatsappTemplateSended,
} from '@/infrastructure/monitoring/metrics';

import { sendEnrichedEmail } from './email.service';

const MESSAGES_ENDPOINT = `/${config.whatsapp.phoneNumberId}/messages`;

const _buildTemplateMessagePayload = (customerPhone: string) => {
  return {
    messaging_product: 'whatsapp',
    to: customerPhone,
    type: WHATSAPP_MESSAGE_TYPES.TEMPLATE,
    template: {
      name: TEMPLATE_NAMES.SURVEY_INVITE,
      language: {
        code: 'es_AR',
      },
    },
  };
};

export const triggerSurveyTemplate = async (customerPhone: string): Promise<void> => {
  logger.info(`Sending WhatsApp Template to ${customerPhone}`);

  const payload = _buildTemplateMessagePayload(customerPhone);

  try {
    await httpClient.post(MESSAGES_ENDPOINT, payload);
    whatsappTemplateSended.inc();
    logger.info(`Template sent successfully to ${customerPhone}`);
  } catch (error) {
    apiErrorsTotal.inc({ service: 'whatsapp' });
    throw new ApiError('WhatsApp', error);
  }
};

export const handleIncomingWhatsappMessage = (payload: WhatsappWebhookPayload): void => {
  try {
    const validationResult = whatsappFlowResponseSchema.safeParse(payload);

    if (!validationResult.success) {
      logger.warn(
        { errors: validationResult.error.format() },
        'Invalid WhatsApp webhook payload received',
      );

      whatsappInvalidPayloadsTotal.inc();
      return;
    }

    const message = validationResult.data.entry[0].changes[0].value.messages[0];
    const customerPhone = message.from;
    const flowResponse = JSON.parse(message.interactive.nfm_reply.response_json);

    logger.info({ customerPhone, flowResponse }, 'Flow response received and validated');
    whatsappFlowsCompleted.inc();
    sendEnrichedEmail(customerPhone, flowResponse);
  } catch (error) {
    whatsappFlowsProcessingErrors.inc();
    logger.error(error, 'Error processing incoming WhatsApp message. Payload will be ignored.');
  }
};
