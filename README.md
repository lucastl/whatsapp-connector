# WhatsApp Connector

## 1. Descripción General

**WhatsApp Connector** es una aplicación de backend desarrollada en Node.js y TypeScript, diseñada para actuar como un puente de automatización entre un sistema de telefonía IVR (AsterVOIP) y la API de WhatsApp Business.

El propósito principal de esta aplicación (en su Fase 1) es recibir un trigger desde AsterVOIP, iniciar una encuesta interactiva con un cliente a través de un **WhatsApp Flow**, y notificar al equipo de ventas con los resultados de la encuesta mediante un **email enriquecido** enviado a través de Resend.

## 2. Características Principales

* **Arquitectura en Capas:** Código organizado y desacoplado para facilitar la mantenibilidad y escalabilidad.
* **Calidad de Código Asegurada:** Uso de ESLint y Prettier para un código limpio y consistente.
* **Endpoint Seguro para Triggers:** La ruta que recibe la llamada de AsterVOIP está protegida por un token de autenticación.
* **Integración con WhatsApp Flows:** Envía encuestas interactivas que se completan 100% dentro de la conversación de WhatsApp.
* **Notificaciones por Email:** Utiliza Resend para enviar los resultados de la encuesta de forma instantánea al equipo de ventas.
* **Logging Detallado:** Registro de todos los eventos y errores importantes usando Pino para una fácil depuración y monitoreo.

## 3. Prerrequisitos

* Node.js (versión 18 o superior)
* npm (usualmente viene con Node.js)
* Una cuenta de desarrollador de Meta con una App configurada.
* Una cuenta en [Resend](https://resend.com).

## 4. Instalación y Configuración

Sigue estos pasos para poner en marcha el proyecto en tu entorno local.

**1. Clona el repositorio (si ya está en GitHub) o copia los archivos en una carpeta.**

**2. Navega a la raíz del proyecto e instala las dependencias:**

```bash
npm install
```

**3. Configura las Variables de Entorno:**

Copia el contenido del archivo `.env.example` a un nuevo archivo llamado `.env` en la raíz del proyecto.

```bash
cp .env.example .env
```

Luego, abre el archivo `.env` y rellena las siguientes variables:

* `PORT`: El puerto en el que correrá el servidor (por defecto: 3000).
* `ASTERVOIP_AUTH_TOKEN`: Un token secreto que generarás para autenticar las peticiones de AsterVOIP.
* `WHATSAPP_API_TOKEN`: Tu token de acceso de la App de Meta.
* `WHATSAPP_PHONE_NUMBER_ID`: El ID de tu número de teléfono de WhatsApp.
* `WHATSAPP_VERIFY_TOKEN`: Un token secreto que tú defines para la verificación inicial del webhook de Meta.
* `RESEND_API_KEY`: Tu clave de API obtenida del dashboard de Resend.

## 5. Ejecutar la Aplicación

Para iniciar el servidor en modo de desarrollo (con reinicio automático al guardar cambios):

```bash
npm run dev
```

El servidor estará corriendo en `http://localhost:3000`.

Para producción, primero compila los archivos de TypeScript a JavaScript:

```bash
npm run build
```

Y luego inicia la aplicación compilada:

```bash
npm run start
```

## 6. Endpoints y Pruebas

### 6.1. Health Check (Chequeo de Salud)

* **Endpoint:** `GET /health`
* **Descripción:** Devuelve un status `200 OK` si el servidor está funcionando.

### 6.2. Trigger de AsterVOIP

* **Endpoint:** `POST /api/v1/webhooks/astervoip-trigger`
* **Descripción:** Simula la llamada de AsterVOIP para iniciar un WhatsApp Flow.
* **Autenticación:** Requiere el header `Authorization: Bearer TU_TOKEN_SECRETO`.
* **Comando de Prueba:**

```bash
curl -X POST http://localhost:3000/api/v1/webhooks/astervoip-trigger \
-H "Content-Type: application/json" \
-H "Authorization: Bearer TU_TOKEN_SECRETO" \
-d '{"customerPhone": "549..."}'
```

### 6.3. Webhook de WhatsApp

* **Endpoint:** `POST /api/v1/webhooks/whatsapp`
* **Descripción:** Recibe las respuestas de los WhatsApp Flows y otros eventos de la API de Meta.
* **Comando de Prueba:**

```bash
# Simula una respuesta de un Flow
curl -X POST http://localhost:3000/api/v1/webhooks/whatsapp \
-H "Content-Type: application/json" \
-d '{
  "object": "whatsapp_business_account",
  "entry": [ { "changes": [ { "field": "messages", "value": { "messages": [ { "from": "549...", "type": "interactive", "interactive": { "type": "nfm_reply", "nfm_reply": { "response_json": "{\"product_interest\":\"fibra_1000\",\"best_time_to_call\":\"tarde\"}" } } } ] } } ] } ]
}'
```