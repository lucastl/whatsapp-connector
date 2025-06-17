import { AppError } from './AppError';

interface ApiErrorPayload {
  error: {
    message: string;
    type?: string;
    code?: number;
    fbtrace_id?: string;
    [key: string]: any;
  };
}

export class ApiError extends AppError {
  public readonly originalError: any;

  constructor(apiName: string, originalError: any) {
    const statusCode = originalError.response?.status || 500;
    const errorData: ApiErrorPayload | undefined = originalError.response?.data;
    const message = `Error communicating with the ${apiName} API: ${errorData?.error?.message || originalError.message}`;

    super(message, statusCode, errorData);
    this.originalError = originalError;
  }
}
