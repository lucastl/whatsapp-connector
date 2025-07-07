import { META_API_BASE_URL } from './constants';

const config = {
  port: parseInt(process.env.PORT || '3000', 10),
  messagingProvider: process.env.MESSAGING_PROVIDER || 'meta',
  astervoipAuthToken: process.env.ASTERVOIP_AUTH_TOKEN,
  whatsapp: {
    apiToken: process.env.WHATSAPP_API_TOKEN,
    phoneNumberId: process.env.WHATSAPP_PHONE_NUMBER_ID,
    verifyToken: process.env.WHATSAPP_VERIFY_TOKEN,
    apiBaseUrl: META_API_BASE_URL,
  },
  twilio: {
    accountSid: process.env.TWILIO_ACCOUNT_SID,
    authToken: process.env.TWILIO_AUTH_TOKEN,
    whatsappNumber: process.env.TWILIO_WHATSAPP_NUMBER,
    templateSid: process.env.TWILIO_TEMPLATE_SID,
  },
  resend: {
    apiKey: process.env.RESEND_API_KEY,
  },
  security: {
    allowedIps: process.env.ALLOWED_IPS,
  },
};

export default config;
