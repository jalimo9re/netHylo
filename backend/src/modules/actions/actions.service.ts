import { Injectable, NotFoundException, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import {
  ActionIntegration,
  ActionProviderType,
} from '@/database/entities/action-integration.entity';
import { ActionProviderFactory } from './providers/action-provider.factory';

@Injectable()
export class ActionsService {
  private readonly logger = new Logger(ActionsService.name);

  constructor(
    @InjectRepository(ActionIntegration)
    private actionIntegrationRepo: Repository<ActionIntegration>,
    private providerFactory: ActionProviderFactory,
  ) {}

  async findAllByTenant(tenantId: string) {
    return this.actionIntegrationRepo.find({ where: { tenantId } });
  }

  async findOne(id: string, tenantId: string) {
    const integration = await this.actionIntegrationRepo.findOne({
      where: { id, tenantId },
    });
    if (!integration) {
      throw new NotFoundException('Action integration not found');
    }
    return integration;
  }

  async create(tenantId: string, data: Partial<ActionIntegration>) {
    const integration = this.actionIntegrationRepo.create({
      ...data,
      tenantId,
    });
    return this.actionIntegrationRepo.save(integration);
  }

  async update(id: string, tenantId: string, data: Partial<ActionIntegration>) {
    await this.findOne(id, tenantId);
    await this.actionIntegrationRepo.update(id, data);
    return this.findOne(id, tenantId);
  }

  async remove(id: string, tenantId: string) {
    const integration = await this.findOne(id, tenantId);
    await this.actionIntegrationRepo.remove(integration);
  }

  async testConnection(id: string, tenantId: string) {
    const integration = await this.findOne(id, tenantId);
    const provider = this.providerFactory.getProvider(integration.provider);
    return provider.testConnection(integration.config);
  }

  async getCapabilities(id: string, tenantId: string) {
    const integration = await this.findOne(id, tenantId);
    const provider = this.providerFactory.getProvider(integration.provider);
    return provider.getCapabilities();
  }

  async executeAction(
    id: string,
    tenantId: string,
    category: string,
    action: string,
    params: Record<string, any>,
  ) {
    const integration = await this.findOne(id, tenantId);
    const provider = this.providerFactory.getProvider(integration.provider);

    this.logger.log(
      `Tenant ${tenantId} executing ${category}.${action} on integration ${id}`,
    );

    return provider.executeAction(integration.config, category, action, params);
  }

  getProvidersSchema() {
    const schema: Record<string, any> = {};
    const providers = this.providerFactory.getAllProviders();

    for (const [type, provider] of providers) {
      schema[type] = {
        label: provider.label,
        fields: provider.getConfigFields(),
        setupGuide: provider.getSetupGuide(),
        capabilities: provider.getCapabilities(),
      };
    }

    return schema;
  }
}
