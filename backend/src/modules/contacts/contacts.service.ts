import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Contact } from '@/database/entities/contact.entity';

@Injectable()
export class ContactsService {
  constructor(
    @InjectRepository(Contact) private contactRepo: Repository<Contact>,
  ) {}

  async findAllByTenant(tenantId: string) {
    return this.contactRepo.find({
      where: { tenantId },
      order: { createdAt: 'DESC' },
    });
  }

  async findOne(id: string, tenantId: string) {
    const contact = await this.contactRepo.findOne({
      where: { id, tenantId },
      relations: ['conversations'],
    });
    if (!contact) throw new NotFoundException('Contact not found');
    return contact;
  }

  async update(id: string, tenantId: string, data: Partial<Contact>) {
    await this.findOne(id, tenantId);
    await this.contactRepo.update(id, data);
    return this.findOne(id, tenantId);
  }
}
