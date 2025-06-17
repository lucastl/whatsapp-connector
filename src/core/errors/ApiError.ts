import { AppError } from './AppError';

export class ApiError extends AppError {
  public readonly originalError: any;

  constructor(apiName: string, originalError: any) {
    const statusCode = originalError.response?.status || 500;
    const message = `Error al comunicarse con la API de ${apiName}.`;
    
    super(message, statusCode, originalError.response?.data);
    this.stack = originalError.stack;
    this.originalError = originalError;
  }
}