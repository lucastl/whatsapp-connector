import { collectDefaultMetrics, Counter, Histogram, register } from 'prom-client';

// Inicia la recolección de métricas por defecto de Node.js (CPU, memoria, etc.)
collectDefaultMetrics({ register });
/**
 * Métrica de propósito general para la duración de las peticiones HTTP.
 */
export const httpRequestDurationMicroseconds = new Histogram({
  name: 'http_request_duration_seconds',
  help: 'Duración de las peticiones HTTP en segundos',
  labelNames: ['method', 'route', 'code'],
  buckets: [0.1, 0.3, 0.5, 0.7, 1, 3, 5, 7, 10],
});

/**
 * Métrica para la duración de las llamadas a APIs externas.
 */
export const externalApiRequestDurationSeconds = new Histogram({
  name: 'external_api_request_duration_seconds',
  help: 'Duración de las peticiones a APIs externas en segundos.',
  labelNames: ['service'], // SERVICE_NAMES.META, SERVICE_NAMES.TWILIO, SERVICE_NAMES.RESEND
  buckets: [0.05, 0.1, 0.3, 0.5, 1, 2, 5],
});

/**
 * Métrica de propósito general para errores de comunicación con APIs de terceros.
 * El label 'service' puede ser SERVICE_NAMES.META, SERVICE_NAMES.TWILIO, SERVICE_NAMES.RESEND, etc.
 */
export const apiErrorsTotal = new Counter({
  name: 'api_errors_total',
  help: 'Total de errores al comunicarse con APIs de terceros',
  labelNames: ['service'],
});

/**
 * Métrica para los triggers que inician el proceso, recibidos desde AsterVOIP.
 */
export const astervoipTriggersTotal = new Counter({
  name: 'astervoip_triggers_total',
  help: 'Total de requests recibidos desde AsterVOIP',
  labelNames: ['status'], // e.g., METRIC_STATUS.SUCCESS, METRIC_STATUS.VALIDATION_ERROR, METRIC_STATUS.SERVER_ERROR
});

/**
 * Métrica para el envío de plantillas/mensajes de inicio de conversación.
 * El label 'provider' puede ser 'meta' o 'twilio'.
 */
export const messagingTemplatesSentTotal = new Counter({
  name: 'messaging_templates_sent_total',
  help: 'Total de plantillas de mensajería que se intentaron enviar',
  labelNames: ['provider'],
});

/**
 * Métrica para los webhooks de mensajería recibidos de los proveedores.
 * El label 'provider' puede ser 'meta' o 'twilio'.
 */
export const messagingWebhookReceivedTotal = new Counter({
  name: 'messaging_webhook_received_total',
  help: 'Total de webhooks de mensajería recibidos por proveedor',
  labelNames: ['provider'],
});

/**
 * Métrica para los webhooks con un payload inesperado o que falla la validación.
 * El label 'provider' puede ser 'meta' o 'twilio'.
 */
export const messagingInvalidPayloadsTotal = new Counter({
  name: 'messaging_invalid_payloads_total',
  help: 'Total de webhooks recibidos con un payload inválido o no manejado',
  labelNames: ['provider'],
});

/**
 * Métrica para los "Flows" (o interacciones equivalentes) completados exitosamente.
 * El label 'provider' indica qué plataforma reportó la finalización (ej: 'meta').
 */
export const messagingFlowsCompleted = new Counter({
  name: 'messaging_flows_completed_total',
  help: 'Total de flujos de mensajería que fueron completados por el usuario',
  labelNames: ['provider'],
});

/**
 * Métrica para errores que ocurren al intentar procesar la respuesta de un Flow.
 * El label 'provider' indica de qué plataforma era el flow (ej: 'meta').
 */
export const messagingFlowsProcessingErrors = new Counter({
  name: 'messaging_flows_processing_errors_total',
  help: 'Total de errores al procesar una respuesta de Flow recibida',
  labelNames: ['provider'],
});

/**
 * Métrica para el envío de notificaciones por email.
 */
export const emailNotificationsTotal = new Counter({
  name: 'email_notifications_total',
  help: 'Total de notificaciones por email enviadas',
  labelNames: ['status'], // METRIC_STATUS.SUCCESS o METRIC_STATUS.FAILED
});

/**
 * Métrica para actualizaciones de estado de mensajes salientes.
 */
export const messagingStatusUpdatesTotal = new Counter({
  name: 'messaging_status_updates_total',
  help: 'Total de actualizaciones de estado de mensajes salientes recibidas.',
  labelNames: ['provider', 'status'], // status: METRIC_STATUS.SENT, METRIC_STATUS.DELIVERED, METRIC_STATUS.FAILED, etc.
});

/**
 * Métricas de Seguridad
 */
export const blockedIpsTotal = new Counter({
  name: 'security_blocked_ips_total',
  help: 'Total de peticiones bloqueadas por no estar en la IP whitelist',
  labelNames: ['ip'],
});

export const invalidAuthTokensTotal = new Counter({
  name: 'security_invalid_auth_tokens_total',
  help: 'Total de peticiones con tokens de autenticación inválidos',
  labelNames: ['reason'], // 'missing_or_malformed' o 'invalid_token'
});

export { register };
