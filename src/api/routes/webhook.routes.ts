import { Router } from 'express';

import {
  handleAsterVoipTrigger,
  handleWhatsappWebhook,
  verifyWhatsappWebhook,
} from '@/api/controllers/webhook.controller';
import { verifyAsterVoipToken } from '@/api/middlewares/auth.middleware';

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
webhookRouter.get('/whatsapp', verifyWhatsappWebhook);

export default webhookRouter;
