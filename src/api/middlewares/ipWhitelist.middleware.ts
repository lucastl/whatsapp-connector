import { NextFunction, Request, Response } from 'express';

import config from '@/config';
import { AppError } from '@/core/errors/AppError';
import { blockedIpsTotal } from '@/infrastructure/monitoring/metrics';

export const ipWhitelistMiddleware = (req: Request, _res: Response, next: NextFunction) => {
  if (process.env.NODE_ENV !== 'production') {
    return next();
  }

  const rawAllowedIps = config.security.allowedIps;
  const clientIp = req.ip;

  if (!rawAllowedIps || rawAllowedIps.trim() === '') {
    return next();
  }

  const allowedIps = rawAllowedIps.split(',');

  if (clientIp && !allowedIps.includes(clientIp)) {
    req.log.warn(`Access blocked for the IP: ${clientIp}`);
    blockedIpsTotal.inc({ ip: clientIp });
    return next(new AppError('Access prohibited: Unauthorized IP', 403));
  }

  next();
};
