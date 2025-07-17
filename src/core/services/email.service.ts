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
  have_fiber: '¿Tiene internet Movistar?',
  mobile_plans: 'Interés en planes de celulares',
  location: 'Ubicación',
};

/**
 * Gets a human-readable label for a survey data key.
 * @param key The key of the survey data.
 * @returns A formatted label.
 */
const getLabelForKey = (key: string): string => {
  if (KEY_MAPPINGS[key]) {
    return KEY_MAPPINGS[key];
  }
  return key.replace(/_/g, ' ').replace(/^\w/, (c) => c.toUpperCase());
};

/**
 * Formats a survey data value for display in HTML.
 * @param key The data key, for context-sensitive formatting.
 * @param value The data value.
 * @returns The formatted value as a string.
 */
const formatSurveyValue = (key: string, value: unknown): string => {
  if (
    key === 'location' &&
    typeof value === 'object' &&
    value !== null &&
    'latitude' in value &&
    'longitude' in value
  ) {
    const location = value as { latitude?: number | null; longitude?: number | null };
    if (location.latitude && location.longitude) {
      return `latitud: ${location.latitude}, longitud: ${location.longitude}`;
    }
    return '';
  }

  if (typeof value === 'object' && value !== null) {
    return JSON.stringify(value);
  }

  return String(value);
};

/**
 * Generates the HTML content for the survey notification email.
 * @param customerPhone The customer's phone number.
 * @param surveyData The survey data.
 * @returns The email body in HTML format.
 */
const generateSurveyEmailHtml = (customerPhone: string, surveyData: SurveyResponse): string => {
  const surveyItems = Object.entries(surveyData)
    .map(([key, value]) => {
      const label = getLabelForKey(key);
      const formattedValue = formatSurveyValue(key, value);
      if (formattedValue && formattedValue !== 'null' && formattedValue !== 'undefined') {
        return `<li><strong>${label}:</strong> ${formattedValue}</li>`;
      }
      return null;
    })
    .filter(Boolean)
    .join('');

  return `
      <h1>🚀 Nuevo contacto desde WhatsApp</h1>
      <p><strong>Nº de teléfono:</strong> ${customerPhone}</p>
      <hr>
      <h2>Respuestas del contacto:</h2>
      <ul>${surveyItems}</ul>
      <p><em>Este es un mensaje automático. Por favor, contactar al cliente a la brevedad.</em></p>
  `;
};

export type ResendClient = Pick<Resend, 'emails'>;

export interface IEmailService {
  sendEnrichedEmail(customerPhone: string, surveyData: SurveyResponse): Promise<void>;
}

export const createEmailService = (resendClient: ResendClient): IEmailService => ({
  async sendEnrichedEmail(customerPhone: string, surveyData: SurveyResponse): Promise<void> {
    logger.info(`Preparing enriched email via Resend for ${customerPhone}`);

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
        throw error;
      }

      emailNotificationsTotal.inc({ status: 'success' });
      logger.info({ messageId: data?.id }, `Enriched email sent successfully via Resend.`);
    } catch (error) {
      emailNotificationsTotal.inc({ status: 'failed' });
      apiErrorsTotal.inc({ service: SERVICE_NAMES.RESEND });
      const apiError = new ApiError('Resend', error);
      logger.error(apiError, 'Failed to send email via Resend');
    } finally {
      end();
    }
  },
});
