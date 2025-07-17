import { Twilio } from 'twilio';

import {
  twilioStatusCallbackSchema,
  twilioWebhookSchema,
  whatsappFlowResponseSchema,
} from '@/api/validators/webhook.validator';
import config from '@/config';
import {
  MESSAGING_TYPES,
  META_TEMPLATE_NAME,
  METRIC_STATUS,
  SERVICE_NAMES,
} from '@/config/constants';
import { ApiError } from '@/core/errors/ApiError';
import { AppError } from '@/core/errors/AppError';
import { MetaWebhookPayload } from '@/core/types/messaging.types';
import logger from '@/infrastructure/logging/logger';
import {
  apiErrorsTotal,
  externalApiRequestDurationSeconds,
  messagingFlowsCompleted,
  messagingFlowsProcessingErrors,
  messagingInvalidPayloadsTotal,
  messagingStatusUpdatesTotal,
  messagingTemplatesSentTotal,
} from '@/infrastructure/monitoring/metrics';
import { IWhatsappHttpClient } from '@/infrastructure/providers/meta/whatsapp.httpClient';

import { IEmailService } from './email.service';

const META_MESSAGES_ENDPOINT = `/${config.whatsapp.phoneNumberId}/messages`;

export type TwilioClient = Twilio | null;

export interface IMessagingService {
  triggerSurveyTemplate(customerPhone: string): Promise<void>;
  handleIncomingMetaMessage(payload: MetaWebhookPayload): void;
  handleTwilioStatusUpdate(payload: unknown): void;
  handleIncomingTwilioSurvey(payload: unknown): Promise<void>;
}

export const createMessagingService = (
  emailService: IEmailService,
  whatsappHttpClient: IWhatsappHttpClient,
  twilioClient: TwilioClient,
): IMessagingService => {
  const _sendWithMeta = async (customerPhone: string) => {
    const payload = {
      messaging_product: 'whatsapp',
      to: customerPhone,
      type: MESSAGING_TYPES.TEMPLATE,
      template: {
        name: META_TEMPLATE_NAME,
        language: { code: 'es_AR' },
      },
    };
    logger.info({ payload }, `Sending template via Meta to ${customerPhone}`);
    await whatsappHttpClient.post(META_MESSAGES_ENDPOINT, payload);
  };

  const _sendWithTwilio = async (customerPhone: string) => {
    if (!twilioClient || !config.twilio.whatsappNumber) {
      throw new AppError(`${SERVICE_NAMES.TWILIO} client is not configured correctly.`, 500);
    }

    const payload = {
      contentSid: config.twilio.templateSid,
      from: config.twilio.whatsappNumber,
      to: `whatsapp:${customerPhone}`,
    };

    logger.info({ payload }, `Sending template via Twilio to ${customerPhone}`);

    const end = externalApiRequestDurationSeconds.startTimer({ service: SERVICE_NAMES.TWILIO });

    try {
      await twilioClient.messages.create(payload);
    } finally {
      end();
    }
  };

  return {
    async triggerSurveyTemplate(customerPhone: string): Promise<void> {
      const provider = config.messagingProvider;
      logger.info(`Sending survey template to ${customerPhone} using provider: ${provider}`);

      try {
        if (provider === SERVICE_NAMES.TWILIO) {
          await _sendWithTwilio(customerPhone);
        } else {
          await _sendWithMeta(customerPhone);
        }
        messagingTemplatesSentTotal.inc({ provider });
        logger.info(`Template sent successfully to ${customerPhone} via ${provider}`);
      } catch (error) {
        const serviceName =
          provider === SERVICE_NAMES.TWILIO ? SERVICE_NAMES.TWILIO : SERVICE_NAMES.META;
        apiErrorsTotal.inc({ service: serviceName.toLowerCase() });
        throw new ApiError(serviceName, error);
      }
    },

    handleIncomingMetaMessage(payload: MetaWebhookPayload): void {
      try {
        const validationResult = whatsappFlowResponseSchema.safeParse(payload);
        if (!validationResult.success) {
          logger.warn(
            { errors: validationResult.error.format() },
            'Invalid Meta webhook payload received',
          );
          messagingInvalidPayloadsTotal.inc({ provider: SERVICE_NAMES.META });
          return;
        }
        const message = validationResult.data.entry[0].changes[0].value.messages[0];
        const customerPhone = message.from;
        const flowResponse = JSON.parse(message.interactive.nfm_reply.response_json);

        logger.info({ customerPhone, flowResponse }, 'Flow response received and validated');
        messagingFlowsCompleted.inc({ provider: SERVICE_NAMES.META });
        emailService.sendEnrichedEmail(customerPhone, flowResponse);
      } catch (error) {
        messagingFlowsProcessingErrors.inc({ provider: SERVICE_NAMES.META });
        logger.error(error, 'Error processing incoming Meta message. Payload will be ignored.');
      }
    },

    handleTwilioStatusUpdate(payload: unknown): void {
      const validationResult = twilioStatusCallbackSchema.safeParse(payload);

      if (!validationResult.success) {
        logger.warn(
          { errors: validationResult.error.format() },
          'Invalid Twilio status callback received',
        );
        return;
      }

      const { MessageSid, MessageStatus, ErrorCode, ErrorMessage } = validationResult.data;

      messagingStatusUpdatesTotal.inc({ provider: SERVICE_NAMES.TWILIO, status: MessageStatus });

      if (MessageStatus === METRIC_STATUS.FAILED || MessageStatus === METRIC_STATUS.UNDELIVERED) {
        logger.error({ MessageSid, ErrorCode, ErrorMessage }, 'Message delivery failed');
      } else {
        logger.info(
          { MessageSid, status: MessageStatus },
          'Received message status update from Twilio',
        );
      }
    },

    async handleIncomingTwilioSurvey(payload: unknown): Promise<void> {
      const validationResult = twilioWebhookSchema.safeParse(payload);

      if (!validationResult.success) {
        logger.warn(
          { errors: validationResult.error.format() },
          'Invalid Twilio Studio webhook payload received',
        );
        messagingInvalidPayloadsTotal.inc({ provider: SERVICE_NAMES.TWILIO });
        return;
      }

      const { customerPhone: phoneWithPrefix, surveyResponse, user_step } = validationResult.data;
      const customerPhone = phoneWithPrefix.replace('whatsapp:+', '');

      try {
        logger.info(
          { customerPhone, surveyResponse },
          'Twilio Studio response received and validated',
        );

        messagingFlowsCompleted.inc({
          provider: SERVICE_NAMES.TWILIO,
          step: user_step || 'unknown',
        });
        await emailService.sendEnrichedEmail(customerPhone, surveyResponse);
      } catch (error) {
        messagingFlowsProcessingErrors.inc({ provider: SERVICE_NAMES.TWILIO });
        logger.error(error, 'Error processing incoming Twilio Studio message.');
      }
    },
  };
};
