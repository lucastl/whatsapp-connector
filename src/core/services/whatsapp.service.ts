import axios from 'axios';
import config from '../../config';
import logger from '../../infrastructure/logging/logger';
import { sendEnrichedEmail } from './email.service';
import { ApiError } from '../errors/ApiError';
import { httpClient } from '../../infrastructure/http/httpClient';
import {
  FLOW_NAMES,
  WHATSAPP_INTERACTIVE_TYPES,
  WHATSAPP_MESSAGE_TYPES,
} from '../../config/constants';
import { WhatsappWebhookPayload } from '../types/whatsapp.types';
import { whatsappFlowResponseSchema } from '../../api/validators/webhook.validator';

const MESSAGES_ENDPOINT = `/${config.whatsapp.phoneNumberId}/messages`;

export const triggerWhatsappFlow = async (customerPhone: string): Promise<void> => {
  // TODO: We need to design the Flow JSON and replace this placeholder.
  const flowData = {
    // TODO: Define parameters to pass to the Flow here, if necessary.
    // Example: { "customer_name": "Lucas", "product_offer": "Fiber 1000" }
  };

  const payload = {
    messaging_product: 'whatsapp',
    to: customerPhone,
    type: WHATSAPP_MESSAGE_TYPES.INTERACTIVE,
    interactive: {
      type: WHATSAPP_INTERACTIVE_TYPES.FLOW,
      header: { type: 'text', text: 'Encuesta Rápida de Interés' },
      body: { text: 'Por favor, tómate un minuto para completar nuestra encuesta.' },
      footer: { text: 'Haz clic en el botón para comenzar 👇' },
      action: {
        name: FLOW_NAMES.SURVEY, // <-- Usamos la constante
        parameters: {},
      },
    },
  };

  logger.info(`Sending WhatsApp Flow to ${customerPhone}`);

  try {
    await httpClient.post(MESSAGES_ENDPOINT, payload);
    logger.info(`Flow sent successfully to ${customerPhone}`);
  } catch (error: any) {
    throw new ApiError('WhatsApp', error);
  }
};

export const handleIncomingWhatsappMessage = (payload: WhatsappWebhookPayload): void => {
  const validationResult = whatsappFlowResponseSchema.safeParse(payload);

  if (!validationResult.success) {
    logger.warn(
      { errors: validationResult.error.format() },
      'Invalid WhatsApp webhook payload received',
    );
    return;
  }

  const message = validationResult.data.entry[0].changes[0].value.messages[0];
  const customerPhone = message.from;
  const flowResponse = JSON.parse(message.interactive.nfm_reply.response_json);
  
  logger.info({ customerPhone, flowResponse }, 'Flow response received and validated');
  sendEnrichedEmail(customerPhone, flowResponse);
};
