import { Injectable, Logger, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { ConfigService } from '@nestjs/config';
import { Integration, IntegrationProvider } from '@/database/entities/integration.entity';

const GRAPH_API = 'https://graph.facebook.com/v21.0';
const TELEGRAM_API = 'https://api.telegram.org/bot';
const TIKTOK_API = 'https://business-api.tiktok.com/open_api/v1.3';

export interface TestDefinition {
  key: string;
  label: string;
  description: string;
  inputs?: { key: string; label: string; placeholder?: string; required?: boolean }[];
}

export interface TestSuite {
  provider: IntegrationProvider;
  label: string;
  tests: TestDefinition[];
}

export interface TestResult {
  test: string;
  success: boolean;
  message: string;
  details?: any;
  duration: number;
}

@Injectable()
export class IntegrationTestingService {
  private readonly logger = new Logger(IntegrationTestingService.name);

  constructor(
    @InjectRepository(Integration) private integrationRepo: Repository<Integration>,
    private configService: ConfigService,
  ) {}

  getTestSuites(): TestSuite[] {
    return [
      {
        provider: IntegrationProvider.META,
        label: 'Meta (Facebook Messenger)',
        tests: [
          { key: 'token_check', label: 'Verificar Token', description: 'Inspecciona el token vía debug_token: validez, tipo, scopes y expiración.' },
          { key: 'page_info', label: 'Permisos de Página', description: 'Verifica que el token pertenece a la página correcta y tiene los scopes necesarios (pages_messaging, pages_manage_metadata).' },
          { key: 'app_subscriptions', label: 'Suscripciones de Webhook', description: 'Lee las suscripciones activas de la página (requiere pages_manage_metadata).' },
          { key: 'subscribe_page', label: 'Suscribir Página', description: 'Suscribe la página a eventos: messages, message_deliveries, message_reads.' },
          {
            key: 'send_message', label: 'Enviar Mensaje', description: 'Envía un mensaje de prueba a un PSID.',
            inputs: [
              { key: 'recipientId', label: 'PSID del destinatario', placeholder: 'Ej: 1234567890', required: true },
              { key: 'text', label: 'Texto', placeholder: 'Mensaje de prueba' },
            ],
          },
          {
            key: 'get_profile', label: 'Perfil de Usuario', description: 'Lee el perfil público de un usuario por PSID.',
            inputs: [{ key: 'psid', label: 'PSID', placeholder: 'Ej: 1234567890', required: true }],
          },
        ],
      },
      {
        provider: IntegrationProvider.INSTAGRAM,
        label: 'Instagram DM',
        tests: [
          { key: 'token_check', label: 'Verificar Token', description: 'Inspecciona el token vía debug_token: validez, scopes de Instagram y expiración.' },
          { key: 'account_info', label: 'Info de Cuenta', description: 'Obtiene datos de la cuenta profesional de Instagram.' },
          {
            key: 'send_message', label: 'Enviar Mensaje', description: 'Envía un DM de prueba.',
            inputs: [
              { key: 'recipientId', label: 'Instagram-scoped ID', placeholder: 'Ej: 1234567890', required: true },
              { key: 'text', label: 'Texto', placeholder: 'Mensaje de prueba' },
            ],
          },
        ],
      },
      {
        provider: IntegrationProvider.WHATSAPP,
        label: 'WhatsApp Business',
        tests: [
          { key: 'business_verify', label: 'Verificar Cuenta Business', description: 'Valida la cuenta de negocio de WhatsApp.' },
          { key: 'phone_info', label: 'Info del Número', description: 'Obtiene nombre verificado, número y calidad del teléfono.' },
          {
            key: 'send_template', label: 'Enviar Template', description: 'Envía un mensaje template (funciona fuera de ventana 24h).',
            inputs: [
              { key: 'phone', label: 'Teléfono destino', placeholder: 'Ej: 34612345678', required: true },
              { key: 'templateName', label: 'Nombre del template', placeholder: 'Ej: hello_world', required: true },
              { key: 'language', label: 'Idioma', placeholder: 'Ej: es' },
            ],
          },
          {
            key: 'send_text', label: 'Enviar Texto', description: 'Envía texto (solo dentro de ventana 24h).',
            inputs: [
              { key: 'phone', label: 'Teléfono destino', placeholder: 'Ej: 34612345678', required: true },
              { key: 'text', label: 'Texto', placeholder: 'Mensaje de prueba' },
            ],
          },
        ],
      },
      {
        provider: IntegrationProvider.TELEGRAM,
        label: 'Telegram Bot',
        tests: [
          { key: 'bot_info', label: 'Info del Bot', description: 'Llama a getMe para verificar el bot token y obtener datos del bot.' },
          { key: 'webhook_info', label: 'Estado del Webhook', description: 'Llama a getWebhookInfo para ver la URL configurada y errores pendientes.' },
          {
            key: 'set_webhook', label: 'Configurar Webhook', description: 'Registra la URL del webhook con setWebhook.',
            inputs: [{ key: 'webhookUrl', label: 'URL del Webhook', placeholder: 'https://tu-dominio.com/api/webhooks/telegram', required: true }],
          },
          {
            key: 'send_message', label: 'Enviar Mensaje', description: 'Envía un mensaje de prueba a un chat.',
            inputs: [
              { key: 'chatId', label: 'Chat ID', placeholder: 'Ej: 123456789', required: true },
              { key: 'text', label: 'Texto', placeholder: 'Mensaje de prueba' },
            ],
          },
        ],
      },
      {
        provider: IntegrationProvider.TIKTOK,
        label: 'TikTok Business',
        tests: [
          { key: 'business_info', label: 'Info de Business', description: 'Verifica acceso a la cuenta de negocio via /business/get/.' },
          { key: 'advertiser_info', label: 'Info de Advertiser', description: 'Consulta el advertiser asociado (Marketing API). Usa businessId como advertiser_id.' },
          { key: 'user_info', label: 'Info de Usuario', description: 'Obtiene datos del usuario autenticado vía /user/info/.' },
          {
            key: 'send_message', label: 'Enviar Mensaje (EXPERIMENTAL)', description: 'TikTok no expone API pública general de DM. Requiere partnership TikTok Business Messaging.',
            inputs: [
              { key: 'userId', label: 'User ID', placeholder: 'Ej: open_id_del_usuario', required: true },
              { key: 'text', label: 'Texto', placeholder: 'Mensaje de prueba' },
            ],
          },
        ],
      },
    ];
  }

  async getAllIntegrations(): Promise<Integration[]> {
    return this.integrationRepo.find({
      order: { provider: 'ASC', createdAt: 'DESC' },
    });
  }

  async runTest(
    integrationId: string,
    testKey: string,
    params: Record<string, any> = {},
  ): Promise<TestResult> {
    const integration = await this.integrationRepo.findOne({
      where: { id: integrationId },
    });

    if (!integration) {
      throw new NotFoundException('Integración no encontrada');
    }

    const start = Date.now();
    try {
      const result = await this.executeTest(integration, testKey, params);
      result.duration = Date.now() - start;
      return result;
    } catch (error) {
      return {
        test: testKey,
        success: false,
        message: (error as Error).message,
        duration: Date.now() - start,
      };
    }
  }

  private async executeTest(
    integration: Integration,
    testKey: string,
    params: Record<string, any>,
  ): Promise<TestResult> {
    const config = integration.config;

    switch (integration.provider) {
      case IntegrationProvider.META:
        return this.runMetaTest(config, testKey, params);
      case IntegrationProvider.INSTAGRAM:
        return this.runInstagramTest(config, testKey, params);
      case IntegrationProvider.WHATSAPP:
        return this.runWhatsAppTest(config, testKey, params);
      case IntegrationProvider.TELEGRAM:
        return this.runTelegramTest(config, testKey, params);
      case IntegrationProvider.TIKTOK:
        return this.runTikTokTest(config, testKey, params);
      default:
        return { test: testKey, success: false, message: 'Proveedor no soportado', duration: 0 };
    }
  }

  // ── Meta (Facebook Messenger) ──────────────────────────────────

  private async runMetaTest(
    config: Record<string, any>,
    testKey: string,
    params: Record<string, any>,
  ): Promise<TestResult> {
    const token = config.pageAccessToken;
    const pageId = config.pageId;
    const appId = config.appId;
    const appSecret = config.appSecret;
    // debug_token requiere App Access Token como access_token
    const appAccessToken = appId && appSecret ? `${appId}|${appSecret}` : token;

    switch (testKey) {
      case 'token_check': {
        const data = await this.graphGet(
          `/debug_token?input_token=${token}&access_token=${appAccessToken}`,
        );
        const info = data.data || {};
        const scopes = info.scopes || [];
        const isValid = info.is_valid === true;
        const type = info.type || 'unknown';
        const tokenAppId = info.app_id || '';
        const expiresAt = info.expires_at === 0 ? 'nunca' : info.expires_at ? new Date(info.expires_at * 1000).toISOString() : 'desconocido';
        return {
          test: testKey,
          success: isValid,
          message: isValid
            ? `Token válido | Tipo: ${type} | App: ${tokenAppId} | Expira: ${expiresAt} | Scopes: ${scopes.join(', ') || 'ninguno'}`
            : `Token INVÁLIDO: ${info.error?.message || 'Expirado o revocado'}`,
          details: info,
          duration: 0,
        };
      }
      case 'page_info': {
        const data = await this.graphGet(
          `/debug_token?input_token=${token}&access_token=${appAccessToken}`,
        );
        const info = data.data || {};
        const scopes = info.scopes || [];
        const profileId = info.profile_id || '';
        const granular = info.granular_scopes || [];
        const matchesPage = profileId === pageId;
        const hasMessaging = scopes.includes('pages_messaging') || granular.some((g: any) => g.scope === 'pages_messaging');
        const hasMetadata = scopes.includes('pages_manage_metadata') || granular.some((g: any) => g.scope === 'pages_manage_metadata');
        return {
          test: testKey,
          success: matchesPage && hasMessaging,
          message: [
            `Page ID en token: ${profileId || 'N/A'}`,
            matchesPage ? 'coincide con config' : `NO coincide con ${pageId}`,
            `pages_messaging: ${hasMessaging ? 'SI' : 'NO'}`,
            `pages_manage_metadata: ${hasMetadata ? 'SI' : 'NO'}`,
          ].join(' | '),
          details: { ...info, granular_scopes: granular },
          duration: 0,
        };
      }
      case 'app_subscriptions': {
        // Intentar leer suscripciones; si falla por permisos, intentar vía app token
        try {
          const data = await this.graphGet(`/${pageId}/subscribed_apps?access_token=${token}`);
          const apps = data.data || [];
          const fields = apps.flatMap((a: any) => a.subscribed_fields || []);
          const hasMessages = fields.includes('messages');
          const hasDelivery = fields.includes('message_deliveries');
          const hasRead = fields.includes('message_reads');
          return {
            test: testKey,
            success: hasMessages,
            message: hasMessages
              ? `Suscrito: messages=${hasMessages}, deliveries=${hasDelivery}, reads=${hasRead}`
              : 'La página NO está suscrita a eventos de mensajería. Usa "Suscribir Página".',
            details: { apps, subscribedFields: fields },
            duration: 0,
          };
        } catch {
          // Si falta permiso para leer, probar con subscribe_page como indicador
          return {
            test: testKey,
            success: false,
            message: 'No se puede leer suscripciones (requiere pages_manage_metadata con permiso de lectura). Usa "Suscribir Página" y luego "Enviar Mensaje" para verificar.',
            duration: 0,
          };
        }
      }
      case 'subscribe_page': {
        const data = await this.graphPost(
          `/${pageId}/subscribed_apps?subscribed_fields=messages,message_deliveries,message_reads&access_token=${token}`,
        );
        return {
          test: testKey,
          success: data.success === true,
          message: data.success ? 'Página suscrita correctamente a eventos de mensajería.' : 'No se pudo suscribir la página.',
          details: data,
          duration: 0,
        };
      }
      case 'send_message': {
        const recipientId = params.recipientId;
        if (!recipientId) return { test: testKey, success: false, message: 'PSID del destinatario requerido', duration: 0 };
        const text = params.text || 'Mensaje de prueba desde netHylo';
        const data = await this.graphPost(
          `/me/messages?access_token=${token}`,
          { recipient: { id: recipientId }, message: { text } },
        );
        return {
          test: testKey,
          success: !!data.message_id,
          message: data.message_id ? `Mensaje enviado: ${data.message_id}` : `Error: ${JSON.stringify(data)}`,
          details: data,
          duration: 0,
        };
      }
      case 'get_profile': {
        const psid = params.psid;
        if (!psid) return { test: testKey, success: false, message: 'PSID requerido', duration: 0 };
        const data = await this.graphGet(
          `/${psid}?fields=first_name,last_name,profile_pic&access_token=${token}`,
        );
        return {
          test: testKey,
          success: !!data.first_name,
          message: `Perfil: ${data.first_name} ${data.last_name || ''}`.trim(),
          details: data,
          duration: 0,
        };
      }
      default:
        return { test: testKey, success: false, message: 'Test no definido', duration: 0 };
    }
  }

  // ── Instagram ──────────────────────────────────────────────────

  private async runInstagramTest(
    config: Record<string, any>,
    testKey: string,
    params: Record<string, any>,
  ): Promise<TestResult> {
    const token = config.accessToken;
    const igAccountId = config.igAccountId;
    const appId = config.appId;
    const appSecret = config.appSecret;
    const appAccessToken = appId && appSecret ? `${appId}|${appSecret}` : token;

    switch (testKey) {
      case 'token_check': {
        const data = await this.graphGet(
          `/debug_token?input_token=${token}&access_token=${appAccessToken}`,
        );
        const info = data.data || {};
        const scopes = info.scopes || [];
        const isValid = info.is_valid === true;
        const hasIgMessages = scopes.includes('instagram_manage_messages');
        const hasIgBasic = scopes.includes('instagram_basic');
        return {
          test: testKey,
          success: isValid && hasIgMessages,
          message: isValid
            ? `Token válido | instagram_manage_messages: ${hasIgMessages ? 'SI' : 'NO'} | instagram_basic: ${hasIgBasic ? 'SI' : 'NO'} | Scopes: ${scopes.join(', ')}`
            : `Token INVÁLIDO: ${info.error?.message || 'Expirado o revocado'}`,
          details: info,
          duration: 0,
        };
      }
      case 'account_info': {
        // Intentar con campos mínimos primero, luego con más si funciona
        try {
          const data = await this.graphGet(
            `/${igAccountId}?fields=id,username,name,profile_picture_url,followers_count,media_count&access_token=${token}`,
          );
          return {
            test: testKey,
            success: !!data.username,
            message: `Cuenta: @${data.username} | ${data.name} | ${data.followers_count || 0} seguidores`,
            details: data,
            duration: 0,
          };
        } catch {
          // Fallback: solo id,username
          const data = await this.graphGet(
            `/${igAccountId}?fields=id,username&access_token=${token}`,
          );
          return {
            test: testKey,
            success: !!data.id,
            message: data.username ? `Cuenta: @${data.username} (${data.id})` : `ID verificado: ${data.id}`,
            details: data,
            duration: 0,
          };
        }
      }
      case 'send_message': {
        const recipientId = params.recipientId;
        if (!recipientId) return { test: testKey, success: false, message: 'Instagram-scoped ID del destinatario requerido', duration: 0 };
        const text = params.text || 'Mensaje de prueba desde netHylo';
        const data = await this.graphPost(
          `/${igAccountId}/messages?access_token=${token}`,
          { recipient: { id: recipientId }, message: { text } },
        );
        return {
          test: testKey,
          success: !!data.message_id,
          message: data.message_id ? `DM enviado: ${data.message_id}` : `Error: ${JSON.stringify(data)}`,
          details: data,
          duration: 0,
        };
      }
      default:
        return { test: testKey, success: false, message: 'Test no definido', duration: 0 };
    }
  }

  // ── WhatsApp ───────────────────────────────────────────────────

  private async runWhatsAppTest(
    config: Record<string, any>,
    testKey: string,
    params: Record<string, any>,
  ): Promise<TestResult> {
    const token = config.accessToken;
    const phoneNumberId = config.phoneNumberId;
    const businessAccountId = config.businessAccountId;

    switch (testKey) {
      case 'business_verify': {
        const data = await this.graphGet(`/${businessAccountId}?access_token=${token}`);
        return {
          test: testKey,
          success: !!data.id,
          message: `Cuenta verificada: ${data.name || data.id}`,
          details: data,
          duration: 0,
        };
      }
      case 'phone_info': {
        const data = await this.graphGet(
          `/${phoneNumberId}?fields=verified_name,display_phone_number,quality_rating,code_verification_status&access_token=${token}`,
        );
        return {
          test: testKey,
          success: !!data.display_phone_number,
          message: `${data.verified_name} | ${data.display_phone_number} | Calidad: ${data.quality_rating || 'N/A'}`,
          details: data,
          duration: 0,
        };
      }
      case 'send_template': {
        const phone = params.phone;
        const templateName = params.templateName;
        if (!phone || !templateName) {
          return { test: testKey, success: false, message: 'Teléfono y nombre del template requeridos', duration: 0 };
        }
        const language = params.language || 'es';
        const body = {
          messaging_product: 'whatsapp',
          to: phone,
          type: 'template',
          template: { name: templateName, language: { code: language } },
        };
        const res = await fetch(`${GRAPH_API}/${phoneNumberId}/messages`, {
          method: 'POST',
          headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
          body: JSON.stringify(body),
        });
        const data = await res.json();
        const msgId = data.messages?.[0]?.id;
        return {
          test: testKey,
          success: !!msgId,
          message: msgId ? `Template enviado: ${msgId}` : `Error: ${JSON.stringify(data)}`,
          details: data,
          duration: 0,
        };
      }
      case 'send_text': {
        const phone = params.phone;
        if (!phone) return { test: testKey, success: false, message: 'Teléfono requerido', duration: 0 };
        const text = params.text || 'Mensaje de prueba desde netHylo';
        const body = {
          messaging_product: 'whatsapp',
          to: phone,
          type: 'text',
          text: { body: text },
        };
        const res = await fetch(`${GRAPH_API}/${phoneNumberId}/messages`, {
          method: 'POST',
          headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
          body: JSON.stringify(body),
        });
        const data = await res.json();
        const msgId = data.messages?.[0]?.id;
        return {
          test: testKey,
          success: !!msgId,
          message: msgId ? `Texto enviado: ${msgId}` : `Error: ${JSON.stringify(data)}`,
          details: data,
          duration: 0,
        };
      }
      default:
        return { test: testKey, success: false, message: 'Test no definido', duration: 0 };
    }
  }

  // ── Telegram ───────────────────────────────────────────────────

  private async runTelegramTest(
    config: Record<string, any>,
    testKey: string,
    params: Record<string, any>,
  ): Promise<TestResult> {
    const botToken = config.botToken;
    const base = `${TELEGRAM_API}${botToken}`;

    switch (testKey) {
      case 'bot_info': {
        const res = await fetch(`${base}/getMe`);
        const data = await res.json();
        if (!data.ok) return { test: testKey, success: false, message: `Error: ${data.description}`, details: data, duration: 0 };
        const bot = data.result;
        return {
          test: testKey,
          success: true,
          message: `Bot: @${bot.username} | ${bot.first_name} | canJoinGroups=${bot.can_join_groups}`,
          details: bot,
          duration: 0,
        };
      }
      case 'webhook_info': {
        const res = await fetch(`${base}/getWebhookInfo`);
        const data = await res.json();
        if (!data.ok) return { test: testKey, success: false, message: `Error: ${data.description}`, details: data, duration: 0 };
        const info = data.result;
        return {
          test: testKey,
          success: !!info.url,
          message: info.url
            ? `Webhook: ${info.url} | pendingUpdates=${info.pending_update_count} | lastError=${info.last_error_message || 'ninguno'}`
            : 'No hay webhook configurado.',
          details: info,
          duration: 0,
        };
      }
      case 'set_webhook': {
        const webhookUrl = params.webhookUrl;
        if (!webhookUrl) return { test: testKey, success: false, message: 'URL del webhook requerida', duration: 0 };
        const res = await fetch(`${base}/setWebhook`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            url: webhookUrl,
            secret_token: config.secretToken || undefined,
          }),
        });
        const data = await res.json();
        return {
          test: testKey,
          success: data.ok === true,
          message: data.ok ? 'Webhook configurado correctamente.' : `Error: ${data.description}`,
          details: data,
          duration: 0,
        };
      }
      case 'send_message': {
        const chatId = params.chatId;
        if (!chatId) return { test: testKey, success: false, message: 'Chat ID requerido', duration: 0 };
        const text = params.text || 'Mensaje de prueba desde netHylo';
        const res = await fetch(`${base}/sendMessage`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ chat_id: chatId, text, parse_mode: 'HTML' }),
        });
        const data = await res.json();
        return {
          test: testKey,
          success: data.ok === true,
          message: data.ok ? `Mensaje enviado: ID ${data.result?.message_id}` : `Error: ${data.description}`,
          details: data.result || data,
          duration: 0,
        };
      }
      default:
        return { test: testKey, success: false, message: 'Test no definido', duration: 0 };
    }
  }

  // ── TikTok ─────────────────────────────────────────────────────

  private async runTikTokTest(
    config: Record<string, any>,
    testKey: string,
    params: Record<string, any>,
  ): Promise<TestResult> {
    const token = config.accessToken;
    const businessId = config.businessId;

    switch (testKey) {
      case 'advertiser_info': {
        // Marketing API — requiere que businessId sea un advertiser_id válido
        const res = await fetch(
          `${TIKTOK_API}/advertiser/info/?advertiser_ids=%5B%22${businessId}%22%5D`,
          { headers: { 'Access-Token': token } },
        );
        const data = await res.json();
        const list = data.data?.list || [];
        return {
          test: testKey,
          success: data.code === 0 && list.length > 0,
          message: data.code === 0
            ? (list.length > 0
              ? `Advertiser: ${list[0].name || list[0].advertiser_id}`
              : 'Token válido pero sin advertisers accesibles')
            : `Error ${data.code}: ${data.message}`,
          details: data,
          duration: 0,
        };
      }
      case 'user_info': {
        const res = await fetch(`${TIKTOK_API}/user/info/`, {
          headers: { 'Access-Token': token },
        });
        const data = await res.json();
        return {
          test: testKey,
          success: data.code === 0,
          message: data.code === 0
            ? `Usuario: ${data.data?.display_name || data.data?.core_user_id || 'OK'}`
            : `Error ${data.code}: ${data.message}`,
          details: data,
          duration: 0,
        };
      }
      case 'send_message': {
        const userId = params.userId;
        if (!userId) return { test: testKey, success: false, message: 'User ID requerido', duration: 0 };
        const text = params.text || 'Mensaje de prueba desde netHylo';
        // TikTok no tiene API pública general de DM — este endpoint es hipotético/partner
        const res = await fetch(`${TIKTOK_API}/business/messages/send/`, {
          method: 'POST',
          headers: { 'Access-Token': token, 'Content-Type': 'application/json' },
          body: JSON.stringify({
            business_id: businessId,
            user_id: userId,
            message_type: 'text',
            content: { text },
          }),
        });
        const data = await res.json();
        return {
          test: testKey,
          success: data.code === 0,
          message: data.code === 0
            ? `Mensaje enviado: ${data.data?.message_id || 'OK'}`
            : `Error ${data.code}: ${data.message} (TikTok DM API requiere partnership directo)`,
          details: data,
          duration: 0,
        };
      }
      default:
        return { test: testKey, success: false, message: 'Test no definido', duration: 0 };
    }
  }

  // ── Helpers ────────────────────────────────────────────────────

  private async graphGet(path: string): Promise<any> {
    const res = await fetch(`${GRAPH_API}${path}`);
    const data = await res.json();
    if (data.error) {
      throw new Error(`Graph API: ${data.error.message} (code ${data.error.code})`);
    }
    return data;
  }

  private async graphPost(path: string, body?: any): Promise<any> {
    const res = await fetch(`${GRAPH_API}${path}`, {
      method: 'POST',
      headers: body ? { 'Content-Type': 'application/json' } : {},
      body: body ? JSON.stringify(body) : undefined,
    });
    const data = await res.json();
    if (data.error) {
      throw new Error(`Graph API: ${data.error.message} (code ${data.error.code})`);
    }
    return data;
  }
}
