// (CORREGIDO) Ajusta la estructura del payload para la acción del Flow.
import axios from 'axios';
import config from '../../config';
import logger from '../../infrastructure/logging/logger';
import { sendEnrichedEmail } from './email.service';
import { ApiError } from '../errors/ApiError';
import { httpClient } from '../../infrastructure/http/httpClient';
import { FLOW_NAMES, WHATSAPP_INTERACTIVE_TYPES, WHATSAPP_MESSAGE_TYPES } from '../../config/constants';
import { WhatsappWebhookPayload } from '../types/whatsapp.types';

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
    type: 'interactive',
    interactive: {
      type: 'flow',
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
  const message = payload.entry?.[0]?.changes?.[0]?.value?.messages?.[0];

  if (message && message.type === WHATSAPP_MESSAGE_TYPES.INTERACTIVE && message.interactive?.type === WHATSAPP_INTERACTIVE_TYPES.NFM_REPLY) {
    const customerPhone = message.from;
    const flowResponse = JSON.parse(message.interactive.nfm_reply.response_json);

    logger.info({ customerPhone, flowResponse }, 'Flow response received');

    sendEnrichedEmail(customerPhone, flowResponse).catch((error) =>
      logger.error(error, 'Failed to send enriched email from webhook handler'),
    );
  } else {
    logger.info('Received a standard message, not a Flow response. Ignoring.');
  }
};
