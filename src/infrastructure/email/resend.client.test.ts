// Define constants used by mocks BEFORE the mocks themselves.
const MOCKED_RESEND_API_KEY = 'test-resend-api-key-from-config-mock';

// --- Mocking Configuration ('@/config') ---
// This mock will be hoisted by Jest.
jest.mock('@/config', () => ({
  __esModule: true,
  default: {
    resend: {
      apiKey: MOCKED_RESEND_API_KEY,
    },
    // Keep other config parts for robustness
    whatsapp: {
      phoneNumberId: 'mock-phone-id-for-resend-client-test',
      apiBaseUrl: 'mock-whatsapp-url-for-resend-client-test',
      apiToken: 'mock-whatsapp-token-for-resend-client-test',
    },
  },
}));

// --- Mocking the 'resend' library ---
const mockResendInstanceEmailsSend = jest.fn();
const MockResendConstructorSpy = jest.fn().mockImplementation(() => {
  return {
    emails: {
      send: mockResendInstanceEmailsSend,
    },
  };
});

// This mock will be hoisted by Jest.
jest.mock('resend', () => ({
  __esModule: true,
  Resend: MockResendConstructorSpy,
}));

describe('Resend Client - /Users/jvl/repos/fyc/whatsapp-connector/src/infrastructure/email/resend.client.ts', () => {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  let resendClient: any;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  let instanceReturnedByMock: any;

  beforeEach(() => {
    // Reset modules to ensure a fresh import of resend.client.ts for each test.
    // This is crucial because the client is instantiated on module load.
    jest.resetModules();

    // Clear mocks before each test to have a clean state.
    MockResendConstructorSpy.mockClear();
    mockResendInstanceEmailsSend.mockClear();

    // Dynamically import the module under test AFTER resetting modules and clearing mocks.
    // This ensures it's re-evaluated with the fresh mocks.
    // eslint-disable-next-line @typescript-eslint/no-var-requires
    const { resendClient: freshClient } = require('@/infrastructure/email/resend.client');
    resendClient = freshClient;

    // The constructor should have been called once during the require() call.
    // We can capture the returned instance for later assertions.
    if (MockResendConstructorSpy.mock.results.length > 0) {
      instanceReturnedByMock = MockResendConstructorSpy.mock.results[0].value;
    }
  });

  it('should instantiate the Resend class with the API key from config', () => {
    // The Resend constructor (our spy) should have been called exactly once when the module was required.
    expect(MockResendConstructorSpy).toHaveBeenCalledTimes(1);
    expect(MockResendConstructorSpy).toHaveBeenCalledWith(MOCKED_RESEND_API_KEY);
  });

  it('should export a resendClient that is the instance created by the mocked Resend constructor', () => {
    expect(resendClient).toBeDefined();
    // Verify that the exported client is the exact instance our mock constructor returned.
    expect(resendClient).toBe(instanceReturnedByMock);
    // Additionally, check for expected structure.
    expect(resendClient.emails).toBeDefined();
    expect(typeof resendClient.emails.send).toBe('function');
    expect(resendClient.emails.send).toBe(mockResendInstanceEmailsSend);
  });
});