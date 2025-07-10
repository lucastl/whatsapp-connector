import express from 'express';
import pino from 'pino';
import { pinoHttp } from 'pino-http';
import request from 'supertest';

// Mock de las dependencias de más bajo nivel
jest.mock('@/infrastructure/email/resend.client', () => ({ resendClient: { emails: { send: jest.fn() } } }));
jest.mock('@/infrastructure/providers/meta/whatsapp.httpClient', () => ({ whatsappHttpClient: { post: jest.fn() } }));
jest.mock('@/infrastructure/providers/twilio/twilio.client', () => ({ twilioClient: { messages: { create: jest.fn() } } }));

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
});