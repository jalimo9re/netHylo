# Project: netHylo - Omnichannel Multi-tenant Messaging SaaS

## 1. Contexto del Sistema
Eres un **Arquitecto de Software Senior y Lead Developer Fullstack**. El objetivo es construir **netHylo**, una plataforma de gestión de mensajería omnicanal (WhatsApp, Meta, TikTok) inspirada en la interfaz y UX de HubSpot. El sistema debe ser robusto, escalable y estrictamente multi-tenant.

## 2. Stack Tecnológico (Core)
- **Backend:** NestJS (Node.js) con TypeScript.
- **Frontend:** Angular (v17+) con Tailwind CSS y Angular Material.
- **Base de Datos:** PostgreSQL con TypeORM para persistencia.
- **Capa de Real-time:** Redis + BullMQ (colas) y WebSockets (Socket.io).
- **Infraestructura:** Docker y Docker Compose para orquestación.
- **Seguridad:** JWT (Stateless), Bcrypt (Hashing) y RBAC (Role-Based Access Control).

## 3. Arquitectura Multi-tenant & Seguridad
- **Aislamiento de Datos:** Utilizar estrategia de **Base de Datos Compartida con Discriminador (`tenant_id`)**.
- **Tenant Interceptor:** Implementar un interceptor global en NestJS que extraiga el `tenant_id` del JWT en cada petición y lo inyecte en el servicio de persistencia para filtrar automáticamente todas las queries. No se permite ninguna operación que no incluya el filtro de `tenant_id`.
- **Seguridad:** Todas las rutas (excepto auth inicial) deben estar protegidas. Implementar validación estricta de dominios permitidos para Webhooks.

## 4. Lógica de Negocio y Planes (SaaS)
Implementar un sistema de suscripción con 3 niveles:
- **Basic:** Máximo 1 usuario administrador y 2 integraciones activas.
- **Medium:** Hasta 5 usuarios y 10 integraciones.
- **Full:** Usuarios e integraciones ilimitadas.
- **Enforcement:** Crear un `PlanGuard` en NestJS que verifique los límites del Tenant antes de permitir la creación de nuevos usuarios o la conexión de nuevas redes sociales.

## 5. Motor de Integraciones (Omnicanal)
- **Patrón Provider:** Crear una interfaz abstracta `MessagingProvider` para estandarizar las implementaciones de WhatsApp Cloud API, Meta Graph API y TikTok Business API.
- **Webhook Central:** Un endpoint unificado que reciba eventos externos, los valide y los ponga en una cola de Redis para ser procesados de forma asíncrona.
- **Real-time Inbox:** Al procesar un mensaje, emitir un evento vía Socket.io para que el frontend de Angular actualice el chat en tiempo real sin recargar.

## 6. UI/UX (Estilo HubSpot)
- **Layout:** Sidebar de navegación persistente, barra superior de búsqueda y área de contenido central dinámica.
- **Componentes:** Usar **Angular Material** para tablas de datos y diálogos; **Tailwind CSS** para layouts personalizados y espaciado.
- **Inbox:** Vista de tres columnas (Lista de chats, Conversación activa, Información del contacto/CRM).

## 7. Configuración de Infraestructura (Docker)
Generar un `docker-compose.yml` que incluya:
- `nethylo-api`: App NestJS (puerto 3000).
- `nethylo-web`: App Angular servida por Nginx (puerto 80/4200).
- `nethylo-db`: PostgreSQL con volúmenes persistentes.
- `nethylo-redis`: Para gestión de colas y cache.
- Configuración para túneles (ngrok/localtunnel) documentada para pruebas de webhooks en local.

## 8. Tareas Iniciales Requeridas
1. Configurar la estructura de carpetas monorepo o split (backend/frontend).
2. Definir el `docker-compose.yml` y los `Dockerfile` correspondientes.
3. Diseñar las entidades base: `Tenant`, `User`, `Plan`, `Integration`, `Conversation` y `Message`.
4. Implementar el módulo de Autenticación con registro de Tenant (Empresa) y primer Admin.
5. Crear el esqueleto del Dashboard en Angular con el layout tipo HubSpot.

---
**Instrucción Final:** Comienza generando el archivo `docker-compose.yml` y el diagrama de clases/entidades de la base de datos para validar la estructura multi-tenant.