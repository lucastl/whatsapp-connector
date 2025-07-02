import { NextFunction, Request, Response } from 'express';

import { AppError } from '@/core/errors/AppError';

export const globalErrorHandler = (
  err: Error | AppError,
  req: Request,
  res: Response,
  _next: NextFunction,
): void => {
  req.log.error(err, 'An error occurred in the request lifecycle');

  if (err instanceof AppError && err.isOperational) {
    res.status(err.statusCode).json({
      status: 'error',
      message: err.message,
      ...(typeof err.details === 'object' && err.details !== null ? { details: err.details } : {}),
    });
  } else {
    res.status(500).json({
      status: 'error',
      message: 'An unexpected internal server error occurred.',
    });
  }
};
