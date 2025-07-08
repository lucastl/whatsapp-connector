// src/core/services/messaging.service.test.ts

import { ApiError } from '@/core/errors/ApiError';
import {
  handleIncomingTwilioSurvey,
  handleTwilioStatusUpdate,
  triggerSurveyTemplate,
} from '@/core/services/messaging.service';

// --- Mocks de Dependencias ---

jest.mock('@/infrastructure/providers/twilio/twilio.client', () => ({
  twilioClient: {
    messages: {
      create: jest.fn(),
    },
  },
}));

jest.mock('@/infrastructure/providers/meta/whatsapp.httpClient', () => ({
  whatsappHttpClient: {
    post: jest.fn(),
  },
}));

import { whatsappHttpClient } from '@/infrastructure/providers/meta/whatsapp.httpClient';
import { twilioClient } from '@/infrastructure/providers/twilio/twilio.client';

jest.mock('./email.service', () => ({
  __esModule: true,
  sendEnrichedEmail: jest.fn(),
}));

import { sendEnrichedEmail } from './email.service';

jest.mock('@/infrastructure/monitoring/metrics', () => ({
  apiErrorsTotal: { inc: jest.fn() },
  messagingTemplatesSentTotal: { inc: jest.fn() },
  messagingFlowsCompleted: { inc: jest.fn() },
  messagingInvalidPayloadsTotal: { inc: jest.fn() },
  messagingFlowsProcessingErrors: { inc: jest.fn() },
  messagingStatusUpdatesTotal: { inc: jest.fn() },
}));

import {
  apiErrorsTotal,
  messagingFlowsCompleted,
  messagingFlowsProcessingErrors,
  messagingInvalidPayloadsTotal,
  messagingStatusUpdatesTotal,
  messagingTemplatesSentTotal,
} from '@/infrastructure/monitoring/metrics';

jest.mock('@/infrastructure/logging/logger', () => ({
  info: jest.fn(),
  warn: jest.fn(),
  error: jest.fn(),
}));

import config from '@/config';
jest.mock('@/config');
const mockedConfig = config as jest.Mocked<typeof config>;

// --- Suite de Tests ---

describe('Messaging Service', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('triggerSurveyTemplate', () => {
    it('should call the Twilio client with the correct payload when provider is "twilio"', async () => {
      // Arrange
      mockedConfig.messagingProvider = 'twilio';
      mockedConfig.twilio = {
        accountSid: 'AC_test_sid',
        authToken: 'test_auth_token',
        whatsappNumber: 'whatsapp:+14155238886',
        templateSid: 'HX_test_template_sid',
      };
      const customerPhone = '5491122334455';

      // Act
      await triggerSurveyTemplate(customerPhone);

      // Assert
      expect(twilioClient!.messages.create).toHaveBeenCalledTimes(1);
      expect(twilioClient!.messages.create).toHaveBeenCalledWith({
        contentSid: 'HX_test_template_sid',
        from: 'whatsapp:+14155238886',
        to: `whatsapp:${customerPhone}`,
      });
      expect(messagingTemplatesSentTotal.inc).toHaveBeenCalledWith({
        provider: 'twilio',
      });
      expect(whatsappHttpClient.post).not.toHaveBeenCalled();
    });

    it('should throw an ApiError and increment metrics if the Twilio client fails', async () => {
      // Arrange
      mockedConfig.messagingProvider = 'twilio';
      const customerPhone = '5491122334455';
      const twilioApiError = new Error('Twilio API is down');
      (twilioClient!.messages.create as jest.Mock).mockRejectedValue(twilioApiError);

      // Act & Assert
      await expect(triggerSurveyTemplate(customerPhone)).rejects.toThrow(ApiError);

      expect(apiErrorsTotal.inc).toHaveBeenCalledWith({ service: 'twilio' });
      expect(apiErrorsTotal.inc).toHaveBeenCalledTimes(1);
      expect(messagingTemplatesSentTotal.inc).not.toHaveBeenCalled();
    });
  });

  describe('handleIncomingTwilioSurvey', () => {
    it('should process a valid webhook, parse the body, and trigger the email service', async () => {
      // Arrange
      const validPayload = {
        customerPhone: 'whatsapp:+5491122334455',
        surveyResponse: {
          product_interest: 'Fibra 1000',
          best_time_to_call: 'Tarde',
        },
      };
      const expectedParsedBody = {
        product_interest: 'Fibra 1000',
        best_time_to_call: 'Tarde',
      };

      // Act
      await handleIncomingTwilioSurvey(validPayload);

      // Assert
      expect(messagingFlowsCompleted.inc).toHaveBeenCalledWith({ provider: 'twilio' });
      expect(sendEnrichedEmail).toHaveBeenCalledTimes(1);
      expect(sendEnrichedEmail).toHaveBeenCalledWith('+5491122334455', expectedParsedBody);
      expect(messagingInvalidPayloadsTotal.inc).not.toHaveBeenCalled();
    });

    it('should handle an invalid webhook payload and increment the correct metric', async () => {
      // Arrange
      const invalidPayload = {
        customerPhone: 'invalid-phone-number', // Invalid data
      };

      // Act
      await handleIncomingTwilioSurvey(invalidPayload);

      // Assert
      expect(messagingInvalidPayloadsTotal.inc).toHaveBeenCalledWith({
        provider: 'twilio_studio',
      });
      expect(sendEnrichedEmail).not.toHaveBeenCalled();
      expect(messagingFlowsCompleted.inc).not.toHaveBeenCalled();
    });

    it('should handle processing errors and increment the corresponding metric', async () => {
      // Arrange
      const validPayload = {
        customerPhone: 'whatsapp:+5491122334455',
        surveyResponse: {
          product_interest: 'Fibra 1000',
          best_time_to_call: 'Tarde',
        },
      };
      (sendEnrichedEmail as jest.Mock).mockImplementation(() => {
        throw new Error('Email service is down');
      });

      // Act
      await handleIncomingTwilioSurvey(validPayload);

      // Assert
      expect(sendEnrichedEmail).toHaveBeenCalledTimes(1);
      expect(messagingFlowsCompleted.inc).toHaveBeenCalledWith({ provider: 'twilio' });
      expect(messagingFlowsProcessingErrors.inc).toHaveBeenCalledWith({
        provider: 'twilio',
      });
    });
  });

  describe('handleTwilioStatusUpdate', () => {
    it('should process a valid status update and increment the correct metric', () => {
      // Arrange
      const validPayload = {
        MessageSid: 'SM_test_sid',
        MessageStatus: 'delivered',
        To: 'whatsapp:+14155238886',
        From: 'whatsapp:+5491122334455',
      };

      // Act
      handleTwilioStatusUpdate(validPayload);

      // Assert
      expect(messagingStatusUpdatesTotal.inc).toHaveBeenCalledWith({
        provider: 'twilio',
        status: 'delivered',
      });
    });

    it('should log an error for failed or undelivered messages', () => {
      // Arrange
      const failedPayload = {
        MessageSid: 'SM_test_sid_failed',
        MessageStatus: 'failed',
        ErrorCode: '63016',
        ErrorMessage: 'Failed to send message',
        To: 'whatsapp:+14155238886',
        From: 'whatsapp:+5491122334455',
      };

      // Act
      handleTwilioStatusUpdate(failedPayload);

      // Assert
      expect(messagingStatusUpdatesTotal.inc).toHaveBeenCalledWith({
        provider: 'twilio',
        status: 'failed',
      });
    });

    it('should handle invalid status update payloads gracefully', () => {
      // Arrange
      const invalidPayload = {
        // Missing required fields
        To: 'whatsapp:+14155238886',
      };

      // Act
      handleTwilioStatusUpdate(invalidPayload);

      // Assert
      expect(messagingStatusUpdatesTotal.inc).not.toHaveBeenCalled();
    });
  });
});