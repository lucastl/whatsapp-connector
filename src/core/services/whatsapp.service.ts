// (CORREGIDO) Ajusta la estructura del payload para la acción del Flow.
import axios from 'axios';
import config from '../../config';
import logger from '../../infrastructure/logging/logger';
import { sendEnrichedEmail } from './email.service';
import { ApiError } from '../errors/ApiError';

const WHATSAPP_API_URL = `https://graph.facebook.com/v19.0/${config.whatsapp.phoneNumberId}/messages`;

export const triggerWhatsappFlow = async (customerPhone: string): Promise<void> => {
  logger.info(`Sending WhatsApp Flow to ${customerPhone}`);

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
      header: {
        type: 'text',
        text: 'Encuesta Rápida de Interés',
      },
      body: {
        text: 'Por favor, tómate un minuto para completar nuestra encuesta y poder atenderte mejor.',
      },
      footer: {
        text: 'Haz clic en el botón para comenzar 👇',
      },
      action: {
        name: 'survey', // TODO: Replace with real flow name in WhatsApp Business Manager
        parameters: flowData,
      },
    },
  };

  try {
    await axios.post(WHATSAPP_API_URL, payload, {
      headers: {
        Authorization: `Bearer ${config.whatsapp.apiToken}`,
        'Content-Type': 'application/json',
      },
    });
    logger.info(`Flow sent successfully to ${customerPhone}`);
  } catch (error: any) {
    logger.error({ 
        message: 'Failed to send WhatsApp Flow', 
        error: error.response?.data || error.message 
    }, 'Error details');

    throw new ApiError('WhatsApp', error);
  }
};

export const handleIncomingWhatsappMessage = (payload: any): void => {
    const message = payload.entry?.[0]?.changes?.[0]?.value?.messages?.[0];

    if (message && message.type === 'interactive' && message.interactive?.type === 'nfm_reply') {
        const customerPhone = message.from;
        const flowResponse = JSON.parse(message.interactive.nfm_reply.response_json);
        
        logger.info({ customerPhone, flowResponse }, 'Flow response received');

        sendEnrichedEmail(customerPhone, flowResponse)
            .catch(error => logger.error(error, 'Failed to send enriched email from webhook handler'));

    } else {
        logger.info('Received a standard message, not a Flow response. Ignoring.');
    }
}