// src/api/middlewares/auth.middleware.ts
import { Request, Response, NextFunction } from 'express';
import config from '../../config';
import logger from '../../infrastructure/logging/logger';

export const verifyAsterVoipToken = (
  req: Request,
  res: Response,
  next: NextFunction
): void => {
  const authHeader = req.headers.authorization;

  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    logger.warn('Access attempt to AsterVOIP webhook without token or with malformed token');
    res.status(401).json({ message: 'Unauthorized: Missing or malformed token' });
    return;
  }

  const token = authHeader.split(' ')[1];

  if (token !== config.astervoipAuthToken) {
    logger.warn('Access attempt to AsterVOIP webhook with invalid token');
    res.status(403).json({ message: 'Forbidden: Invalid token' });
    return;
  }

  next();
};