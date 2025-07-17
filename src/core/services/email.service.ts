import { Resend } from 'resend';

import { EMAIL_CONFIG, SERVICE_NAMES } from '@/config/constants';
import { ApiError } from '@/core/errors/ApiError';
import { SurveyResponse } from '@/core/types/messaging.types';
import logger from '@/infrastructure/logging/logger';
import {
  apiErrorsTotal,
  emailNotificationsTotal,
  externalApiRequestDurationSeconds,
} from '@/infrastructure/monitoring/metrics';

const KEY_MAPPINGS: Record<string, string> = {
  has_fiber: '¿Tiene internet Movistar?',
  mobile_plans: 'Interés en planes de celulares',
  location: 'Ubicación',
};

const getLabelForKey = (key: string): string => {
  return KEY_MAPPINGS[key] || key.replace(/_/g, ' ').replace(/^\w/, (c) => c.toUpperCase());
};

const formatSurveyValue = (key: string, value: unknown): string => {
  if (
    key === 'location' &&
    typeof value === 'object' &&
    value &&
    'latitude' in value &&
    'longitude' in value
  ) {
    const { latitude, longitude } = value as { latitude?: number; longitude?: number };
    return latitude && longitude ? `latitud: ${latitude}, longitud: ${longitude}` : '';
  }
  return value ? String(value) : '';
};

const generateSurveyItemsHtml = (surveyData: SurveyResponse): string => {
  const items = Object.entries(surveyData)
    .map(([key, value]) => {
      const label = getLabelForKey(key);
      const formattedValue = formatSurveyValue(key, value);
      return formattedValue ? `<li><strong>${label}:</strong> ${formattedValue}</li>` : null;
    })
    .filter(Boolean);

  if (items.length === 0) {
    return '<p>El usuario no completó la encuesta de calificación.</p>';
  }

  return `<h2>Respuestas del contacto:</h2><ul>${items.join('')}</ul>`;
};

const generateSurveyEmailHtml = (customerPhone: string, surveyData: SurveyResponse): string => {
  const surveyItemsHtml = generateSurveyItemsHtml(surveyData);

  return `
    <h1>🚀 Nuevo contacto desde WhatsApp</h1>
    <p><strong>Nº de teléfono:</strong> ${customerPhone}</p>
    <hr>
    ${surveyItemsHtml}
    <p><em>Este es un mensaje automático. Por favor, contactar al cliente a la brevedad.</em></p>
  `;
};

export type ResendClient = Pick<Resend, 'emails'>;

export interface IEmailService {
  sendEnrichedEmail(customerPhone: string, surveyData: SurveyResponse): Promise<void>;
}

export const createEmailService = (resendClient: ResendClient): IEmailService => ({
  async sendEnrichedEmail(customerPhone: string, surveyData: SurveyResponse): Promise<void> {
    logger.info(`Preparing enriched email for ${customerPhone}`, { customerPhone });

    const emailSubject = `Nuevo contacto desde WhatsApp: ${customerPhone}`;
    const emailHtmlBody = generateSurveyEmailHtml(customerPhone, surveyData);

    const end = externalApiRequestDurationSeconds.startTimer({ service: SERVICE_NAMES.RESEND });
    try {
      const { data, error } = await resendClient.emails.send({
        from: EMAIL_CONFIG.FROM_ADDRESS,
        to: EMAIL_CONFIG.SALES_TEAM_LIST,
        subject: emailSubject,
        html: emailHtmlBody,
      });

      if (error) {
        throw new ApiError(SERVICE_NAMES.RESEND, error.message);
      }

      emailNotificationsTotal.inc({ status: 'success' });
      logger.info(`Enriched email sent successfully via Resend for ${customerPhone}`, {
        messageId: data?.id,
        customerPhone,
      });
    } catch (error) {
      emailNotificationsTotal.inc({ status: 'failed' });
      apiErrorsTotal.inc({ service: SERVICE_NAMES.RESEND });

      const errorMessage =
        error instanceof ApiError ? error.message : 'Failed to send email via Resend';
      logger.error(errorMessage, {
        error,
        customerPhone,
        service: SERVICE_NAMES.RESEND,
      });
    } finally {
      end();
    }
  },
});
