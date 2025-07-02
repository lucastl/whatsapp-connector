import { ZodError } from 'zod';

import { whatsappFlowResponseSchema } from '@/api/validators/webhook.validator';
import config from '@/config';
import { FLOW_NAMES, WHATSAPP_INTERACTIVE_TYPES, WHATSAPP_MESSAGE_TYPES } from '@/config/constants';
import { ApiError } from '@/core/errors/ApiError';
import {
  handleIncomingWhatsappMessage,
  triggerWhatsappFlow,
} from '@/core/services/whatsapp.service';
import { WhatsappWebhookPayload } from '@/core/types/whatsapp.types';
import { httpClient } from '@/infrastructure/http/httpClient';
import logger from '@/infrastructure/logging/logger';

import { sendEnrichedEmail } from './email.service';

jest.mock('@/infrastructure/http/httpClient');
jest.mock('@/infrastructure/logging/logger');
jest.mock('@/api/validators/webhook.validator');
jest.mock('./email.service');

// Mock config specifically for whatsapp.phoneNumberId used in MESSAGES_ENDPOINT
jest.mock('@/config', () => ({
  __esModule: true, // Indicate that this is an ES Module mock
  default: {
    whatsapp: {
      phoneNumberId: 'test-phone-number-id',
      apiBaseUrl: 'https://graph.facebook.com/v19.0', // Add a mock value
      apiToken: 'test-api-token', // Add a mock value
    },
    resend: {
      apiKey: 'test-resend-api-key', // Add a mock value for Resend
    },
  },
}));

const mockedHttpClient = httpClient as jest.Mocked<typeof httpClient>;
const mockedLoggerInfo = logger.info as jest.Mock;
const mockedLoggerWarn = logger.warn as jest.Mock;
const mockedSendEnrichedEmail = sendEnrichedEmail as jest.Mock;
const mockedWhatsappFlowResponseSchema = whatsappFlowResponseSchema as jest.Mocked<
  typeof whatsappFlowResponseSchema
>;

describe('WhatsApp Service', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('triggerWhatsappFlow', () => {
    const customerPhone = '5491122334455';
    const expectedEndpoint = `/${config.whatsapp.phoneNumberId}/messages`; // Uses mocked config
    const expectedPayloadBase = {
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
          parameters: {}, // As per current implementation
        },
      },
    };

    it('should call the http client with the correct payload and log success', async () => {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      mockedHttpClient.post.mockResolvedValue({ data: { success: true } } as any);

      await triggerWhatsappFlow(customerPhone);

      expect(mockedHttpClient.post).toHaveBeenCalledTimes(1);
      expect(mockedHttpClient.post).toHaveBeenCalledWith(expectedEndpoint, expectedPayloadBase);
      expect(mockedLoggerInfo).toHaveBeenCalledWith(`Sending WhatsApp Flow to ${customerPhone}`);
      expect(mockedLoggerInfo).toHaveBeenCalledWith(`Flow sent successfully to ${customerPhone}`);
    });

    it('should throw an ApiError if http client fails', async () => {
      const originalError = new Error('Network error');
      mockedHttpClient.post.mockRejectedValue(originalError);

      await expect(triggerWhatsappFlow(customerPhone)).rejects.toThrow(ApiError);
      // Check the structure and message of the ApiError
      try {
        await triggerWhatsappFlow(customerPhone);
      } catch (e) {
        expect(e).toBeInstanceOf(ApiError);
        const apiError = e as ApiError;
        expect(apiError.message).toBe(
          `Error communicating with the WhatsApp API: ${originalError.message}`,
        );
        expect(apiError.originalError).toBe(originalError);
        expect(apiError.statusCode).toBe(500); // Default status code from ApiError for non-HTTP errors
      }

      expect(mockedLoggerInfo).toHaveBeenCalledWith(`Sending WhatsApp Flow to ${customerPhone}`);
      expect(mockedLoggerInfo).not.toHaveBeenCalledWith(
        `Flow sent successfully to ${customerPhone}`,
      );
    });
  });

  describe('handleIncomingWhatsappMessage', () => {
    const mockCustomerPhone = '1234567890';
    const mockFlowResponseData = { survey_answer: 'yes', feedback: 'great' };
    const mockBasePayload: WhatsappWebhookPayload = {
      object: 'whatsapp_business_account',
      entry: [
        {
          changes: [
            {
              field: 'messages',
              value: {
                messages: [
                  {
                    from: mockCustomerPhone,
                    type: 'interactive',
                    interactive: {
                      type: 'nfm_reply',
                      nfm_reply: {
                        response_json: JSON.stringify(mockFlowResponseData),
                      },
                    },
                  },
                ],
              },
            },
          ],
        },
      ],
    };

    it('should log a warning and return if payload validation fails', () => {
      const mockValidationError = { format: jest.fn(() => ({ _errors: ['Validation failed'] })) };
      mockedWhatsappFlowResponseSchema.safeParse.mockReturnValue({
        success: false,
        error: mockValidationError as unknown as ZodError, // Cast to any for mock
      });

      handleIncomingWhatsappMessage(mockBasePayload);

      expect(mockedWhatsappFlowResponseSchema.safeParse).toHaveBeenCalledWith(mockBasePayload);
      expect(mockedLoggerWarn).toHaveBeenCalledWith(
        { errors: mockValidationError.format() },
        'Invalid WhatsApp webhook payload received',
      );
      expect(mockedLoggerInfo).not.toHaveBeenCalled();
      expect(mockedSendEnrichedEmail).not.toHaveBeenCalled();
    });

    it('should process valid payload, log info, and send enriched email', () => {
      mockedWhatsappFlowResponseSchema.safeParse.mockReturnValue({
        success: true,
        data: mockBasePayload as never, // Cast to any for mock
      });

      handleIncomingWhatsappMessage(mockBasePayload);

      expect(mockedWhatsappFlowResponseSchema.safeParse).toHaveBeenCalledWith(mockBasePayload);
      expect(mockedLoggerWarn).not.toHaveBeenCalled();
      expect(mockedLoggerInfo).toHaveBeenCalledWith(
        { customerPhone: mockCustomerPhone, flowResponse: mockFlowResponseData },
        'Flow response received and validated',
      );
      expect(mockedSendEnrichedEmail).toHaveBeenCalledTimes(1);
      expect(mockedSendEnrichedEmail).toHaveBeenCalledWith(mockCustomerPhone, mockFlowResponseData);
    });

    it('should throw SyntaxError if response_json is malformed', () => {
      const malformedJsonPayload = JSON.parse(JSON.stringify(mockBasePayload)); // Deep clone
      malformedJsonPayload.entry[0].changes[0].value.messages[0].interactive.nfm_reply.response_json =
        'this is not valid json {';

      mockedWhatsappFlowResponseSchema.safeParse.mockReturnValue({
        success: true,
        data: malformedJsonPayload,
      });

      expect(() => handleIncomingWhatsappMessage(malformedJsonPayload)).toThrow(SyntaxError);

      // Ensure logger.info for successful processing and sendEnrichedEmail are not called
      expect(mockedLoggerInfo).not.toHaveBeenCalledWith(
        expect.objectContaining({ customerPhone: mockCustomerPhone }),
        'Flow response received and validated',
      );
      expect(mockedSendEnrichedEmail).not.toHaveBeenCalled();
    });
  });
});
