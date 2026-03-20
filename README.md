# netHylo

Plataforma SaaS de mensajería omnicanal multi-tenant. Permite a empresas gestionar conversaciones de WhatsApp, Facebook Messenger, Instagram DM, Telegram y TikTok desde una única interfaz estilo HubSpot.

Cada tenant (empresa) configura sus propias credenciales de cada plataforma. Los mensajes entrantes se enrutan automáticamente al tenant correcto mediante verificación de firma y matching de integración.

## Stack

| Capa | Tecnología |
|---|---|
| Backend | NestJS + TypeScript |
| Frontend | Angular 17 + Tailwind CSS + Angular Material |
| Base de datos | PostgreSQL (TypeORM) |
| Colas / Cache | Redis + BullMQ |
| Real-time | Socket.io |
| Infraestructura | Docker + Docker Compose |

## Arranque rápido

```bash
# 1. Variables de entorno
cp .env.example .env

# 2. Levantar PostgreSQL y Redis
docker compose up -d nethylo-db nethylo-redis

# 3. Backend
cd backend
npm install
npm run seed    # Crea planes + superadmin (admin@nethylo.com / Admin123!)
npm run start:dev

# 4. Frontend (en otra terminal)
cd frontend
npm install
npm start       # http://localhost:4500
```

O con Docker completo:

```bash
docker compose up --build
```

### Puertos (desarrollo local)

| Servicio | Puerto host | Puerto interno |
|---|---|---|
| API (NestJS) | 3100 | 3000 |
| Web (Angular) | 4500 | 4200 |
| PostgreSQL | 5450 | 5432 |
| Redis | 6390 | 6379 |

## Webhooks por plataforma

Todos los webhooks son públicos (sin JWT) y se exponen bajo el prefijo `/api/webhooks/`. Cada plataforma requiere dos endpoints: uno GET para la verificación inicial y uno POST para la recepción de eventos.

### WhatsApp Business Cloud API

| Método | URL | Descripción |
|---|---|---|
| `GET` | `/api/webhooks/whatsapp` | Verificación del webhook. Meta envía `hub.mode`, `hub.verify_token` y `hub.challenge`. Responde con el challenge si el verify_token coincide con el configurado en la integración. |
| `POST` | `/api/webhooks/whatsapp` | Recepción de mensajes y actualizaciones de estado. Valida firma `X-Hub-Signature-256` con HMAC-SHA256 usando el `appSecret` de la integración. |

**Configurar en Meta for Developers:**
1. Ir a la app → WhatsApp → Configuration
2. Callback URL: `https://<tu-dominio>/api/webhooks/whatsapp`
3. Verify token: el mismo valor que se introduce en netHylo al crear la integración
4. Suscribirse al campo `messages`

**Campos requeridos en la integración:**

| Campo | Dónde obtenerlo |
|---|---|
| Phone Number ID | Meta Business Suite → WhatsApp → Configuración de API |
| Número de teléfono | El número visible para clientes |
| Business Account ID | Meta Business Suite → Configuración → Info de la empresa |
| Access Token | Meta for Developers → App → Generar token permanente |
| Verify Token | Valor libre (debe coincidir con el configurado en Meta) |
| App Secret | Meta for Developers → App → Configuración → Básica |

---

### Meta (Facebook Messenger)

| Método | URL | Descripción |
|---|---|---|
| `GET` | `/api/webhooks/meta` | Verificación del webhook. Misma mecánica que WhatsApp (`hub.mode`, `hub.verify_token`, `hub.challenge`). |
| `POST` | `/api/webhooks/meta` | Recepción de mensajes, entregas y lecturas. Valida firma `X-Hub-Signature-256` con HMAC-SHA256 usando el `appSecret`. |

**Configurar en Meta for Developers:**
1. Ir a la app → Messenger → Settings → Webhooks
2. Callback URL: `https://<tu-dominio>/api/webhooks/meta`
3. Verify token: el configurado en la integración
4. Suscribirse a: `messages`, `messaging_postbacks`, `message_deliveries`, `message_reads`

**Campos requeridos en la integración:**

| Campo | Dónde obtenerlo |
|---|---|
| Page ID | Facebook Page → Información → ID de la página |
| Nombre de la página | Nombre visible de la página |
| App ID | Meta for Developers → App → Panel |
| Page Access Token | Meta for Developers → App → Messenger → Generar token |
| Verify Token | Valor libre (debe coincidir con el configurado en Meta) |
| App Secret | Meta for Developers → App → Configuración → Básica |

---

### Instagram DM

| Método | URL | Descripción |
|---|---|---|
| `GET` | `/api/webhooks/instagram` | Verificación del webhook. Misma mecánica Meta (`hub.mode`, `hub.verify_token`, `hub.challenge`). |
| `POST` | `/api/webhooks/instagram` | Recepción de mensajes directos, respuestas a stories y lecturas. Valida firma `X-Hub-Signature-256` con HMAC-SHA256 usando el `appSecret`. |

**Requisitos previos:**
- La cuenta de Instagram debe ser **profesional** (Business o Creator)
- Debe estar **vinculada a una página de Facebook**
- La app en Meta for Developers debe tener el producto **Instagram** activado

**Configurar en Meta for Developers:**
1. Ir a la app → Instagram → Webhooks
2. Callback URL: `https://<tu-dominio>/api/webhooks/instagram`
3. Verify token: el configurado en la integración
4. Suscribirse a: `messages`, `message_reactions`, `message_reads`

**Permisos requeridos en la app:**
- `instagram_manage_messages`
- `instagram_basic`
- `pages_manage_metadata`

**Campos requeridos en la integración:**

| Campo | Dónde obtenerlo |
|---|---|
| Instagram Account ID | Meta for Developers → App → Instagram → ID de cuenta vinculada, o via API: `GET /{page-id}?fields=instagram_business_account` |
| Usuario de Instagram | El @ de la cuenta (sin @) |
| App ID | Meta for Developers → App → Panel (misma app que Facebook) |
| Access Token | Token con permisos `instagram_manage_messages`. Generar desde Graph API Explorer o flujo OAuth. |
| Verify Token | Valor libre (debe coincidir con el configurado en Meta) |
| App Secret | Meta for Developers → App → Configuración → Básica (misma app que Facebook) |

---

### Telegram Bot API

| Método | URL | Descripción |
|---|---|---|
| `POST` | `/api/webhooks/telegram` | Recepción de mensajes. Valida el header `X-Telegram-Bot-Api-Secret-Token` contra el `secretToken` configurado en la integración. |

> Telegram no usa verificación GET con challenge. El webhook se registra llamando a la API de Telegram directamente.

**Configurar el webhook:**

```bash
curl -F "url=https://<tu-dominio>/api/webhooks/telegram" \
     -F "secret_token=<tu-secret-token>" \
     https://api.telegram.org/bot<BOT_TOKEN>/setWebhook
```

**Crear el bot:**
1. Abrir Telegram y hablar con [@BotFather](https://t.me/BotFather)
2. Enviar `/newbot` y seguir las instrucciones
3. BotFather devuelve el **Bot Token** (ej: `123456:ABC-DEF1234ghIkl-zyx57W2v1u123ew11`)
4. El **username** del bot es el que se eligió al crearlo (ej: `mi_empresa_bot`)

**Campos requeridos en la integración:**

| Campo | Dónde obtenerlo |
|---|---|
| Bot Token | Proporcionado por @BotFather al crear el bot |
| Username del bot | El username elegido al crear el bot (sin @) |
| Secret Token | Valor libre. Se usa como `secret_token` en la llamada a `setWebhook` y para validar que los webhooks vienen de Telegram. |

---

### TikTok Business API

| Método | URL | Descripción |
|---|---|---|
| `GET` | `/api/webhooks/tiktok` | Verificación del webhook. TikTok envía un `challenge` que se devuelve tal cual. |
| `POST` | `/api/webhooks/tiktok` | Recepción de mensajes. Valida firma `X-TikTok-Signature` con HMAC-SHA256 usando el `clientSecret`. |

**Configurar en TikTok for Developers:**
1. Ir a la app → Development → Webhook
2. Callback URL: `https://<tu-dominio>/api/webhooks/tiktok`
3. Suscribirse al evento `receive_message`

**Campos requeridos en la integración:**

| Campo | Dónde obtenerlo |
|---|---|
| Business ID | TikTok Business Center → Configuración |
| Client Key | TikTok for Developers → App → App Key |
| Access Token | Generado mediante el flujo OAuth2 de TikTok |
| Client Secret | TikTok for Developers → App → App Secret |

---

## Pruebas de webhooks en local

Las plataformas requieren una URL pública HTTPS. Para desarrollo local se puede usar un túnel:

### ngrok

```bash
# Instalar: https://ngrok.com/download
ngrok http 3100
```

Copiar la URL generada (ej: `https://a1b2c3.ngrok-free.app`) y usarla como base al configurar los webhooks en cada plataforma:

- WhatsApp: `https://a1b2c3.ngrok-free.app/api/webhooks/whatsapp`
- Meta: `https://a1b2c3.ngrok-free.app/api/webhooks/meta`
- Instagram: `https://a1b2c3.ngrok-free.app/api/webhooks/instagram`
- Telegram: `https://a1b2c3.ngrok-free.app/api/webhooks/telegram`
- TikTok: `https://a1b2c3.ngrok-free.app/api/webhooks/tiktok`

### localtunnel

```bash
npx localtunnel --port 3100
```

> **Importante:** Cada vez que se reinicia el túnel la URL cambia. Hay que actualizarla en el panel de desarrolladores de cada plataforma.

## Despliegue en Coolify

Usar `docker-compose.coolify.yml` como fichero compose al crear el servicio en Coolify.

**Variables de entorno a configurar:**

| Variable | Descripción |
|---|---|
| `DB_USERNAME` | Usuario de PostgreSQL |
| `DB_PASSWORD` | Password de PostgreSQL |
| `DB_NAME` | Nombre de la BD (default: `nethylo`) |
| `JWT_SECRET` | Secret para firmar tokens JWT |
| `CORS_ORIGIN` | Dominio del frontend (ej: `https://app.nethylo.com`) |

Tras el primer despliegue, ejecutar el seed para crear los planes y el superadmin:

```bash
docker exec nethylo-api npm run seed
```

## Enrutamiento multi-tenant de mensajes

Cuando llega un webhook:

1. El controller busca todas las integraciones **activas** del provider
2. Valida la firma (`X-Hub-Signature-256` / `X-TikTok-Signature`) contra el secret de cada integración
3. Si la firma coincide, identifica el tenant propietario
4. Encola el evento en BullMQ para procesamiento asíncrono
5. El processor crea/actualiza contacto, conversación y mensaje
6. Emite evento Socket.io al room `tenant:{id}` para actualización en tiempo real

Esto garantiza que los mensajes de cada número/página/cuenta van exclusivamente al tenant que configuró esas credenciales.
