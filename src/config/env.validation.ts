import { z } from 'zod';

import { SERVICE_NAMES } from './constants';

const envSchema = z
  .object({
    PORT: z.coerce.number().int().positive().default(3000),
    MESSAGING_PROVIDER: z
      .enum([SERVICE_NAMES.META, SERVICE_NAMES.TWILIO])
      .default(SERVICE_NAMES.META),
    ASTERVOIP_AUTH_TOKEN: z.string().min(1),
    RESEND_API_KEY: z.string().min(1),
    ALLOWED_IPS: z.string().optional(),

    // Meta specific
    WHATSAPP_API_TOKEN: z.string().optional(),
    WHATSAPP_PHONE_NUMBER_ID: z.string().optional(),
    WHATSAPP_VERIFY_TOKEN: z.string().optional(),

    // Twilio specific
    TWILIO_ACCOUNT_SID: z.string().optional(),
    TWILIO_AUTH_TOKEN: z.string().optional(),
    TWILIO_WHATSAPP_NUMBER: z.string().optional(),
    TWILIO_TEMPLATE_SID: z.string().optional(),
    TWILIO_X_TOKEN: z.string().optional(),
  })
  .refine(
    (data) => {
      if (data.MESSAGING_PROVIDER === 'meta') {
        return (
          !!data.WHATSAPP_API_TOKEN &&
          !!data.WHATSAPP_PHONE_NUMBER_ID &&
          !!data.WHATSAPP_VERIFY_TOKEN
        );
      }
      return true;
    },
    {
      message: `El proveedor "${SERVICE_NAMES.META}" requiere WHATSAPP_API_TOKEN, WHATSAPP_PHONE_NUMBER_ID, y WHATSAPP_VERIFY_TOKEN`,
      path: ['MESSAGING_PROVIDER'],
    },
  )
  .refine(
    (data) => {
      if (data.MESSAGING_PROVIDER === 'twilio') {
        return (
          !!data.TWILIO_ACCOUNT_SID &&
          !!data.TWILIO_AUTH_TOKEN &&
          !!data.TWILIO_WHATSAPP_NUMBER &&
          !!data.TWILIO_TEMPLATE_SID &&
          !!data.TWILIO_X_TOKEN
        );
      }
      return true;
    },
    {
      message: `El proveedor "${SERVICE_NAMES.TWILIO}" requiere TWILIO_ACCOUNT_SID, TWILIO_AUTH_TOKEN, TWILIO_WHATSAPP_NUMBER, TWILIO_TEMPLATE_SID, y TWILIO_X_TOKEN`,
      path: ['MESSAGING_PROVIDER'],
    },
  );

const parsedEnv = envSchema.safeParse(process.env);

if (!parsedEnv.success) {
  console.error(
    '❌ Variables de entorno inválidas:',
    JSON.stringify(parsedEnv.error.flatten().fieldErrors, null, 2),
  );
  if (process.env.NODE_ENV !== 'test') {
    process.exit(1);
  } else {
    // En modo test, lanzamos un error para que Jest lo capture, en lugar de salir.
    throw new Error('Falló la validación de variables de entorno durante la prueba.');
  }
}

export const env = parsedEnv.data;
