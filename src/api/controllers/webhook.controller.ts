import { Request, Response } from 'express';
import config from '../../config';
import { handleIncomingWhatsappMessage, triggerWhatsappFlow } from '../../core/services/whatsapp.service';
import { asterVoipTriggerSchema } from '../validators/webhook.validator';

export const handleAsterVoipTrigger = async (req: Request, res: Response): Promise<void> => {
  req.log.info('AsterVOIP trigger received');

  const validationResult = asterVoipTriggerSchema.safeParse(req.body);

  if (!validationResult.success) {
    req.log.warn({ errors: validationResult.error.issues }, 'Invalid request body from AsterVOIP');
    res.status(400).json({ error: 'Invalid request body', details: validationResult.error.issues });
    return;
  }

  const { customerPhone } = validationResult.data;

  try {
    await triggerWhatsappFlow(customerPhone);
    req.log.info(`WhatsApp Flow trigger initiated for customer: ${customerPhone}`);
    res.status(202).json({ message: 'Accepted: WhatsApp Flow trigger initiated.' });
  } catch (error) {
    req.log.error(error, 'Failed to trigger WhatsApp Flow');
    res.status(500).json({ error: 'Internal Server Error' });
  }
};

export const handleWhatsappWebhook = (req: Request, res: Response): void => {
  req.log.info('WhatsApp webhook event received');
  
  handleIncomingWhatsappMessage(req.body);

  res.sendStatus(200);
};

export const verifyWhatsappWebhook = (req: Request, res: Response): void => {
  const mode = req.query['hub.mode'];
  const token = req.query['hub.verify_token'];
  const challenge = req.query['hub.challenge'];

  if (mode && token && mode === 'subscribe' && token === config.whatsapp.verifyToken) {
    req.log.info('WhatsApp webhook verified successfully!');
    res.status(200).send(challenge);
  } else {
    req.log.error('Failed to verify WhatsApp webhook.');
    res.sendStatus(403);
  }
};