import { Resend } from 'resend';
import config from '../../config';
import logger from '../../infrastructure/logging/logger';

const resend = new Resend(config.resend.apiKey);

interface SurveyResponse {
  [key: string]: any;
}

export const sendEnrichedEmail = async (customerPhone: string, surveyData: SurveyResponse): Promise<void> => {
  logger.info(`Sending enriched email via Resend for ${customerPhone}`);

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
    const { data, error } = await resend.emails.send({
      from: 'Sistema de Alertas <onboarding@resend.dev>', // TODO: Change to a real sender email with a verified domain
      to: ['lucastosellolatini@gmail.com'],
      subject: emailSubject,
      html: emailHtmlBody,
    });

    if (error) {
      logger.error({ error }, 'Failed to send email via Resend');
      throw new Error('Resend API error');
    }

    logger.info({ messageId: data?.id }, `Enriched email sent successfully via Resend.`);

  } catch (error) {
    logger.error(error, 'An unexpected error occurred while sending email.');
  }
};
