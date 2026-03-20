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
      },
      telegram: {
        label: 'Telegram Bot',
        fields: [
          { key: 'botToken', label: 'Bot Token', type: 'password', required: true, help: 'Token del bot proporcionado por @BotFather al crear el bot.' },
          { key: 'botUsername', label: 'Username del bot', type: 'text', required: true, help: 'Username del bot sin @ (ej: mi_empresa_bot).' },
          { key: 'secretToken', label: 'Secret Token', type: 'text', required: true, help: 'Token secreto para validar webhooks. Valor libre, se configura al registrar el webhook con setWebhook.' },
        ],
        webhookUrl: '/api/webhooks/telegram',
        setupNote: 'Registrar el webhook ejecutando: curl -F "url=https://<tu-dominio>/api/webhooks/telegram" -F "secret_token=<tu-secret-token>" https://api.telegram.org/bot<BOT_TOKEN>/setWebhook',
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
