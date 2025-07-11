import express from 'express';
import pino from 'pino';
import { pinoHttp } from 'pino-http';
import request from 'supertest';

// Mock de las dependencias de más bajo nivel
jest.mock('@/config', () => ({
  __esModule: true,
  default: {
    port: 3000,
    nodeEnv: 'test',
    appName: 'test-app',
    logLevel: 'silent',
    astervoipAuthToken: 'test-token',
    whatsapp: {
      verifyToken: 'test-token',
    },
  },
}));
jest.mock('@/infrastructure/email/resend.client', () => ({
  resendClient: {
    emails: {
      send: jest.fn().mockResolvedValue({ data: { id: 'test-id' } }),
    },
  },
}));
jest.mock('@/infrastructure/providers/meta/whatsapp.httpClient', () => ({
  whatsappHttpClient: { post: jest.fn() },
}));
jest.mock('@/infrastructure/providers/twilio/twilio.client', () => ({
  twilioClient: { messages: { create: jest.fn() } },
}));

import { globalErrorHandler } from '@/api/middlewares/error.middleware';
import webhookRouter from '@/api/routes/webhook.routes';

const app = express();
app.use(express.json());
app.use(pinoHttp({ logger: pino({ enabled: false }) }));
app.use('/api/v1/webhooks', webhookRouter);
app.use(globalErrorHandler);

describe('Webhook Routes - /api/v1/webhooks', () => {
  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('POST /astervoip-trigger', () => {
    const validPayload = { customerPhone: '5491122334455' };
    const validToken = 'Bearer test-token';

    it('should return 202 for a valid request', async () => {
      const response = await request(app)
        .post('/api/v1/webhooks/astervoip-trigger')
        .set('Authorization', validToken)
        .send(validPayload);

      expect(response.status).toBe(202);
      expect(response.body.message).toContain('Accepted');
    });

    it('should return 400 for an invalid payload', async () => {
      const invalidPayload = { phone: '123' };
      const response = await request(app)
        .post('/api/v1/webhooks/astervoip-trigger')
        .set('Authorization', validToken)
        .send(invalidPayload);

      expect(response.status).toBe(400);
      expect(response.body.message).toContain('invalid data');
    });
  });

  describe('POST /twilio-status', () => {
    it('should return 204 for any valid status update', async () => {
      const payload = { MessageSid: 'SMxxxx', MessageStatus: 'sent' };
      const response = await request(app).post('/api/v1/webhooks/twilio-status').send(payload);
      expect(response.status).toBe(204);
    });
  });

  describe('POST /twilio', () => {
    it('should return 204 for a valid survey response', async () => {
      const payload = {
        customerPhone: 'whatsapp:+5491122334455',
        surveyResponse: {
          have_fiber: 'yes',
          mobile_plans: 'basic',
          location: 'Buenos Aires',
        },
      };
      const response = await request(app).post('/api/v1/webhooks/twilio').send(payload);
      expect(response.status).toBe(204);
    });
  });

  describe('GET /whatsapp', () => {
    it('should respond with the challenge if the token is valid', async () => {
      const response = await request(app).get(
        '/api/v1/webhooks/whatsapp?hub.mode=subscribe&hub.challenge=CHALLENGE_ACCEPTED&hub.verify_token=test-token',
      );

      expect(response.status).toBe(200);
      expect(response.text).toBe('CHALLENGE_ACCEPTED');
    });
  });

  describe('POST /whatsapp', () => {
    it('should return 200 for a valid message', async () => {
      const payload = {
        object: 'whatsapp_business_account',
        entry: [
          {
            changes: [
              {
                field: 'messages',
                value: {
                  messages: [
                    {
                      from: '5491122334455',
                      type: 'interactive',
                      interactive: {
                        type: 'nfm_reply',
                        nfm_reply: {
                          response_json: JSON.stringify({
                            product_interest: 'fiber',
                            best_time_to_call: 'morning',
                          }),
                        },
                      },
                    },
                  ],
                },
              },
            ],
          },
        ],
      };
      const response = await request(app).post('/api/v1/webhooks/whatsapp').send(payload);
      expect(response.status).toBe(200);
    });
  });
});
