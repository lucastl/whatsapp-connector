import { createEmailService, IEmailService, ResendClient } from './email.service';

jest.mock('@/infrastructure/logging/logger', () => ({
  info: jest.fn(),
  error: jest.fn(),
}));

jest.mock('@/infrastructure/monitoring/metrics', () => ({
  emailNotificationsTotal: { inc: jest.fn() },
  apiErrorsTotal: { inc: jest.fn() },
  externalApiRequestDurationSeconds: {
    startTimer: jest.fn(() => jest.fn()), // Simula startTimer que devuelve una función para end()
  },
}));

describe('Email Service', () => {
  let mockResendClient: jest.Mocked<ResendClient>;
  let emailService: IEmailService;

  beforeEach(() => {
    jest.clearAllMocks();
    mockResendClient = {
      emails: {
        send: jest.fn(),
      },
    } as unknown as jest.Mocked<ResendClient>;
    emailService = createEmailService(mockResendClient);
  });

  it('should send an email successfully', async () => {
    (mockResendClient.emails.send as jest.Mock).mockResolvedValue({
      data: { id: 'test-id' },
      error: null,
    });

    await emailService.sendEnrichedEmail('12345', {
      have_fiber: 'yes',
      mobile_plans: 'basic',
      location: 'test-location',
    });

    expect(mockResendClient.emails.send).toHaveBeenCalledTimes(1);
    expect(mockResendClient.emails.send).toHaveBeenCalledWith(
      expect.objectContaining({
        subject: expect.stringContaining('Nuevo Lead Calificado'),
      }),
    );
  });

  it('should handle errors from the Resend API', async () => {
    const apiError = new Error('API is down');
    (mockResendClient.emails.send as jest.Mock).mockResolvedValue({ data: null, error: apiError });

    await emailService.sendEnrichedEmail('12345', {
      have_fiber: 'yes',
      mobile_plans: 'basic',
      location: 'test-location',
    });

    expect(mockResendClient.emails.send).toHaveBeenCalledTimes(1);
  });
});
