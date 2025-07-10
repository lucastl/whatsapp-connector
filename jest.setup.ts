// jest.setup.ts

process.env.ASTERVOIP_AUTH_TOKEN = 'test-token';
process.env.RESEND_API_KEY = 'test-resend-key';

// Variables para el proveedor "meta"
process.env.WHATSAPP_API_TOKEN = 'test-whatsapp-token';
process.env.WHATSAPP_PHONE_NUMBER_ID = 'test-phone-id';
process.env.WHATSAPP_VERIFY_TOKEN = 'test-verify-token';

// Variables para el proveedor "twilio"
process.env.TWILIO_ACCOUNT_SID = 'test-twilio-sid';
process.env.TWILIO_AUTH_TOKEN = 'test-twilio-token';
process.env.TWILIO_WHATSAPP_NUMBER = 'whatsapp:+12345';
process.env.TWILIO_TEMPLATE_SID = 'test-template-sid';
