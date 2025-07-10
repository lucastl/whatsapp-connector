import { NextFunction, Request, Response } from 'express';

import config from '@/config';
import { AUTH_TOKEN_REASONS } from '@/config/constants';
import logger from '@/infrastructure/logging/logger';
import { invalidAuthTokensTotal } from '@/infrastructure/monitoring/metrics';

export const verifyAsterVoipToken = (req: Request, res: Response, next: NextFunction): void => {
  const authHeader = req.headers.authorization;

  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    logger.warn('Access attempt to AsterVOIP webhook without token or with malformed token');
    invalidAuthTokensTotal.inc({ reason: AUTH_TOKEN_REASONS.MISSING_OR_MALFORMED });
    res.status(401).json({ message: 'Unauthorized: Missing or malformed token' });
    return;
  }

  const token = authHeader.split(' ')[1];

  if (token !== config.astervoipAuthToken) {
    logger.warn('Access attempt to AsterVOIP webhook with invalid token');
    invalidAuthTokensTotal.inc({ reason: AUTH_TOKEN_REASONS.INVALID_TOKEN });
    res.status(403).json({ message: 'Forbidden: Invalid token' });
    return;
  }

  next();
};
