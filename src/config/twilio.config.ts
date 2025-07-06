const accountSid = process.env.TWILIO_ACCOUNT_SID;
const authToken = process.env.TWILIO_AUTH_TOKEN;
const twilioWhatsappNumber = process.env.TWILIO_WHATSAPP_NUMBER;

if (!accountSid || !authToken || !twilioWhatsappNumber) {
  throw new Error(
    'Faltan las credenciales de Twilio. Asegúrate de que TWILIO_ACCOUNT_SID, TWILIO_AUTH_TOKEN y TWILIO_WHATSAPP_NUMBER estén configuradas en las variables de entorno.',
  );
}

export const TwilioConfig = {
  accountSid,
  authToken,
  twilioWhatsappNumber,
};
