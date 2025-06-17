import axios from 'axios';
import { triggerWhatsappFlow, handleIncomingWhatsappMessage } from '../whatsapp.service';
import * as emailService from '../email.service';
import logger from '../../../infrastructure/logging/logger';

jest.mock('axios');
jest.mock('../email.service');
jest.mock('../../../config', () => ({
  __esModule: true,
  default: {
    whatsapp: {
      apiToken: 'test-whatsapp-api-token',
      phoneNumberId: 'test-phone-number-id',
    },
  },
}));
jest.mock('../../../infrastructure/logging/logger', () => ({
  info: jest.fn(),
  error: jest.fn(),
  warn: jest.fn(),
  debug: jest.fn(),
}));

// Access the mocked config correctly
const mockedConfig = require('../../../config').default;

const mockedAxiosPost = axios.post as jest.Mock;
const mockedSendEnrichedEmail = emailService.sendEnrichedEmail as jest.Mock;

describe('WhatsappService', () => {
  beforeEach(() => {
    mockedAxiosPost.mockClear();
    mockedSendEnrichedEmail.mockClear();
    (Object.values(logger) as jest.Mock[]).forEach(mockFn => mockFn.mockClear());
  });

  describe('triggerWhatsappFlow', () => {
    const to = '1234567890';

    it('should send a flow message via WhatsApp API and log success', async () => {
      mockedAxiosPost.mockResolvedValueOnce({ data: {} }); // API response data isn't directly used in this shape by the service log

      await triggerWhatsappFlow(to);

      const expectedUrl = `https://graph.facebook.com/v19.0/${mockedConfig.whatsapp.phoneNumberId}/messages`;
      const expectedPayload = {
        messaging_product: 'whatsapp',
        to: to,
        type: 'interactive',
        interactive: {
          type: 'flow',
          header: {
            type: 'text',
            text: 'Encuesta Rápida de Interés',
          },
          body: {
            text: 'Por favor, tómate un minuto para completar nuestra encuesta y poder atenderte mejor.', // Matches service
          },
          footer: {
            text: 'Haz clic en el botón para comenzar 👇',
          },
          action: {
            name: 'survey',
            parameters: {},
          },
        },
      };
      const expectedConfig = {
        headers: {
          Authorization: `Bearer ${mockedConfig.whatsapp.apiToken}`,
          'Content-Type': 'application/json',
        },
      };

      expect(mockedAxiosPost).toHaveBeenCalledWith(expectedUrl, expectedPayload, expectedConfig);
      expect(logger.info).toHaveBeenCalledWith(`Sending WhatsApp Flow to ${to}`);
      expect(logger.info).toHaveBeenCalledWith(`Flow sent successfully to ${to}`);
    });

    it('should log an error if sending flow message fails', async () => {
      const apiError = new Error('API Error');

      mockedAxiosPost.mockRejectedValueOnce(apiError);

      await expect(triggerWhatsappFlow(to)).rejects.toThrow('Could not send WhatsApp Flow');
      expect(logger.info).toHaveBeenCalledWith(`Sending WhatsApp Flow to ${to}`);
      expect(logger.error).toHaveBeenCalledWith(
        { message: 'Failed to send WhatsApp Flow', error: apiError.message },
        'Error details'
      );
    });
  });

  describe('handleIncomingWhatsappMessage', () => {
    const baseWebhookBody = {
      object: 'whatsapp_business_account',
      entry: [
        {
          id: 'entry_id_1',
          changes: [
            {
              value: {
                messaging_product: 'whatsapp',
                metadata: { display_phone_number: '16505551111', phone_number_id: mockedConfig.whatsapp.phoneNumberId }, // Use mockedConfig
                contacts: [{ profile: { name: 'Test User' }, wa_id: '15550001234' }],
                messages: [],
              },
              field: 'messages',
            },
          ],
        },
      ],
    };

    it('should log and ignore an incoming text message', async () => {
      const webhookBody = JSON.parse(JSON.stringify(baseWebhookBody));
      const message = { from: '15550001234', id: 'wamid.text1', timestamp: '1678886400', text: { body: 'Hello world' }, type: 'text' };
      webhookBody.entry[0].changes[0].value.messages = [message];

      await handleIncomingWhatsappMessage(webhookBody);

      expect(logger.info).toHaveBeenCalledWith('Received a standard message, not a Flow response. Ignoring.');
      expect(mockedSendEnrichedEmail).not.toHaveBeenCalled();
    });

    it('should process an incoming interactive nfm_reply message and call sendEnrichedEmail', async () => {
      const webhookBody = JSON.parse(JSON.stringify(baseWebhookBody));
      const flowData = { key1: 'value1', key2: 'value2' };
      const customerPhone = '15550001234';
      const interactive = { type: 'nfm_reply', nfm_reply: { response_json: JSON.stringify(flowData), body: 'Flow Completed', name: 'survey' } };
      const message = { 
        from: customerPhone, 
        id: 'wamid.flow1', 
        timestamp: '1678886401', 
        interactive, 
        type: 'interactive', 
      };
      webhookBody.entry[0].changes[0].value.messages = [message];
      mockedSendEnrichedEmail.mockResolvedValueOnce(undefined);

      await handleIncomingWhatsappMessage(webhookBody);

      expect(logger.info).toHaveBeenCalledWith({ customerPhone, flowResponse: flowData }, 'Flow response received');
      expect(mockedSendEnrichedEmail).toHaveBeenCalledTimes(1);
      expect(mockedSendEnrichedEmail).toHaveBeenCalledWith(customerPhone, flowData);
    });

    it('should log and ignore unknown interactive message types', async () => {
      const webhookBody = JSON.parse(JSON.stringify(baseWebhookBody));
      const message = { from: '15550001234', id: 'wamid.unknownint1', timestamp: '1678886402', interactive: { type: 'unknown_type' }, type: 'interactive' };
      webhookBody.entry[0].changes[0].value.messages = [message];

      await handleIncomingWhatsappMessage(webhookBody);

      expect(logger.info).toHaveBeenCalledWith('Received a standard message, not a Flow response. Ignoring.');
      expect(logger.warn).not.toHaveBeenCalled();
      expect(mockedSendEnrichedEmail).not.toHaveBeenCalled();
    });

    it('should log a warning for unknown message types', async () => {
      const webhookBody = JSON.parse(JSON.stringify(baseWebhookBody));
      const message = { from: '15550001234', id: 'wamid.unknown1', timestamp: '1678886403', type: 'image', image: {} };
      webhookBody.entry[0].changes[0].value.messages = [message];

      await handleIncomingWhatsappMessage(webhookBody);

      expect(logger.info).toHaveBeenCalledWith('Received a standard message, not a Flow response. Ignoring.');
      expect(logger.warn).not.toHaveBeenCalled();
      expect(mockedSendEnrichedEmail).not.toHaveBeenCalled();
    });

    it('should log and ignore if message structure is not as expected (e.g., not whatsapp_business_account payload)', async () => {
      const webhookBody = { object: 'not_whatsapp', entry: [] };
      await handleIncomingWhatsappMessage(webhookBody);
      expect(logger.info).toHaveBeenCalledWith('Received a standard message, not a Flow response. Ignoring.');
      expect(logger.debug).not.toHaveBeenCalled();
      expect(mockedSendEnrichedEmail).not.toHaveBeenCalled();
    });

    it('should handle empty changes array or no messages gracefully', async () => {
      let webhookBody = JSON.parse(JSON.stringify(baseWebhookBody));
      webhookBody.entry[0].changes = [];
      await handleIncomingWhatsappMessage(webhookBody);

      webhookBody = JSON.parse(JSON.stringify(baseWebhookBody));
      webhookBody.entry[0].changes[0].value.messages = [];
      await handleIncomingWhatsappMessage(webhookBody);

      webhookBody = JSON.parse(JSON.stringify(baseWebhookBody));
      delete webhookBody.entry[0].changes[0].value.messages;
      await handleIncomingWhatsappMessage(webhookBody);

      expect(mockedSendEnrichedEmail).not.toHaveBeenCalled();
    });

    it('should log an error if sending email fails during message processing', async () => {
      const customerPhone = '15550001234';
      const flowData = { key1: 'email_fail_data' };
      const webhookBody = JSON.parse(JSON.stringify(baseWebhookBody));
      const interactive = { type: 'nfm_reply', nfm_reply: { response_json: JSON.stringify(flowData), body: 'Flow for email fail', name: 'fail_survey' } };
      const message = { 
        from: customerPhone, 
        id: 'wamid.flow_email_fail', 
        timestamp: '1678886400', 
        interactive, 
        type: 'interactive' 
      };
      webhookBody.entry[0].changes[0].value.messages = [message];
      const emailError = new Error('Email sending failed');
      mockedSendEnrichedEmail.mockRejectedValueOnce(emailError);

      await handleIncomingWhatsappMessage(webhookBody);

      expect(mockedSendEnrichedEmail).toHaveBeenCalledWith(customerPhone, flowData);
      expect(logger.error).toHaveBeenCalledWith(emailError, 'Failed to send enriched email from webhook handler');
    });
  });
});