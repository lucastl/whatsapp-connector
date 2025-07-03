import { NextFunction, Request, Response } from 'express';

import { httpRequestDurationMicroseconds } from '@/infrastructure/monitoring/metrics';

export const metricsMiddleware = (req: Request, res: Response, next: NextFunction) => {
  const end = httpRequestDurationMicroseconds.startTimer();
  res.on('finish', () => {
    end({ method: req.method, route: req.route?.path || req.path, code: res.statusCode });
  });
  next();
};
