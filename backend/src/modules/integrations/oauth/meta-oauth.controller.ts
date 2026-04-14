import {
  Controller,
  Get,
  Post,
  Body,
  Query,
  Request,
  Res,
  Logger,
  BadRequestException,
  UseGuards,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Response } from 'express';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Integration, IntegrationProvider, IntegrationStatus } from '@/database/entities/integration.entity';
import { Roles } from '@/common/decorators/roles.decorator';
import { RolesGuard } from '@/common/guards/roles.guard';
import { Public } from '@/common/guards/jwt-auth.guard';
import { UserRole } from '@/database/entities/user.entity';

const GRAPH_API_URL = 'https://graph.facebook.com/v21.0';

@Controller('integrations/oauth')
@UseGuards(RolesGuard)
export class MetaOAuthController {
  private readonly logger = new Logger(MetaOAuthController.name);

  constructor(
    private config: ConfigService,
    @InjectRepository(Integration) private integrationRepo: Repository<Integration>,
  ) {}

  /**
   * Step 1: Frontend calls this to get the OAuth URL, then opens it in a popup.
   */
  @Get('meta/url')
  @Roles(UserRole.ADMIN, UserRole.SUPERADMIN)
  getOAuthUrl(@Query('type') type: 'messenger' | 'instagram') {
    const appId = this.config.get<string>('META_APP_ID');
    const redirectUri = this.config.get<string>('META_OAUTH_REDIRECT_URI');

    if (!appId || !redirectUri) {
      throw new BadRequestException(
        'META_APP_ID y META_OAUTH_REDIRECT_URI deben estar configurados en el servidor.',
      );
    }

    const scopes = type === 'instagram'
      ? 'pages_manage_metadata,instagram_basic,instagram_manage_messages'
      : 'pages_manage_metadata,pages_messaging,pages_read_engagement';

    const state = JSON.stringify({ type });
    const url =
      `https://www.facebook.com/v21.0/dialog/oauth?` +
      `client_id=${appId}` +
      `&redirect_uri=${encodeURIComponent(redirectUri)}` +
      `&scope=${encodeURIComponent(scopes)}` +
      `&state=${encodeURIComponent(state)}` +
      `&response_type=code`;

    return { url };
  }

  /**
   * Step 2: Meta redirects here after user authorizes.
   * This is a PUBLIC page (no JWT) that renders a small HTML page
   * which posts the result back to the opener window.
   */
  @Public()
  @Get('meta/callback')
  async handleCallback(
    @Query('code') code: string,
    @Query('state') state: string,
    @Query('error') error: string,
    @Query('error_description') errorDescription: string,
    @Res() res: Response,
  ) {
    // If user denied
    if (error) {
      this.logger.warn(`OAuth denied: ${error} - ${errorDescription}`);
      return res.send(this.buildCallbackHtml({ error: errorDescription || error }));
    }

    if (!code) {
      return res.send(this.buildCallbackHtml({ error: 'No se recibio codigo de autorizacion' }));
    }

    const appId = this.config.get<string>('META_APP_ID')!;
    const appSecret = this.config.get<string>('META_APP_SECRET')!;
    const redirectUri = this.config.get<string>('META_OAUTH_REDIRECT_URI')!;

    try {
      // Exchange code for short-lived token
      const tokenResponse = await fetch(
        `${GRAPH_API_URL}/oauth/access_token?` +
        `client_id=${appId}` +
        `&client_secret=${appSecret}` +
        `&redirect_uri=${encodeURIComponent(redirectUri)}` +
        `&code=${code}`,
      );
      const tokenData = await tokenResponse.json();

      if (!tokenResponse.ok || !tokenData.access_token) {
        this.logger.error(`Token exchange failed: ${JSON.stringify(tokenData)}`);
        return res.send(this.buildCallbackHtml({ error: 'Error al obtener token de acceso' }));
      }

      const shortToken = tokenData.access_token;

      // Exchange for long-lived token (60 days)
      const longTokenResponse = await fetch(
        `${GRAPH_API_URL}/oauth/access_token?` +
        `grant_type=fb_exchange_token` +
        `&client_id=${appId}` +
        `&client_secret=${appSecret}` +
        `&fb_exchange_token=${shortToken}`,
      );
      const longTokenData = await longTokenResponse.json();
      const longLivedToken = longTokenData.access_token || shortToken;

      // Get user's pages
      const pagesResponse = await fetch(
        `${GRAPH_API_URL}/me/accounts?fields=id,name,access_token,instagram_business_account{id,username,name,profile_picture_url}&access_token=${longLivedToken}`,
      );
      const pagesData = await pagesResponse.json();

      if (!pagesResponse.ok || !pagesData.data?.length) {
        this.logger.error(`Pages fetch failed: ${JSON.stringify(pagesData)}`);
        return res.send(this.buildCallbackHtml({ error: 'No se encontraron paginas de Facebook autorizadas' }));
      }

      const parsedState = JSON.parse(state || '{}');
      const type = parsedState.type || 'messenger';

      // Build pages data for the frontend to choose from
      const pages = pagesData.data.map((page: any) => ({
        pageId: page.id,
        pageName: page.name,
        pageAccessToken: page.access_token,
        instagram: page.instagram_business_account
          ? {
              igAccountId: page.instagram_business_account.id,
              igUsername: page.instagram_business_account.username,
              igName: page.instagram_business_account.name,
            }
          : null,
      }));

      this.logger.log(
        `OAuth successful. Found ${pages.length} pages, type=${type}`,
      );

      return res.send(this.buildCallbackHtml({
        success: true,
        type,
        pages,
        appId,
        appSecret,
      }));
    } catch (err) {
      this.logger.error(`OAuth callback error: ${(err as Error).message}`);
      return res.send(this.buildCallbackHtml({ error: 'Error interno al procesar la autorizacion' }));
    }
  }

  /**
   * Step 3: Frontend sends the selected page data to create the integration.
   */
  @Post('meta/create')
  @Roles(UserRole.ADMIN, UserRole.SUPERADMIN)
  async createFromOAuth(
    @Body() body: {
      type: 'messenger' | 'instagram';
      pageId: string;
      pageName: string;
      pageAccessToken: string;
      igAccountId?: string;
      igUsername?: string;
    },
    @Request() req: any,
  ) {
    const { type, pageId, pageName, pageAccessToken, igAccountId, igUsername } = body;
    const appId = this.config.get<string>('META_APP_ID');
    const appSecret = this.config.get<string>('META_APP_SECRET');
    const verifyToken = `nethylo_${Date.now()}_${Math.random().toString(36).substring(7)}`;

    let integration: Integration;

    if (type === 'instagram' && igAccountId) {
      integration = this.integrationRepo.create({
        tenantId: req.tenantId,
        provider: IntegrationProvider.INSTAGRAM,
        name: `Instagram - ${igUsername || pageName}`,
        status: IntegrationStatus.ACTIVE,
        config: {
          igAccountId,
          igUsername: igUsername || '',
          appId,
          accessToken: pageAccessToken,
          verifyToken,
          appSecret,
        },
      });
    } else {
      integration = this.integrationRepo.create({
        tenantId: req.tenantId,
        provider: IntegrationProvider.META,
        name: `Messenger - ${pageName}`,
        status: IntegrationStatus.ACTIVE,
        config: {
          pageId,
          pageName,
          appId,
          pageAccessToken,
          verifyToken,
          appSecret,
        },
      });
    }

    await this.integrationRepo.save(integration);
    this.logger.log(`Integration created via OAuth: ${integration.id} (${type})`);

    return integration;
  }

  /**
   * Small HTML page that posts result to opener window and closes itself.
   */
  private buildCallbackHtml(data: Record<string, any>): string {
    const json = JSON.stringify(data).replace(/</g, '\\u003c');
    return `
      <!DOCTYPE html>
      <html>
      <head><title>Conectando...</title></head>
      <body style="background:#0f172a;color:#e2e8f0;font-family:system-ui;display:flex;align-items:center;justify-content:center;height:100vh;margin:0">
        <div style="text-align:center">
          <p>${data.error ? '❌ ' + data.error : '✅ Conectado correctamente'}</p>
          <p style="color:#94a3b8;font-size:14px">Puedes cerrar esta ventana</p>
        </div>
        <script>
          if (window.opener) {
            window.opener.postMessage({ source: 'nethylo-oauth', data: ${json} }, '*');
            setTimeout(() => window.close(), 2000);
          }
        </script>
      </body>
      </html>
    `;
  }
}
