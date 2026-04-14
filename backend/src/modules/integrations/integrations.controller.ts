import {
  Controller,
  Get,
  Post,
  Patch,
  Delete,
  Param,
  Body,
  Request,
  UseGuards,
} from '@nestjs/common';
import { IntegrationsService } from './integrations.service';
import { CreateIntegrationDto } from './dto/create-integration.dto';
import { UpdateIntegrationDto } from './dto/update-integration.dto';
import { Roles } from '@/common/decorators/roles.decorator';
import { RolesGuard } from '@/common/guards/roles.guard';
import { PlanGuard, CheckPlanLimit } from '@/common/guards/plan.guard';
import { UserRole } from '@/database/entities/user.entity';

@Controller('integrations')
@UseGuards(RolesGuard)
export class IntegrationsController {
  constructor(private integrationsService: IntegrationsService) {}

  @Get('providers/config-schema')
  getConfigSchema() {
    return {
      whatsapp: {
        label: 'WhatsApp Business',
        fields: [
          { key: 'phoneNumberId', label: 'Phone Number ID', type: 'text', required: true, help: 'ID del número en Meta Business. Se encuentra en la configuración de WhatsApp Business API.' },
          { key: 'phoneDisplay', label: 'Número de teléfono', type: 'text', required: true, help: 'Número visible para los clientes (ej: +34 612 345 678).' },
          { key: 'businessAccountId', label: 'Business Account ID', type: 'text', required: true, help: 'ID de la cuenta de negocio de WhatsApp en Meta.' },
          { key: 'accessToken', label: 'Access Token', type: 'password', required: true, help: 'Token permanente generado desde Meta for Developers.' },
          { key: 'verifyToken', label: 'Verify Token', type: 'text', required: true, help: 'Token personalizado para verificar el webhook. Debe coincidir con el configurado en Meta.' },
          { key: 'appSecret', label: 'App Secret', type: 'password', required: true, help: 'Secret de la aplicación Meta para validar firmas de webhook.' },
        ],
        webhookUrl: '/api/webhooks/whatsapp',
        setupGuide: [
          { title: 'Crear App en Meta', description: 'Ve a developers.facebook.com > "Mis apps" > "Crear app". Selecciona tipo "Negocio" y vincula tu Business Manager.' },
          { title: 'Activar WhatsApp', description: 'En tu app, busca el producto "WhatsApp" y haz clic en "Configurar". Se te asignara un numero de prueba automaticamente.' },
          { title: 'Obtener credenciales', description: 'En WhatsApp > API Setup encontraras: Phone Number ID, WhatsApp Business Account ID y podras generar un Access Token temporal.' },
          { title: 'Token permanente', description: 'Ve a Business Settings > System Users > crea uno con rol Admin. Asignale tu app con permiso "Manage messages". Genera el token desde ahi.' },
          { title: 'App Secret', description: 'En tu app > Settings > Basic encontraras el App Secret. Copialo tal cual.' },
          { title: 'Configurar Webhook', description: 'En WhatsApp > Configuration > Webhook, pon la URL del webhook y el Verify Token que hayas elegido. Suscribete al campo "messages".' },
        ],
      },
      meta: {
        label: 'Meta (Facebook Messenger)',
        fields: [
          { key: 'pageId', label: 'Page ID', type: 'text', required: true, help: 'ID de la página de Facebook conectada.' },
          { key: 'pageName', label: 'Nombre de la página', type: 'text', required: true, help: 'Nombre visible de la página.' },
          { key: 'appId', label: 'App ID', type: 'text', required: true, help: 'ID de la aplicación en Meta for Developers.' },
          { key: 'pageAccessToken', label: 'Page Access Token', type: 'password', required: true, help: 'Token de acceso de la página con permisos de mensajería.' },
          { key: 'verifyToken', label: 'Verify Token', type: 'text', required: true, help: 'Token personalizado para verificar el webhook.' },
          { key: 'appSecret', label: 'App Secret', type: 'password', required: true, help: 'Secret de la aplicación Meta.' },
        ],
        webhookUrl: '/api/webhooks/meta',
        setupGuide: [
          { title: 'Crear o usar App existente', description: 'En developers.facebook.com, usa la misma app de WhatsApp o crea una nueva de tipo "Negocio".' },
          { title: 'Activar Messenger', description: 'En tu app, busca el producto "Messenger" y haz clic en "Configurar".' },
          { title: 'Conectar Pagina', description: 'En Messenger > Settings, haz clic en "Add or remove Pages" y conecta tu pagina de Facebook.' },
          { title: 'Generar Page Access Token', description: 'En la misma seccion, haz clic en "Generate Token" junto a tu pagina. Este token permite enviar y recibir mensajes.' },
          { title: 'Obtener Page ID', description: 'El Page ID aparece junto al nombre de la pagina en Messenger Settings, o en tu pagina de Facebook > Informacion > Transparencia de la pagina.' },
          { title: 'Configurar Webhook', description: 'En Messenger > Settings > Webhooks, pon la URL del webhook y el Verify Token. Suscribete a: messages, message_deliveries, message_reads.' },
          { title: 'Permisos necesarios', description: 'Tu app necesita los permisos pages_messaging y pages_manage_metadata. En modo desarrollo puedes probar sin aprobacion con usuarios de prueba.' },
        ],
      },
      instagram: {
        label: 'Instagram DM',
        fields: [
          { key: 'igAccountId', label: 'Instagram Account ID', type: 'text', required: true, help: 'ID de la cuenta profesional de Instagram vinculada a la página de Facebook.' },
          { key: 'igUsername', label: 'Usuario de Instagram', type: 'text', required: true, help: 'Nombre de usuario de la cuenta (sin @).' },
          { key: 'appId', label: 'App ID', type: 'text', required: true, help: 'ID de la aplicación en Meta for Developers (misma app que Facebook).' },
          { key: 'accessToken', label: 'Access Token', type: 'password', required: true, help: 'Token con permisos instagram_manage_messages e instagram_basic.' },
          { key: 'verifyToken', label: 'Verify Token', type: 'text', required: true, help: 'Token personalizado para verificar el webhook.' },
          { key: 'appSecret', label: 'App Secret', type: 'password', required: true, help: 'Secret de la aplicación Meta (misma app que Facebook).' },
        ],
        webhookUrl: '/api/webhooks/instagram',
        setupGuide: [
          { title: 'Requisitos previos', description: 'Necesitas: una cuenta de Instagram Profesional (no personal) vinculada a una Pagina de Facebook, y una app de Meta.' },
          { title: 'Activar Instagram en tu app', description: 'En developers.facebook.com > tu app, busca el producto "Instagram" y activa "Instagram Basic Display" o "Messenger" (Instagram DM va por Messenger API).' },
          { title: 'Obtener Instagram Account ID', description: 'En Graph API Explorer, llama a GET /me/accounts para obtener tu Page ID, luego GET /{page-id}?fields=instagram_business_account para obtener el IG Account ID.' },
          { title: 'Generar Access Token', description: 'Usa el Graph API Explorer para generar un token con permisos: instagram_basic, instagram_manage_messages, pages_manage_metadata.' },
          { title: 'Token de larga duracion', description: 'El token del Explorer dura 1 hora. Conviertelo a larga duracion (60 dias) llamando a GET /oauth/access_token?grant_type=fb_exchange_token&client_id={app-id}&client_secret={app-secret}&fb_exchange_token={short-token}' },
          { title: 'Configurar Webhook', description: 'En tu app > Webhooks, configura la URL y el Verify Token. Suscribete al objeto "instagram" con el campo "messages".' },
        ],
      },
      telegram: {
        label: 'Telegram Bot',
        fields: [
          { key: 'botToken', label: 'Bot Token', type: 'password', required: true, help: 'Token del bot proporcionado por @BotFather al crear el bot.' },
          { key: 'botUsername', label: 'Username del bot', type: 'text', required: true, help: 'Username del bot sin @ (ej: mi_empresa_bot).' },
          { key: 'secretToken', label: 'Secret Token', type: 'text', required: true, help: 'Token secreto para validar webhooks. Valor libre, se configura al registrar el webhook con setWebhook.' },
        ],
        webhookUrl: '/api/webhooks/telegram',
        setupGuide: [
          { title: 'Crear bot con BotFather', description: 'Abre Telegram y busca @BotFather. Envia /newbot, elige nombre y username. BotFather te dara el Bot Token.' },
          { title: 'Elegir Secret Token', description: 'Inventa un Secret Token alfanumerico (ej: mi_secreto_123). Lo usaras al registrar el webhook y aqui en la configuracion.' },
          { title: 'Registrar Webhook', description: 'Ejecuta en tu terminal: curl -F "url=https://TU-DOMINIO/api/webhooks/telegram" -F "secret_token=TU_SECRET_TOKEN" https://api.telegram.org/botTU_BOT_TOKEN/setWebhook' },
          { title: 'Verificar', description: 'Puedes verificar que el webhook esta activo con: curl https://api.telegram.org/botTU_BOT_TOKEN/getWebhookInfo' },
        ],
      },
      tiktok: {
        label: 'TikTok Business',
        fields: [
          { key: 'businessId', label: 'Business ID', type: 'text', required: true, help: 'ID de la cuenta de negocio de TikTok.' },
          { key: 'clientKey', label: 'Client Key', type: 'text', required: true, help: 'Client Key de la app en TikTok for Developers.' },
          { key: 'accessToken', label: 'Access Token', type: 'password', required: true, help: 'Token de acceso de la API de TikTok Business.' },
          { key: 'clientSecret', label: 'Client Secret', type: 'password', required: true, help: 'Secret de la aplicación TikTok.' },
        ],
        webhookUrl: '/api/webhooks/tiktok',
        setupGuide: [
          { title: 'Crear app en TikTok for Developers', description: 'Ve a developers.tiktok.com, crea una app y selecciona los productos de Business API.' },
          { title: 'Obtener credenciales', description: 'En tu app encontraras el Client Key y Client Secret en la seccion "App credentials".' },
          { title: 'Obtener Business ID', description: 'En TikTok Ads Manager o Business Center, tu Business ID aparece en la URL o en la configuracion de la cuenta.' },
          { title: 'Generar Access Token', description: 'Sigue el flujo OAuth de TikTok Business API para obtener un Access Token con permisos de mensajeria.' },
        ],
      },
    };
  }

  @Get()
  findAll(@Request() req: any) {
    return this.integrationsService.findAllByTenant(req.tenantId);
  }

  @Get(':id')
  findOne(@Param('id') id: string, @Request() req: any) {
    return this.integrationsService.findOne(id, req.tenantId);
  }

  @Post()
  @Roles(UserRole.ADMIN, UserRole.SUPERADMIN)
  @UseGuards(PlanGuard)
  @CheckPlanLimit('integrations')
  create(@Body() dto: CreateIntegrationDto, @Request() req: any) {
    return this.integrationsService.create(req.tenantId, dto);
  }

  @Patch(':id')
  @Roles(UserRole.ADMIN, UserRole.SUPERADMIN)
  update(
    @Param('id') id: string,
    @Body() dto: UpdateIntegrationDto,
    @Request() req: any,
  ) {
    return this.integrationsService.update(id, req.tenantId, dto);
  }

  @Delete(':id')
  @Roles(UserRole.ADMIN, UserRole.SUPERADMIN)
  remove(@Param('id') id: string, @Request() req: any) {
    return this.integrationsService.remove(id, req.tenantId);
  }
}
