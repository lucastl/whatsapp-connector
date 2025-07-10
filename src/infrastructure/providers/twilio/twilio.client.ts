import twilio from 'twilio';

import config from '@/config';
import { SERVICE_NAMES } from '@/config/constants';
import { AppError } from '@/core/errors/AppError';

if (
  config.messagingProvider === SERVICE_NAMES.TWILIO &&
  (!config.twilio.accountSid || !config.twilio.authToken)
) {
  throw new AppError('Twilio configuration (accountSid, authToken) is incomplete.', 500);
}

export const twilioClient =
  config.twilio.accountSid && config.twilio.authToken
    ? twilio(config.twilio.accountSid, config.twilio.authToken)
    : null;
