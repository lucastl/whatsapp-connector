import { Resend } from 'resend';
import config from '../../config';
import logger from '../../infrastructure/logging/logger';
import { ApiError } from '../errors/ApiError';
import { EMAIL_CONFIG } from '../../config/constants';
import { FlowResponse } from '../types/whatsapp.types';
import { resendClient } from '../../infrastructure/email/resend.client';

export const sendEnrichedEmail = async (
  customerPhone: string,
  surveyData: FlowResponse,
): Promise<void> => {
  logger.info(`Preparing enriched email via Resend for ${customerPhone}`);

  const emailSubject = `Nuevo Lead Calificado de WhatsApp: ${customerPhone}`;

  let emailHtmlBody = `
      <h1>🚀 Nuevo Lead Calificado de WhatsApp</h1>
      <p><strong>Teléfono del Cliente:</strong> ${customerPhone}</p>
      <hr>
      <h2>Resultados de la Encuesta:</h2>
      <ul>
  `;
  for (const [key, value] of Object.entries(surveyData)) {
    emailHtmlBody += `<li><strong>${key.replace(/_/g, ' ')}:</strong> ${value}</li>`;
  }
  emailHtmlBody += `</ul><p><em>Este es un mensaje automático. Por favor, contactar al cliente a la brevedad.</em></p>`;

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

    logger.info({ messageId: data?.id }, `Enriched email sent successfully via Resend.`);
  } catch (error) {
    const apiError = new ApiError('Resend', error);
    logger.error(apiError, 'Failed to send email via Resend');
  }
};
