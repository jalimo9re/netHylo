import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { SystemConfig } from '@/database/entities/system-config.entity';

@Injectable()
export class SystemConfigService {
  constructor(
    @InjectRepository(SystemConfig)
    private configRepo: Repository<SystemConfig>,
  ) {}

  async get(key: string): Promise<any> {
    const config = await this.configRepo.findOne({ where: { key } });
    if (!config) return null;
    try {
      return JSON.parse(config.value);
    } catch {
      return config.value;
    }
  }

  async set(key: string, value: any) {
    const stringValue = typeof value === 'string' ? value : JSON.stringify(value);
    const existing = await this.configRepo.findOne({ where: { key } });
    
    if (existing) {
      await this.configRepo.update(key, { value: stringValue });
    } else {
      await this.configRepo.save(this.configRepo.create({ key, value: stringValue }));
    }
  }

  async getAll() {
    const configs = await this.configRepo.find();
    return configs.reduce((acc: Record<string, any>, curr) => {
      try {
        acc[curr.key] = JSON.parse(curr.value);
      } catch {
        acc[curr.key] = curr.value;
      }
      return acc;
    }, {});
  }
}
