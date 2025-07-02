import { AppError } from './AppError';

describe('AppError', () => {
  const testMessage = 'Test error message';
  const testStatusCode = 400;

  it('should be an instance of Error', () => {
    const error = new AppError(testMessage, testStatusCode);
    expect(error).toBeInstanceOf(Error);
  });

  it('should correctly assign message and statusCode', () => {
    const error = new AppError(testMessage, testStatusCode);
    expect(error.message).toBe(testMessage);
    expect(error.statusCode).toBe(testStatusCode);
  });

  it('should set isOperational to true by default', () => {
    const error = new AppError(testMessage, testStatusCode);
    expect(error.isOperational).toBe(true);
  });

  it('should not have details if not provided', () => {
    const error = new AppError(testMessage, testStatusCode);
    expect(error.details).toBeUndefined();
  });

  it('should correctly assign details when provided', () => {
    const testDetails = { info: 'Additional error information' };
    const error = new AppError(testMessage, testStatusCode, testDetails);
    expect(error.details).toEqual(testDetails);
  });

  it('should correctly assign details even if details is a primitive type', () => {
    const testDetailsPrimitive = 'Just a string detail';
    const error = new AppError(testMessage, testStatusCode, testDetailsPrimitive);
    expect(error.details).toBe(testDetailsPrimitive);
  });

  it('should have a stack trace', () => {
    const error = new AppError(testMessage, testStatusCode);
    expect(error.stack).toBeDefined();
    // Check if the stack trace string contains the class name,
    // indicating Error.captureStackTrace worked as expected.
    expect(error.stack).toContain('AppError');
  });
});
