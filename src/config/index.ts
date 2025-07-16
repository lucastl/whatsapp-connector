import { META_API_BASE_URL } from './constants';
import { env } from './env.validation';

const config = {
  port: env.PORT,
  messagingProvider: env.MESSAGING_PROVIDER,
  astervoipAuthToken: env.ASTERVOIP_AUTH_TOKEN,
  whatsapp: {
    apiToken: env.WHATSAPP_API_TOKEN,
    phoneNumberId: env.WHATSAPP_PHONE_NUMBER_ID,
    verifyToken: env.WHATSAPP_VERIFY_TOKEN,
    apiBaseUrl: META_API_BASE_URL,
  },
  twilio: {
    accountSid: env.TWILIO_ACCOUNT_SID,
    authToken: env.TWILIO_AUTH_TOKEN,
    whatsappNumber: env.TWILIO_WHATSAPP_NUMBER,
    templateSid: env.TWILIO_TEMPLATE_SID,
    xToken: env.TWILIO_X_TOKEN,
  },
  resend: {
    apiKey: env.RESEND_API_KEY,
  },
  security: {
    allowedIps: env.ALLOWED_IPS,
  },
};

export default config;
