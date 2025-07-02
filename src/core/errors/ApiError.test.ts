import { ApiError } from '@/core/errors/ApiError';
import { AppError } from '@/core/errors/AppError';

describe('ApiError', () => {
  const apiName = 'TestAPI';

  it('should be an instance of AppError and Error', () => {
    const error = new ApiError(apiName, new Error('Original error'));
    expect(error).toBeInstanceOf(ApiError);
    expect(error).toBeInstanceOf(AppError);
    expect(error).toBeInstanceOf(Error);
  });

  it('should correctly parse an error with a structured response and ApiErrorPayload', () => {
    const originalError = {
      response: {
        status: 404,
        data: {
          error: {
            message: 'Resource not found',
            type: 'NotFound',
            code: 123,
          },
        },
      },
      message: 'Request failed with status code 404', // This should be overridden by response.data.error.message
    };
    const apiError = new ApiError(apiName, originalError);

    expect(apiError.message).toBe(
      `Error communicating with the ${apiName} API: Resource not found`,
    );
    expect(apiError.statusCode).toBe(404);
    expect(apiError.originalError).toBe(originalError);
    expect(apiError.details).toEqual(originalError.response.data);
  });

  it('should use originalError.message if response.data is not ApiErrorPayload', () => {
    const originalError = {
      response: {
        status: 400,
        data: { someOtherError: 'Invalid input' }, // Not ApiErrorPayload
      },
      message: 'Bad Request from API',
    };
    const apiError = new ApiError(apiName, originalError);

    expect(apiError.message).toBe(
      `Error communicating with the ${apiName} API: Bad Request from API`,
    );
    expect(apiError.statusCode).toBe(400);
    expect(apiError.originalError).toBe(originalError);
    expect(apiError.details).toEqual(originalError.response.data);
  });

  it('should use default status 500 if response.status is not present', () => {
    const originalError = {
      response: {
        // No status here
        data: {
          error: { message: 'Specific API message' },
        },
      },
      message: 'Some generic error',
    };
    const apiError = new ApiError(apiName, originalError);

    expect(apiError.message).toBe(
      `Error communicating with the ${apiName} API: Specific API message`,
    );
    expect(apiError.statusCode).toBe(500);
    expect(apiError.originalError).toBe(originalError);
    expect(apiError.details).toEqual(originalError.response.data);
  });

  it('should handle a simple Error object as originalError', () => {
    const originalErrorMessage = 'Simple error occurred';
    const originalError = new Error(originalErrorMessage);
    const apiError = new ApiError(apiName, originalError);

    expect(apiError.message).toBe(
      `Error communicating with the ${apiName} API: ${originalErrorMessage}`,
    );
    expect(apiError.statusCode).toBe(500); // Default status code
    expect(apiError.originalError).toBe(originalError);
    expect(apiError.details).toBeUndefined();
  });

  it('should handle an object with only a message property as originalError', () => {
    const originalErrorMessage = 'Custom object error message';
    const originalError = { message: originalErrorMessage };
    const apiError = new ApiError(apiName, originalError);

    expect(apiError.message).toBe(
      `Error communicating with the ${apiName} API: ${originalErrorMessage}`,
    );
    expect(apiError.statusCode).toBe(500);
    expect(apiError.originalError).toBe(originalError);
    expect(apiError.details).toBeUndefined();
  });

  it('should use "An unknown error occurred" if no message can be extracted', () => {
    const originalError = { someUnrelatedProperty: 'value' }; // No message, no response.data.error.message
    const apiError = new ApiError(apiName, originalError);

    expect(apiError.message).toBe(
      `Error communicating with the ${apiName} API: An unknown error occurred`,
    );
    expect(apiError.statusCode).toBe(500);
    expect(apiError.originalError).toBe(originalError);
    expect(apiError.details).toBeUndefined();
  });

  it('should handle originalError being null', () => {
    const apiError = new ApiError(apiName, null);

    expect(apiError.message).toBe(
      `Error communicating with the ${apiName} API: An unknown error occurred`,
    );
    expect(apiError.statusCode).toBe(500);
    expect(apiError.originalError).toBeNull();
    expect(apiError.details).toBeUndefined();
  });

  it('should handle originalError being undefined', () => {
    const apiError = new ApiError(apiName, undefined);

    expect(apiError.message).toBe(
      `Error communicating with the ${apiName} API: An unknown error occurred`,
    );
    expect(apiError.statusCode).toBe(500);
    expect(apiError.originalError).toBeUndefined();
    expect(apiError.details).toBeUndefined();
  });

  it('should prioritize ApiErrorPayload message over originalError.message when both exist', () => {
    const originalError = {
      response: {
        status: 403,
        data: {
          error: { message: 'Forbidden by API policy' },
        },
      },
      message: 'This message should be ignored',
    };
    const apiError = new ApiError(apiName, originalError);

    expect(apiError.message).toBe(
      `Error communicating with the ${apiName} API: Forbidden by API policy`,
    );
    expect(apiError.statusCode).toBe(403);
    expect(apiError.originalError).toBe(originalError);
    expect(apiError.details).toEqual(originalError.response.data);
  });
});
