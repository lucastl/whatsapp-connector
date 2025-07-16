# WhatsApp Connector

## 1. Descripción General

**WhatsApp Connector** es un servicio de backend desarrollado en Node.js y TypeScript, diseñado para actuar como un puente de automatización entre un sistema de telefonía (como AsterVOIP) y proveedores de mensajería de WhatsApp (Meta y Twilio).

El propósito principal de esta aplicación es recibir un disparador (trigger) desde un sistema externo, iniciar una encuesta interactiva con un cliente a través de un **WhatsApp Flow (Meta)** o una **plantilla con encuesta (Twilio)**, y finalmente procesar los resultados. Típicamente, esto culmina en una notificación por correo electrónico con los datos de la encuesta.

## 2. Características Principales

*   **Arquitectura en Capas:** Código organizado y desacoplado para facilitar la mantenibilidad y escalabilidad.
*   **Soporte Multi-proveedor:** Integración tanto con la API oficial de **Meta** como con **Twilio**, configurable mediante variables de entorno.
*   **Calidad de Código Asegurada:** Uso de ESLint y Prettier para un código limpio y consistente.
*   **Endpoints Seguros:** Rutas críticas protegidas por token de autenticación y listas blancas de IPs.
*   **Integración con WhatsApp Flows y Plantillas:** Envía encuestas interactivas que se completan dentro de la conversación de WhatsApp.
*   **Notificaciones por Email:** Utiliza Resend para enviar los resultados de la encuesta de forma instantánea.
*   **Logging Detallado:** Registro de todos los eventos y errores importantes usando Pino para una fácil depuración.
*   **Monitoreo y Observabilidad:** Expone un endpoint `/metrics` con métricas detalladas en formato Prometheus para monitorear la salud y el rendimiento de la aplicación en tiempo real.

## 3. Prerrequisitos

*   Node.js (versión 22 o superior, según `package.json`).
*   npm (versión 10 o superior).
*   Una cuenta de desarrollador de Meta con una App configurada (si se usa Meta).
*   Una cuenta de Twilio con un número de WhatsApp activado (si se usa Twilio).
*   Una cuenta en [Resend](https://resend.com) para el envío de correos.
*   Docker (opcional, para despliegue).

## 4. Instalación y Configuración

**1. Clona el repositorio e instala las dependencias:**

```bash
git clone <URL_DEL_REPOSITORIO>
cd whatsapp-connector
npm install
```

**2. Configura las Variables de Entorno:**

Copia el archivo `.env.example` a un nuevo archivo `.env`.

```bash
cp .env.example .env
```

Abre `.env` y rellena las variables según el proveedor que vayas a utilizar:

### Variables Comunes
*   `PORT`: Puerto del servidor (def: 3000).
*   `MESSAGING_PROVIDER`: Proveedor a utilizar. Valores posibles: `meta` o `twilio`.
*   `ASTERVOIP_AUTH_TOKEN`: Token secreto para autenticar las peticiones de AsterVOIP.
*   `RESEND_API_KEY`: Tu clave de API de Resend.
*   `ALLOWED_IPS`: Lista de IPs separadas por comas con permiso para acceder a la API (ej: `1.2.3.4,5.6.7.8`).

### Variables para Meta
*   `WHATSAPP_API_TOKEN`: Token de acceso de tu App de Meta.
*   `WHATSAPP_PHONE_NUMBER_ID`: ID de tu número de teléfono de WhatsApp.
*   `WHATSAPP_VERIFY_TOKEN`: Token secreto para la verificación del webhook de Meta.

### Variables para Twilio
*   `TWILIO_ACCOUNT_SID`: Account SID de tu cuenta de Twilio.
*   `TWILIO_AUTH_TOKEN`: Auth Token de tu cuenta de Twilio.
*   `TWILIO_WHATSAPP_NUMBER`: Tu número de WhatsApp de Twilio (formato: `whatsapp:+1...`).
*   `TWILIO_TEMPLATE_SID`: El Content SID de la plantilla de mensaje que deseas enviar.

## 5. Ejecutar la Aplicación

*   **Modo Desarrollo (con auto-recarga):**
    ```bash
    npm run dev
    ```

*   **Modo Producción:**
    ```bash
    npm run build
    npm run start
    ```

El servidor estará corriendo en `http://localhost:3000` (o el puerto que hayas configurado).

## 6. Endpoints de la API

### Endpoints Principales
*   `GET /health`: Devuelve un status `200 OK` si el servidor está funcionando.
*   `GET /metrics`: Expone las métricas en formato Prometheus para monitoreo.

### Webhooks
*   `POST /api/v1/webhooks/astervoip-trigger`: Endpoint protegido que recibe el trigger para iniciar una encuesta.
    *   **Auth:** `Authorization: Bearer <ASTERVOIP_AUTH_TOKEN>`
    *   **Body:** `{ "customerPhone": "549..." }`

*   `GET /api/v1/webhooks/whatsapp`: Usado por Meta para la verificación inicial del webhook.
*   `POST /api/v1/webhooks/whatsapp`: Recibe las respuestas de los WhatsApp Flows de Meta.

*   `POST /api/v1/webhooks/twilio`: Recibe el payload final de un Studio Flow de Twilio.
*   `POST /api/v1/webhooks/twilio-status`: Recibe actualizaciones de estado de los mensajes enviados por Twilio.

## 7. Monitoreo y Métricas (Prometheus)

El endpoint `/metrics` expone métricas cruciales para la observabilidad del sistema. A continuación, se describen las más importantes.

### Métricas Clave
*   `http_request_duration_seconds`: Latencia de todas las peticiones HTTP.
*   `external_api_request_duration_seconds`: Latencia de las llamadas a APIs externas (Meta, Twilio, Resend).
*   `api_errors_total`: Errores de comunicación con APIs externas.
*   `astervoip_triggers_total`: Total de triggers recibidos para iniciar encuestas.
*   `messaging_templates_sent_total`: Total de plantillas de encuesta enviadas.
*   `messaging_flows_completed_total`: **(KPI)** Total de encuestas completadas por los usuarios.
*   `messaging_invalid_payloads_total`: Webhooks recibidos con un formato inesperado.
*   `messaging_flows_processing_errors_total`: Errores internos al procesar una encuesta ya completada.
*   `email_notifications_total`: Total de emails de notificación enviados y su estado.
*   `security_blocked_ips_total`: Peticiones bloqueadas por la lista blanca de IPs.
*   `security_invalid_auth_tokens_total`: Peticiones rechazadas por token de autenticación inválido.
