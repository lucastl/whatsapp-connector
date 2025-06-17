import { AppError } from './AppError';

export class ApiError extends AppError {
  public readonly originalError: any;

  constructor(apiName: string, originalError: any) {
    const statusCode = originalError.response?.status || 500;
    const message = `Error communicating with the ${apiName} API.`;
    
    super(message, statusCode, originalError.response?.data);
    this.stack = originalError.stack;
    this.originalError = originalError;
  }
}