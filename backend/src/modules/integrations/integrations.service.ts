import {
  Injectable,
  NotFoundException,
  BadRequestException,
  Logger,
  ForbiddenException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Integration, IntegrationProvider } from '@/database/entities/integration.entity';
import { Tenant } from '@/database/entities/tenant.entity';

const GRAPH_API_URL = 'https://graph.facebook.com/v21.0';

@Injectable()
export class IntegrationsService {
  private readonly logger = new Logger(IntegrationsService.name);

  constructor(
    @InjectRepository(Integration)
    private integrationRepo: Repository<Integration>,
    @InjectRepository(Tenant)
    private tenantRepo: Repository<Tenant>,
  ) {}

  async findAllByTenant(tenantId: string) {
    return this.integrationRepo.find({ where: { tenantId } });
  }

  async findOne(id: string, tenantId: string) {
    const integration = await this.integrationRepo.findOne({
      where: { id, tenantId },
    });
    if (!integration) throw new NotFoundException('Integration not found');
    return integration;
  }

  async create(tenantId: string, data: Partial<Integration>) {
    const tenant = await this.tenantRepo.findOne({
      where: { id: tenantId },
      relations: ['plan'],
    });

    if (tenant && tenant.plan && tenant.plan.maxIntegrations !== -1) {
      const count = await this.integrationRepo.count({ where: { tenantId } });
      if (count >= tenant.plan.maxIntegrations) {
        throw new ForbiddenException(
          `Tu plan permite un máximo de ${tenant.plan.maxIntegrations} integraciones.`,
        );
      }
    }

    if (data.provider === IntegrationProvider.WHATSAPP) {
      await this.verifyWhatsAppBusinessAccount(data.config || {});
    }
    if (data.provider === IntegrationProvider.INSTAGRAM) {
      await this.verifyInstagramAccount(data.config || {});
    }

    const integration = this.integrationRepo.create({
      ...data,
      tenantId,
    });
    return this.integrationRepo.save(integration);
  }

  async update(id: string, tenantId: string, data: Partial<Integration>) {
    const existing = await this.findOne(id, tenantId);
    const mergedConfig = data.config ? { ...existing.config, ...data.config } : existing.config;

    if (existing.provider === IntegrationProvider.WHATSAPP && data.config) {
      await this.verifyWhatsAppBusinessAccount(mergedConfig);
    }
    if (existing.provider === IntegrationProvider.INSTAGRAM && data.config) {
      await this.verifyInstagramAccount(mergedConfig);
    }

    await this.integrationRepo.update(id, data);
    return this.findOne(id, tenantId);
  }

  async remove(id: string, tenantId: string) {
    const integration = await this.findOne(id, tenantId);
    await this.integrationRepo.remove(integration);
  }

  /**
   * Validates the Instagram integration by reading the IG account profile
   * via instagram_basic permission (Graph API).
   */
  private async verifyInstagramAccount(config: Record<string, any>) {
    const { igAccountId, accessToken } = config;
    if (!igAccountId || !accessToken) return;

    try {
      const response = await fetch(
        `${GRAPH_API_URL}/${igAccountId}?fields=id,username,name,profile_picture_url&access_token=${accessToken}`,
      );
      const data = await response.json();

      if (!response.ok) {
        this.logger.error(
          `Instagram account verification failed: ${JSON.stringify(data)}`,
        );
        throw new BadRequestException(
          `No se pudo verificar la cuenta de Instagram: ${data.error?.message || 'Error desconocido'}`,
        );
      }

      this.logger.log(
        `Instagram account verified. igAccountId=${igAccountId} username=${data.username || 'n/a'} name=${data.name || 'n/a'}`,
      );
    } catch (error) {
      if (error instanceof BadRequestException) throw error;
      this.logger.error(`Instagram verification call failed: ${(error as Error).message}`);
      throw new BadRequestException(
        'No se pudo conectar con la API de Instagram. Verifica el token y el Account ID.',
      );
    }
  }

  /**
   * Validates the WhatsApp integration by reading the Business Account
   * via the business_management permission (Graph API).
   */
  private async verifyWhatsAppBusinessAccount(config: Record<string, any>) {
    const { businessAccountId, accessToken } = config;
    if (!businessAccountId || !accessToken) return;

    try {
      const response = await fetch(
        `${GRAPH_API_URL}/${businessAccountId}?access_token=${accessToken}`,
      );
      const data = await response.json();

      if (!response.ok) {
        this.logger.error(
          `business_management verification failed: ${JSON.stringify(data)}`,
        );
        throw new BadRequestException(
          `No se pudo verificar la cuenta de negocio: ${data.error?.message || 'Error desconocido'}`,
        );
      }

      this.logger.log(
        `business_management verified. accountId=${businessAccountId} name=${data.name || 'n/a'}`,
      );
    } catch (error) {
      if (error instanceof BadRequestException) throw error;
      this.logger.error(`business_management call failed: ${(error as Error).message}`);
      throw new BadRequestException(
        'No se pudo conectar con la API de Meta. Verifica el token y el Business Account ID.',
      );
    }
  }
}
