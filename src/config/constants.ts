export const META_API_VERSION = 'v22.0';
export const META_API_BASE_URL = `https://graph.facebook.com/${META_API_VERSION}`;

export const META_FLOW_ID = '4054751074844285';

export const META_TEMPLATE_NAME = 'initial_conversation';

export const EMAIL_CONFIG = {
  FROM_ADDRESS: 'Sistema de Alertas <ventas@fycmktinteractivo.com>',
  SALES_TEAM_LIST: ['ventas@fycmktinteractivo.com', 'gerencia@fycmktinteractivo.com'],
};

export const MESSAGING_INTERACTIVE_TYPES = {
  META_FLOW: 'flow',
  META_NFM_REPLY: 'nfm_reply',
};

export const MESSAGING_TYPES = {
  INTERACTIVE: 'interactive',
  TEMPLATE: 'template',
};

export const SERVICE_NAMES = {
  META: 'meta',
  TWILIO: 'twilio',
  RESEND: 'resend',
  ASTERVOIP: 'astervoip',
};

export const METRIC_STATUS = {
  SUCCESS: 'success',
  VALIDATION_ERROR: 'validation_error',
  SERVER_ERROR: 'server_error',
  FAILED: 'failed',
  UNDELIVERED: 'undelivered',
};

export const AUTH_TOKEN_REASONS = {
  MISSING_OR_MALFORMED: 'missing_or_malformed',
  INVALID_TOKEN: 'invalid_token',
};

export const MESSAGING_PREFIXES = {
  WHATSAPP: 'whatsapp:',
};
