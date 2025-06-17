import { Resend } from 'resend';
import { sendEnrichedEmail } from '../email.service';
import logger from '../../../infrastructure/logging/logger';

jest.mock('resend');
jest.mock('../../../config', () => ({
  __esModule: true,
  default: {
    resend: {
      apiKey: 'mock-api-key-from-config',
    },
  },
}));
jest.mock('../../../infrastructure/logging/logger', () => ({
  info: jest.fn(),
  error: jest.fn(),
}));

const mockedConfig = require('../../../config').default;

type TestSurveyResponse = { [key: string]: any };

const mockResendSend = jest.fn();
(Resend as jest.Mock).mockImplementation(() => {
  return {
    emails: {
      send: mockResendSend,
    },
  };
});

describe('EmailService', () => {
  beforeEach(() => {
    mockResendSend.mockClear();
    (logger.info as jest.Mock).mockClear();
    (logger.error as jest.Mock).mockClear();
    (Resend as jest.Mock).mockClear();
  });

  describe('sendEnrichedEmail', () => {
    const customerPhone = '1234567890';
    const surveyData: TestSurveyResponse = {
      "Nombre Completo": "Test User",
      "Email_Address": "test@example.com",
      "Interes": "Producto A",
    };

    const generateExpectedHtml = (phone: string, data: TestSurveyResponse): string => {
      let body = `
      <h1>🚀 Nuevo Lead Calificado de WhatsApp</h1>
      <p><strong>Teléfono del Cliente:</strong> ${phone}</p>
      <hr>
      <h2>Resultados de la Encuesta:</h2>
      <ul>
  `;
      for (const [key, value] of Object.entries(data)) {
        body += `<li><strong>${key.replace(/_/g, ' ')}:</strong> ${value}</li>`;
      }
      body += `</ul><p><em>Este es un mensaje automático. Por favor, contactar al cliente a la brevedad.</em></p>`;
      return body;
    };

    it('should send an email with correct parameters and log success', async () => {
      const mockEmailData = { id: 'email-id-success' };
      mockResendSend.mockResolvedValueOnce({ data: mockEmailData, error: null });

      await sendEnrichedEmail(customerPhone, surveyData);

      expect(Resend).toHaveBeenCalledWith(mockedConfig.resend.apiKey);
      expect(mockResendSend).toHaveBeenCalledTimes(1);
      expect(mockResendSend).toHaveBeenCalledWith({
        from: 'Sistema de Alertas <onboarding@resend.dev>', // Hardcoded in service
        to: ['lucastosellolatini@gmail.com'], // Hardcoded in service
        subject: `Nuevo Lead Calificado de WhatsApp: ${customerPhone}`,
        html: generateExpectedHtml(customerPhone, surveyData),
      });
      expect(logger.info).toHaveBeenCalledWith({ messageId: mockEmailData.id }, `Enriched email sent successfully via Resend.`);
    });

    it('should throw an error and log if Resend API returns an error', async () => {
      const mockApiError = { name: 'ResendError', message: 'Failed to send' };
      mockResendSend.mockResolvedValueOnce({ data: null, error: mockApiError });

      await expect(sendEnrichedEmail(customerPhone, surveyData)).rejects.toThrow('Resend API error');
      expect(logger.error).toHaveBeenCalledWith({ error: mockApiError }, 'Failed to send email via Resend');
      expect(logger.info).not.toHaveBeenCalledWith(expect.stringContaining('Enriched email sent successfully'));
    });

    it('should log an error if Resend client throws an unexpected error and not rethrow from service', async () => {
      const unexpectedError = new Error('Unexpected network issue');
      mockResendSend.mockRejectedValueOnce(unexpectedError); // This applies to the *next* call to resend.emails.send

      await expect(sendEnrichedEmail(customerPhone, surveyData)).resolves.toBeUndefined();

      expect(logger.error).toHaveBeenCalledWith(unexpectedError, 'An unexpected error occurred while sending email.');
      expect(logger.info).not.toHaveBeenCalledWith(expect.stringContaining('Enriched email sent successfully via Resend.'));
    });
  });
});