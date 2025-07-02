import { EMAIL_CONFIG } from '@/config/constants';
import { ApiError } from '@/core/errors/ApiError';
import { FlowResponse } from '@/core/types/whatsapp.types';
import { resendClient } from '@/infrastructure/email/resend.client';
import logger from '@/infrastructure/logging/logger';

import { sendEnrichedEmail } from './email.service';

jest.mock('@/infrastructure/email/resend.client');
jest.mock('@/infrastructure/logging/logger');
// ApiError and EMAIL_CONFIG are used directly and don't need mocking for these tests.

const mockedResendEmailsSend = resendClient.emails.send as jest.Mock;
// We can use logger.info and logger.error directly as they are already mocked by jest.mock

describe('Email Service - sendEnrichedEmail', () => {
  const customerPhone = '1234567890';
  const surveyData: FlowResponse = {
    product_interest: 'Fiber 1000',
    best_time_to_call: 'Morning',
  };

  const expectedSubject = `Nuevo Lead Calificado de WhatsApp: ${customerPhone}`;
  let expectedHtmlBody = `
      <h1>🚀 Nuevo Lead Calificado de WhatsApp</h1>
      <p><strong>Teléfono del Cliente:</strong> ${customerPhone}</p>
      <hr>
      <h2>Resultados de la Encuesta:</h2>
      <ul>
  `;
  for (const [key, value] of Object.entries(surveyData)) {
    expectedHtmlBody += `<li><strong>${key.replace(/_/g, ' ')}:</strong> ${value}</li>`;
  }
  expectedHtmlBody += `</ul><p><em>Este es un mensaje automático. Por favor, contactar al cliente a la brevedad.</em></p>`;

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('should send email successfully and log info', async () => {
    mockedResendEmailsSend.mockResolvedValue({ data: { id: 'email_id_123' }, error: null });

    await sendEnrichedEmail(customerPhone, surveyData);

    expect(logger.info).toHaveBeenCalledWith(
      `Preparing enriched email via Resend for ${customerPhone}`,
    );
    expect(mockedResendEmailsSend).toHaveBeenCalledTimes(1);
    expect(mockedResendEmailsSend).toHaveBeenCalledWith({
      from: EMAIL_CONFIG.FROM_ADDRESS,
      to: EMAIL_CONFIG.SALES_TEAM_LIST,
      subject: expectedSubject,
      html: expectedHtmlBody,
    });
    expect(logger.info).toHaveBeenCalledWith(
      { messageId: 'email_id_123' },
      `Enriched email sent successfully via Resend.`,
    );
    expect(logger.error).not.toHaveBeenCalled();
  });

  it('should handle Resend API error, log error, and not throw from service', async () => {
    const resendApiErrorPayload = {
      name: 'ResendError',
      message: 'Invalid API Key',
      statusCode: 401,
    };
    mockedResendEmailsSend.mockResolvedValue({ data: null, error: resendApiErrorPayload });

    await sendEnrichedEmail(customerPhone, surveyData);

    expect(logger.info).toHaveBeenCalledWith(
      `Preparing enriched email via Resend for ${customerPhone}`,
    );
    expect(mockedResendEmailsSend).toHaveBeenCalledTimes(1);
    expect(logger.error).toHaveBeenCalledTimes(1);
    expect(logger.error).toHaveBeenCalledWith(
      expect.any(ApiError),
      'Failed to send email via Resend',
    );

    const caughtApiError = (logger.error as jest.Mock).mock.calls[0][0] as ApiError;
    expect(caughtApiError.message).toBe(
      `Error communicating with the Resend API: ${resendApiErrorPayload.message}`,
    );
    expect(caughtApiError.originalError).toEqual(resendApiErrorPayload);
    // ApiError defaults to 500 if originalError doesn't have response.status
    // The resendErrorPayload itself doesn't have a 'response' property.
    expect(caughtApiError.statusCode).toBe(500);
    expect(logger.info).not.toHaveBeenCalledWith(
      expect.objectContaining({ messageId: expect.any(String) }),
      `Enriched email sent successfully via Resend.`,
    );
  });

  it('should handle thrown error from Resend client, log error, and not throw from service', async () => {
    const thrownError = new Error('Network connection failed');
    mockedResendEmailsSend.mockRejectedValue(thrownError);

    await sendEnrichedEmail(customerPhone, surveyData);

    expect(logger.info).toHaveBeenCalledWith(
      `Preparing enriched email via Resend for ${customerPhone}`,
    );
    expect(mockedResendEmailsSend).toHaveBeenCalledTimes(1);
    expect(logger.error).toHaveBeenCalledTimes(1);
    expect(logger.error).toHaveBeenCalledWith(
      expect.any(ApiError),
      'Failed to send email via Resend',
    );

    const caughtApiError = (logger.error as jest.Mock).mock.calls[0][0] as ApiError;
    expect(caughtApiError.message).toBe(
      `Error communicating with the Resend API: ${thrownError.message}`,
    );
    expect(caughtApiError.originalError).toBe(thrownError);
    expect(caughtApiError.statusCode).toBe(500);
    expect(logger.info).not.toHaveBeenCalledWith(
      expect.objectContaining({ messageId: expect.any(String) }),
      `Enriched email sent successfully via Resend.`,
    );
  });

  it('should correctly format HTML for empty surveyData', async () => {
    const emptySurveyData: FlowResponse = {
      product_interest: '',
      best_time_to_call: '',
    };
    const expectedHtmlForEmpty = `
      <h1>🚀 Nuevo Lead Calificado de WhatsApp</h1>
      <p><strong>Teléfono del Cliente:</strong> ${customerPhone}</p>
      <hr>
      <h2>Resultados de la Encuesta:</h2>
      <ul>
  <li><strong>product interest:</strong> </li><li><strong>best time to call:</strong> </li></ul><p><em>Este es un mensaje automático. Por favor, contactar al cliente a la brevedad.</em></p>`;

    mockedResendEmailsSend.mockResolvedValue({ data: { id: 'email_id_456' }, error: null });
    await sendEnrichedEmail(customerPhone, emptySurveyData);
    expect(mockedResendEmailsSend).toHaveBeenCalledWith(
      expect.objectContaining({ html: expectedHtmlForEmpty }),
    );
  });
});
