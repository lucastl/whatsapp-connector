import { Router } from 'express';

import {
  handleAsterVoipTrigger,
  handleTwilioStatusWebhook,
  handleTwilioSurveyWebhook,
  handleWhatsappWebhook,
  verifyMetaWebhook,
} from '@/api/controllers/webhook.controller';
import { verifyAsterVoipToken, verifyTwilioToken } from '@/api/middlewares/auth.middleware';

const webhookRouter = Router();

/**
 * @route   POST /api/v1/webhooks/astervoip-trigger
 * @desc    Endpoint that receives the trigger from AsterVOIP
 * @access  Private (requires authentication token)
 */
webhookRouter.post('/astervoip-trigger', verifyAsterVoipToken, handleAsterVoipTrigger);

/**
 * @route   POST /api/v1/webhooks/whatsapp
 * @desc    Endpoint that receives events from the WhatsApp API (Flow responses)
 * @access  Public
 */
webhookRouter.post('/whatsapp', handleWhatsappWebhook);

/**
 * @route   GET /api/v1/webhooks/whatsapp
 * @desc    Endpoint for the initial webhook verification required by Meta
 * @access  Public
 */
webhookRouter.get('/whatsapp', verifyMetaWebhook);

/**
 * @route   POST /api/v1/webhooks/twilio
 * @desc    Endpoint that receives the final JSON payload from a Twilio Studio Flow.
 * @access  Private (requires authentication token)
 */
webhookRouter.post('/twilio', verifyTwilioToken, handleTwilioSurveyWebhook);

/**
 * @route   POST /api/v1/webhooks/twilio-status
 * @desc    Endpoint that receives status updates from Twilio for sent messages.
 * @access  Public
 */
webhookRouter.post('/twilio-status', handleTwilioStatusWebhook);

export default webhookRouter;
