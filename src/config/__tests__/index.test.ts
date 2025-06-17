jest.mock('dotenv', () => ({
  config: jest.fn(),
}));

describe('Config Module', () => {
  const ORIGINAL_ENV = process.env;
  let mockDotenvConfig: jest.Mock;

  beforeEach(() => {
    jest.resetModules();
    process.env = { ...ORIGINAL_ENV };

    mockDotenvConfig = require('dotenv').config;
    mockDotenvConfig.mockClear();
  });

  afterAll(() => {
    process.env = ORIGINAL_ENV;
  });

  it('should call dotenv.config() if NODE_ENV is "test"', () => {
    process.env.NODE_ENV = 'test';
    require('../index');
    expect(mockDotenvConfig).toHaveBeenCalled();
  });

  it('should not call dotenv.config() if NODE_ENV is not "test"', () => {
    process.env.NODE_ENV = 'development';

    require('../index');
    expect(mockDotenvConfig).not.toHaveBeenCalled();
  });

  it('should load and parse environment variables correctly', () => {
    process.env.PORT = '3001';
    process.env.ASTERVOIP_AUTH_TOKEN = 'test-aster-token';
    process.env.WHATSAPP_API_TOKEN = 'test-wa-api-token';
    process.env.WHATSAPP_PHONE_NUMBER_ID = 'test-wa-phone-id';
    process.env.WHATSAPP_VERIFY_TOKEN = 'test-wa-verify-token';
    process.env.RESEND_API_KEY = 'test-resend-key';
    process.env.EMAIL_FROM_ADDRESS = 'from@example.com';
    process.env.EMAIL_TO_ADDRESSES = 'to1@example.com,to2@example.com';
    process.env.NODE_ENV = 'test'; 

    const loadedConfig = require('../index').default;

    expect(loadedConfig.port).toBe(3001);
    expect(loadedConfig.astervoipAuthToken).toBe('test-aster-token');
    expect(loadedConfig.whatsapp.apiToken).toBe('test-wa-api-token');
    expect(loadedConfig.whatsapp.phoneNumberId).toBe('test-wa-phone-id');
    expect(loadedConfig.whatsapp.verifyToken).toBe('test-wa-verify-token');
    expect(loadedConfig.resend.apiKey).toBe('test-resend-key');
  });
});