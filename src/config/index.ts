import dotenv from 'dotenv';

dotenv.config();

const config = {
  port: process.env.PORT || 3000,
  astervoipAuthToken: process.env.ASTERVOIP_AUTH_TOKEN,
  whatsapp: {
    apiToken: process.env.WHATSAPP_API_TOKEN,
    phoneNumberId: process.env.WHATSAPP_PHONE_NUMBER_ID,
    verifyToken: process.env.WHATSAPP_VERIFY_TOKEN,
  },
  resend: {
    apiKey: process.env.RESEND_API_KEY,
  }
};

export default config;
