import { EMAIL_CONFIG } from '@/config/constants';
import { ApiError } from '@/core/errors/ApiError';
import { FlowResponse } from '@/core/types/messaging.types';
import { resendClient } from '@/infrastructure/email/resend.client';
import logger from '@/infrastructure/logging/logger';
import { apiErrorsTotal, emailNotificationsTotal } from '@/infrastructure/monitoring/metrics';

const generateSurveyEmailHtml = (customerPhone: string, surveyData: FlowResponse): string => {
  const surveyItems = Object.entries(surveyData)
    .map(([key, value]) => {
      const formattedKey = key.replace(/_/g, ' ').replace(/^\w/, (c) => c.toUpperCase());
      return `<li><strong>${formattedKey}:</strong> ${value}</li>`;
    })
    .join('');

  return `
      <h1>🚀 Nuevo Lead Calificado de WhatsApp</h1>
      <p><strong>Teléfono del Cliente:</strong> ${customerPhone}</p>
      <hr>
      <h2>Resultados de la Encuesta:</h2>
      <ul>${surveyItems}</ul>
      <p><em>Este es un mensaje automático. Por favor, contactar al cliente a la brevedad.</em></p>
  `;
};

export const sendEnrichedEmail = async (
  customerPhone: string,
  surveyData: FlowResponse,
): Promise<void> => {
  logger.info(`Preparing enriched email via Resend for ${customerPhone}`);

  const emailSubject = `Nuevo Lead Calificado de WhatsApp: ${customerPhone}`;
  const emailHtmlBody = generateSurveyEmailHtml(customerPhone, surveyData);

  try {
    const { data, error } = await resendClient.emails.send({
      from: EMAIL_CONFIG.FROM_ADDRESS,
      to: EMAIL_CONFIG.SALES_TEAM_LIST,
      subject: emailSubject,
      html: emailHtmlBody,
    });

    if (error) {
      throw error;
    }

    emailNotificationsTotal.inc({ status: 'success' });
    logger.info({ messageId: data?.id }, `Enriched email sent successfully via Resend.`);
  } catch (error) {
    emailNotificationsTotal.inc({ status: 'failed' });
    apiErrorsTotal.inc({ service: 'resend' });
    const apiError = new ApiError('Resend', error);
    logger.error(apiError, 'Failed to send email via Resend');
  }
};
