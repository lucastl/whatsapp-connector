import twilio from 'twilio';

import config from '@/config';

const { accountSid, authToken, phoneNumber } = config.twilio;

if (!accountSid || !authToken || !phoneNumber) {
    throw new Error('Missing required Twilio configuration. Ensure TWILIO_ACCOUNT_SID, TWILIO_AUTH_TOKEN, and TWILIO_PHONE_NUMBER are set in environment variables.');
}

export const twilioClient = twilio(accountSid, authToken);
