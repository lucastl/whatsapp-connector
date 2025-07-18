import { z } from 'zod';

import {
  MESSAGING_INTERACTIVE_TYPES,
  MESSAGING_PREFIXES,
  MESSAGING_TYPES,
} from '@/config/constants';

export const asterVoipTriggerSchema = z.object({
  customerPhone: z.string().min(10, { message: 'Phone number must be at least 10 digits' }),
});

export const metaWebhookVerificationSchema = z.object({
  'hub.mode': z.string(),
  'hub.verify_token': z.string(),
  'hub.challenge': z.string(),
});

export const whatsappFlowResponseSchema = z.object({
  object: z.literal('whatsapp_business_account'),
  entry: z.array(
    z.object({
      changes: z.array(
        z.object({
          field: z.literal('messages'),
          value: z.object({
            messages: z.array(
              z.object({
                from: z.string(),
                type: z.literal(MESSAGING_TYPES.INTERACTIVE),
                interactive: z.object({
                  type: z.literal(MESSAGING_INTERACTIVE_TYPES.META_NFM_REPLY),
                  nfm_reply: z.object({
                    response_json: z.string(),
                  }),
                }),
              }),
            ),
          }),
        }),
      ),
    }),
  ),
});

export const twilioStatusCallbackSchema = z.object({
  MessageSid: z.string(),
  MessageStatus: z.string(), // e.g., 'queued', 'sent', 'delivered', 'failed'
  To: z.string(),
  From: z.string(),
  ErrorCode: z.union([z.string(), z.number()]).optional(),
  ErrorMessage: z.string().optional(),
});

export const twilioWebhookSchema = z.object({
  customerPhone: z.string(),
  user_step: z.string().optional(),
  surveyResponse: z.object({
    has_fiber: z.string().optional(),
    mobile_plans: z.string().optional(),
    location: z
      .object({
        latitude: z.string(),
        longitude: z.string(),
      })
      .optional()
      .transform((location) => {
        if (!location) return undefined;
        const lat = parseFloat(location.latitude);
        const lon = parseFloat(location.longitude);
        if (isNaN(lat) || isNaN(lon)) return undefined;
        return { latitude: lat, longitude: lon };
      }),
  }),
});
