export class AppError extends Error {
  public readonly statusCode: number;
  public readonly isOperational: boolean;
  public readonly details?: any;

  constructor(message: string, statusCode: number, details?: any) {
    super(message);
    this.statusCode = statusCode;
    this.isOperational = true;
    if (details) {
      this.details = details;
    }

    Error.captureStackTrace(this, this.constructor);
  }
}