import { z } from 'zod';

import { WHATSAPP_INTERACTIVE_TYPES, WHATSAPP_MESSAGE_TYPES } from '@/config/constants';

export const asterVoipTriggerSchema = z.object({
  customerPhone: z.string().min(10, { message: 'Phone number must be at least 10 digits' }),
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
                type: z.literal(WHATSAPP_MESSAGE_TYPES.INTERACTIVE),
                interactive: z.object({
                  type: z.literal(WHATSAPP_INTERACTIVE_TYPES.NFM_REPLY),
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
