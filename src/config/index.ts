import { WHATSAPP_API_BASE_URL } from './constants';

const config = {
  port: parseInt(process.env.PORT || '3000', 10),
  astervoipAuthToken: process.env.ASTERVOIP_AUTH_TOKEN,
  whatsapp: {
    apiToken: process.env.WHATSAPP_API_TOKEN,
    phoneNumberId: process.env.WHATSAPP_PHONE_NUMBER_ID,
    verifyToken: process.env.WHATSAPP_VERIFY_TOKEN,
    apiBaseUrl: WHATSAPP_API_BASE_URL,
  },
  resend: {
    apiKey: process.env.RESEND_API_KEY,
  },
  security: {
    allowedIps: process.env.ALLOWED_IPS,
  },
};

export default config;
