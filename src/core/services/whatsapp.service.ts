import { whatsappFlowResponseSchema } from '@/api/validators/webhook.validator';
import config from '@/config';
import { FLOW_NAMES, WHATSAPP_INTERACTIVE_TYPES, WHATSAPP_MESSAGE_TYPES } from '@/config/constants';
import { ApiError } from '@/core/errors/ApiError';
import { WhatsappWebhookPayload } from '@/core/types/whatsapp.types';
import { httpClient } from '@/infrastructure/http/httpClient';
import logger from '@/infrastructure/logging/logger';
import {
  apiErrorsTotal,
  whatsappFlowsCompleted,
  whatsappFlowsInitiated,
  whatsappFlowsProcessingErrors,
  whatsappInvalidPayloadsTotal,
} from '@/infrastructure/monitoring/metrics';

import { sendEnrichedEmail } from './email.service';

const MESSAGES_ENDPOINT = `/${config.whatsapp.phoneNumberId}/messages`;

const _buildFlowPayload = (customerPhone: string) => {
  return {
    messaging_product: 'whatsapp',
    to: customerPhone,
    type: WHATSAPP_MESSAGE_TYPES.INTERACTIVE,
    interactive: {
      type: WHATSAPP_INTERACTIVE_TYPES.FLOW,
      header: { type: 'text', text: 'Encuesta Rápida de Interés' },
      body: { text: 'Por favor, tómate un minuto para completar nuestra encuesta.' },
      footer: { text: 'Haz clic en el botón para comenzar 👇' },
      action: {
        name: FLOW_NAMES.SURVEY,
        parameters: {}, // Aquí se podrían pasar parámetros al Flow si fuera necesario
      },
    },
  };
};

export const triggerWhatsappFlow = async (customerPhone: string): Promise<void> => {
  logger.info(`Sending WhatsApp Flow to ${customerPhone}`);

  const payload = _buildFlowPayload(customerPhone);

  try {
    await httpClient.post(MESSAGES_ENDPOINT, payload);
    whatsappFlowsInitiated.inc();
    logger.info(`Flow sent successfully to ${customerPhone}`);
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
