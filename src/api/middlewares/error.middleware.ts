import { Request, Response, NextFunction } from 'express';
import { AppError } from '../../core/errors/AppError';

export const globalErrorHandler = (
  err: Error | AppError,
  req: Request,
  res: Response,
  next: NextFunction,
): void => {
  req.log.error(err, 'An error occurred in the request lifecycle');

  if (err instanceof AppError && err.isOperational) {
    res.status(err.statusCode).json({
      status: 'error',
      message: err.message,
      ...(err.details && { details: err.details }),
    });
  } else {
    res.status(500).json({
      status: 'error',
      message: 'Ocurrió un error interno inesperado en el servidor.',
    });
  }
};
