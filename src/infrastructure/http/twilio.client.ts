import twilio from 'twilio';

import config from '@/config';

const { accountSid, authToken, phoneNumber } = config.twilio;

if (!accountSid) {
    throw new Error('Twilio accountSid is not set in environment variables.');
}
if (!authToken) {
    throw new Error('Twilio authToken is not set in environment variables.');
}
if (!phoneNumber) {
    throw new Error('Twilio phoneNumber is not set in environment variables.');
}

export const twilioClient = twilio(accountSid, authToken);
