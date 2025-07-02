// Import the client that is being tested.
// This import needs to happen AFTER jest.mock calls are defined,
// but Jest hoists jest.mock, so it's generally fine at the top.
const mockResendInstanceEmailsSend = jest.fn();
const MockResendConstructorSpy = jest.fn().mockImplementation(() => {
  // This function will be used as the Resend constructor in our tests.
  // It returns a mock instance that mimics the structure of a real Resend client,
  // specifically the parts that might be used (e.g., by email.service.ts).
  return {
    emails: {
      send: mockResendInstanceEmailsSend,
    },
  };
});
// --- Mocking the 'resend' library ---
// We want to spy on the Resend constructor to verify it's called correctly.
// This mock must be defined AFTER the variables it uses (MockResendConstructorSpy)
// but it will be hoisted by Jest.

jest.mock('resend', () => ({
  __esModule: true,
  // When `new Resend()` is called in resend.client.ts, it will call MockResendConstructorSpy.
  Resend: MockResendConstructorSpy,
}));

// Now that mocks are set up, we can import the module under test.
// Jest ensures that when resend.client.ts imports 'resend', it gets our mock.
import { resendClient } from '@/infrastructure/email/resend.client';

// Define constants used by mocks BEFORE the mocks themselves.
const MOCKED_RESEND_API_KEY = 'test-resend-api-key-from-config-mock';

// --- Mocking Configuration ('@/config') --- This will be hoisted by Jest.
jest.mock('@/config', () => ({
  __esModule: true, // Important for ES Module interoperability with mocks
  default: {
    resend: {
      apiKey: MOCKED_RESEND_API_KEY,
    },
    // Including other parts of the config to make the mock more robust
    // and consistent with mocks in other test files (e.g., whatsapp.service.test.ts).
    // This helps prevent potential issues if transitive dependencies access other config parts.
    whatsapp: {
      phoneNumberId: 'mock-phone-id-for-resend-client-test',
      apiBaseUrl: 'mock-whatsapp-url-for-resend-client-test',
      apiToken: 'mock-whatsapp-token-for-resend-client-test',
    },
  },
}));

describe('Resend Client - /Users/jvl/repos/fyc/whatsapp-connector/src/infrastructure/email/resend.client.ts', () => {
  // The `resendClient` is instantiated when its module (resend.client.ts) is imported.
  // Due to Jest's hoisting of `jest.mock`, the mocks for 'resend' and '@/config'
  // are active before `resend.client.ts` is evaluated.

  beforeEach(() => {
    // Clear call history for the mock constructor and its instance methods before each test.
    MockResendConstructorSpy.mockClear();
    mockResendInstanceEmailsSend.mockClear();
  });

  it('should instantiate the Resend class with the API key from config', () => {
    // The Resend constructor (our spy) should have been called exactly once when the module was loaded.
    expect(MockResendConstructorSpy).toHaveBeenCalledTimes(1);
    expect(MockResendConstructorSpy).toHaveBeenCalledWith(MOCKED_RESEND_API_KEY);
  });

  it('should export a resendClient that is the instance created by the mocked Resend constructor', () => {
    expect(resendClient).toBeDefined();
    // Verify that the exported client is the exact instance our mock constructor returned.
    const instanceReturnedByMock = MockResendConstructorSpy.mock.results[0].value;
    expect(resendClient).toBe(instanceReturnedByMock);
    // Additionally, check for expected structure.
    expect(resendClient.emails).toBeDefined();
    expect(typeof resendClient.emails.send).toBe('function');
    expect(resendClient.emails.send).toBe(mockResendInstanceEmailsSend);
  });
});
