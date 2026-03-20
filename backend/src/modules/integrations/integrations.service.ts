import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Integration } from '@/database/entities/integration.entity';

@Injectable()
export class IntegrationsService {
  constructor(
    @InjectRepository(Integration)
    private integrationRepo: Repository<Integration>,
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
    const integration = this.integrationRepo.create({
      ...data,
      tenantId,
    });
    return this.integrationRepo.save(integration);
  }

  async update(id: string, tenantId: string, data: Partial<Integration>) {
    await this.findOne(id, tenantId);
    await this.integrationRepo.update(id, data);
    return this.findOne(id, tenantId);
  }

  async remove(id: string, tenantId: string) {
    const integration = await this.findOne(id, tenantId);
    await this.integrationRepo.remove(integration);
  }
}
