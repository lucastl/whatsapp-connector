import { createEmailService, IEmailService, ResendClient } from './email.service';

jest.mock('@/infrastructure/logging/logger', () => ({
  info: jest.fn(),
  error: jest.fn(),
}));

jest.mock('@/infrastructure/monitoring/metrics', () => ({
  emailNotificationsTotal: { inc: jest.fn() },
  apiErrorsTotal: { inc: jest.fn() },
  externalApiRequestDurationSeconds: {
    startTimer: jest.fn(() => jest.fn()),
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

  it('should send an email with survey data', async () => {
    (mockResendClient.emails.send as jest.Mock).mockResolvedValue({ data: { id: 'test-id' } });

    const surveyData = {
      has_fiber: 'Si',
      mobile_plans: 'Plan Premium',
      location: { latitude: -34.5345, longitude: -58.4534 },
      another_field: 'some_value',
    };

    await emailService.sendEnrichedEmail('123456789', surveyData);

    expect(mockResendClient.emails.send).toHaveBeenCalledTimes(1);
    const emailPayload = (mockResendClient.emails.send as jest.Mock).mock.calls[0][0];

    expect(emailPayload.subject).toBe('Nuevo contacto desde WhatsApp: 123456789');
    expect(emailPayload.html).toContain('<h1>🚀 Nuevo contacto desde WhatsApp</h1>');
    expect(emailPayload.html).toContain('<p><strong>Nº de teléfono:</strong> 123456789</p>');
    expect(emailPayload.html).toContain('<li><strong>¿Tiene internet Movistar?:</strong> Si</li>');
    expect(emailPayload.html).toContain('<li><strong>Interés en planes de celulares:</strong> Plan Premium</li>');
    expect(emailPayload.html).toContain('<li><strong>Ubicación:</strong> latitud: -34.5345, longitud: -58.4534</li>');
    expect(emailPayload.html).toContain('<li><strong>Another field:</strong> some_value</li>');
  });

  it('should send an email indicating no survey data if survey is empty', async () => {
    (mockResendClient.emails.send as jest.Mock).mockResolvedValue({ data: { id: 'test-id' } });

    await emailService.sendEnrichedEmail('123456789', {});

    const emailPayload = (mockResendClient.emails.send as jest.Mock).mock.calls[0][0];
    expect(emailPayload.html).toContain('<p>El usuario no completó la encuesta de calificación.</p>');
    expect(emailPayload.html).not.toContain('<ul>');
  });

  it('should not include location if latitude and longitude are null', async () => {
    (mockResendClient.emails.send as jest.Mock).mockResolvedValue({ data: { id: 'test-id' } });

    const surveyData = {
      has_fiber: 'Si',
      location: { latitude: null, longitude: null },
    };

    await emailService.sendEnrichedEmail('123456789', surveyData);

    const emailPayload = (mockResendClient.emails.send as jest.Mock).mock.calls[0][0];
    expect(emailPayload.html).not.toContain('<li><strong>Ubicación:');
  });

  it('should handle Resend API errors gracefully', async () => {
    const apiError = new Error('API is down');
    (mockResendClient.emails.send as jest.Mock).mockResolvedValue({ data: null, error: apiError });

    await emailService.sendEnrichedEmail('987654321', {});

    expect(mockResendClient.emails.send).toHaveBeenCalledTimes(1);
  });
});
