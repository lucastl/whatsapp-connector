import { AppError } from './AppError';

interface ApiErrorPayload {
  error: {
    message: string;
    type?: string;
    code?: number;
    fbtrace_id?: string;
    [key: string]: unknown;
  };
}

interface OriginalErrorWithResponse {
  response: {
    status?: number;
    data?: unknown;
    [key: string]: unknown;
  };
  [key: string]: unknown;
}

interface OriginalErrorWithMessage {
  message: string;
  [key: string]: unknown;
}

const hasStructuredResponse = (error: unknown): error is OriginalErrorWithResponse => {
  return (
    typeof error === 'object' &&
    error !== null &&
    'response' in error &&
    typeof (error as OriginalErrorWithResponse).response === 'object' &&
    (error as OriginalErrorWithResponse).response !== null
  );
};

const isApiErrorData = (data: unknown): data is ApiErrorPayload => {
  if (typeof data !== 'object' || data === null || !('error' in data)) {
    return false;
  }
  const errorField = (data as { error: unknown }).error;
  return (
    typeof errorField === 'object' &&
    errorField !== null &&
    'message' in errorField &&
    typeof (errorField as { message: unknown }).message === 'string'
  );
};

const hasMessage = (error: unknown): error is OriginalErrorWithMessage => {
  return (
    typeof error === 'object' &&
    error !== null &&
    'message' in error &&
    typeof (error as OriginalErrorWithMessage).message === 'string'
  );
};

export class ApiError extends AppError {
  public readonly originalError: unknown;

  constructor(apiName: string, originalError: unknown) {
    let statusCode = 500;
    let extractedApiMessage: string | undefined;
    let extractedOriginalMessage = '';
    let detailsForSuper: unknown = undefined;

    if (hasStructuredResponse(originalError)) {
      const { response } = originalError;
      if (typeof response.status === 'number') {
        statusCode = response.status;
      }
      detailsForSuper = response.data;

      if (isApiErrorData(response.data)) {
        extractedApiMessage = response.data.error.message;
      }
    }

    if (hasMessage(originalError)) {
      extractedOriginalMessage = originalError.message;
    }

    const errorMessageDetail =
      extractedApiMessage || extractedOriginalMessage || 'An unknown error occurred';
    const message = `Error communicating with the ${apiName} API: ${errorMessageDetail}`;

    super(message, statusCode, detailsForSuper);
    this.originalError = originalError;
  }
}
