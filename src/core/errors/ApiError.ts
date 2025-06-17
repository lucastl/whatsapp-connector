// src/core/errors/ApiError.ts
import { AppError } from './AppError';

export class ApiError extends AppError {
  // Opcional: guardar el error original completo para un análisis más profundo.
  // public readonly originalError: any;

  constructor(apiName: string, originalError: any) {
    const statusCode = originalError.response?.status || 500;
    const message = `Error al comunicarse con la API de ${apiName}.`;
    
    super(message, statusCode);
    // Podemos añadir más contexto, que será muy útil para los logs.
    this.stack = originalError.stack;
    // this.originalError = originalError;
  }
}