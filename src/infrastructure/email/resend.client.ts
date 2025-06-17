import { Resend } from 'resend';
import config from '../../config';

export const resendClient = new Resend(config.resend.apiKey);