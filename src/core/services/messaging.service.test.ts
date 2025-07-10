import config from '@/config';
import { ApiError } from '@/core/errors/ApiError';
import { IWhatsappHttpClient } from '@/infrastructure/providers/meta/whatsapp.httpClient';

import { IEmailService } from './email.service';
import { createMessagingService, IMessagingService, TwilioClient } from './messaging.service';

// --- Mocks ---
jest.mock('@/config');
jest.mock('@/infrastructure/logging/logger', () => ({
  info: jest.fn(),
  warn: jest.fn(),
  error: jest.fn(),
}));
jest.mock('@/infrastructure/monitoring/metrics', () => ({
  apiErrorsTotal: { inc: jest.fn() },
  messagingTemplatesSentTotal: { inc: jest.fn() },
  messagingFlowsCompleted: { inc: jest.fn() },
  messagingInvalidPayloadsTotal: { inc: jest.fn() },
  messagingFlowsProcessingErrors: { inc: jest.fn() },
  messagingStatusUpdatesTotal: { inc: jest.fn() },
  externalApiRequestDurationSeconds: {
    startTimer: jest.fn(() => jest.fn()), // Simula startTimer que devuelve una función para end()
  },
}));

import { apiErrorsTotal, messagingTemplatesSentTotal } from '@/infrastructure/monitoring/metrics';

describe('Messaging Service', () => {
  let mockEmailService: jest.Mocked<IEmailService>;
  let mockWhatsappClient: jest.Mocked<IWhatsappHttpClient>;
  let mockTwilioClient: jest.Mocked<TwilioClient>;
  let messagingService: IMessagingService;

  beforeEach(() => {
    jest.clearAllMocks();

    mockEmailService = {
      sendEnrichedEmail: jest.fn(),
    };
    mockWhatsappClient = {
      post: jest.fn(),
    };
    mockTwilioClient = {
      messages: {
        create: jest.fn(),
      },
    } as unknown as jest.Mocked<TwilioClient>;

    messagingService = createMessagingService(
      mockEmailService,
      mockWhatsappClient,
      mockTwilioClient,
    );
  });

  describe('triggerSurveyTemplate', () => {
    it('should call the Twilio client when provider is "twilio"', async () => {
      (config as jest.Mocked<typeof config>).messagingProvider = 'twilio';
      (config as jest.Mocked<typeof config>).twilio = {
        templateSid: 'test_sid',
        whatsappNumber: 'whatsapp:+123',
      } as unknown as (typeof config)['twilio'];

      await messagingService.triggerSurveyTemplate('549');

      expect(mockTwilioClient!.messages.create).toHaveBeenCalledTimes(1);
      expect(mockWhatsappClient.post).not.toHaveBeenCalled();
      expect(messagingTemplatesSentTotal.inc).toHaveBeenCalledWith({ provider: 'twilio' });
    });

    it('should call the Meta client when provider is "meta"', async () => {
      (config as jest.Mocked<typeof config>).messagingProvider = 'meta';

      await messagingService.triggerSurveyTemplate('549');

      expect(mockWhatsappClient.post).toHaveBeenCalledTimes(1);
      expect(mockTwilioClient!.messages.create).not.toHaveBeenCalled();
      expect(messagingTemplatesSentTotal.inc).toHaveBeenCalledWith({ provider: 'meta' });
    });

    it('should throw ApiError if the client fails', async () => {
      (config as jest.Mocked<typeof config>).messagingProvider = 'meta';
      mockWhatsappClient.post.mockRejectedValue(new Error('API Down'));

      await expect(messagingService.triggerSurveyTemplate('549')).rejects.toThrow(ApiError);
      expect(apiErrorsTotal.inc).toHaveBeenCalledWith({ service: 'meta' });
    });
  });

  // ... Aquí irían los tests para las otras funciones del servicio ...
});
