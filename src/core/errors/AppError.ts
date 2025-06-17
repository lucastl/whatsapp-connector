// src/core/errors/AppError.ts
// Los errores operacionales son problemas conocidos que pueden ocurrir (ej: entrada de usuario inválida),
// a diferencia de los errores de programación (bugs).
export class AppError extends Error {
  public readonly statusCode: number;
  public readonly isOperational: boolean;

  constructor(message: string, statusCode: number) {
    super(message);
    this.statusCode = statusCode;
    this.isOperational = true; // Marcamos este error como un problema operacional, no un bug.

    // Mantenemos el stack trace correcto para esta clase de error
    Error.captureStackTrace(this, this.constructor);
  }
}