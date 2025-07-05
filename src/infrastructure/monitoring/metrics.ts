import { Counter, Histogram, register } from 'prom-client';

export const httpRequestDurationMicroseconds = new Histogram({
  name: 'http_request_duration_seconds',
  help: 'Duración de las peticiones HTTP en segundos',
  labelNames: ['method', 'route', 'code'],
  buckets: [0.1, 0.3, 0.5, 0.7, 1, 3, 5, 7, 10],
});

export const astervoipTriggersTotal = new Counter({
  name: 'astervoip_triggers_total',
  help: 'Total de requests recibidos desde AsterVOIP',
  labelNames: ['status'],
});

export const whatsappFlowsInitiated = new Counter({
  name: 'whatsapp_flows_initiated_total',
  help: 'Total de WhatsApp Flows que se intentaron iniciar',
});

export const whatsappFlowsCompleted = new Counter({
  name: 'whatsapp_flows_completed_total',
  help: 'Total de WhatsApp Flows que fueron completados por el usuario',
});

export const whatsappFlowsProcessingErrors = new Counter({
  name: 'whatsapp_flows_processing_errors_total',
  help: 'Total de errores al procesar una respuesta de Flow recibida',
});

export const apiErrorsTotal = new Counter({
  name: 'api_errors_total',
  help: 'Total de errores al comunicarse con APIs de terceros',
  labelNames: ['service'],
});

export const emailNotificationsTotal = new Counter({
  name: 'email_notifications_total',
  help: 'Total de notificaciones por email enviadas',
  labelNames: ['status'],
});

export const blockedIpsTotal = new Counter({
  name: 'security_blocked_ips_total',
  help: 'Total de peticiones bloqueadas por no estar en la IP whitelist',
  labelNames: ['ip'],
});

export const invalidAuthTokensTotal = new Counter({
  name: 'security_invalid_auth_tokens_total',
  help: 'Total de peticiones con tokens de autenticación inválidos',
  labelNames: ['reason'],
});

export const whatsappInvalidPayloadsTotal = new Counter({
  name: 'whatsapp_invalid_payloads_total',
  help: 'Total de webhooks de WhatsApp recibidos con un payload inesperado o no manejado',
});

export { register };
