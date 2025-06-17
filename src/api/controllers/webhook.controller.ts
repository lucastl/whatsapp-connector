import { Request, Response, NextFunction } from 'express';
import config from '../../config';
import {
  handleIncomingWhatsappMessage,
  triggerWhatsappFlow,
} from '../../core/services/whatsapp.service';
import { asterVoipTriggerSchema } from '../validators/webhook.validator';
import { AppError } from '../../core/errors/AppError';

/**
 * Maneja el trigger de AsterVOIP.
 * Nota: Añadimos 'next' para pasar los errores al middleware global.
 */
export const handleAsterVoipTrigger = async (
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<Response | void> => {
  try {
    req.log.info('AsterVOIP trigger received');

    const validationResult = asterVoipTriggerSchema.safeParse(req.body);
    if (!validationResult.success) {
      throw new AppError(
        'El cuerpo de la petición contiene datos inválidos.',
        400,
        validationResult.error.format(),
      );
    }

    const { customerPhone } = validationResult.data;
    await triggerWhatsappFlow(customerPhone);

    req.log.info(`WhatsApp Flow trigger initiated for customer: ${customerPhone}`);

    return res.status(202).json({ message: 'Accepted: WhatsApp Flow trigger initiated.' });
  } catch (error) {
    next(error);
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
