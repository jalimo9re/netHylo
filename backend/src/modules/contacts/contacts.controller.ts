import { Controller, Get, Patch, Param, Body, Request, UseGuards } from '@nestjs/common';
import { ContactsService } from './contacts.service';
import { Roles } from '@/common/decorators/roles.decorator';
import { RolesGuard } from '@/common/guards/roles.guard';
import { UserRole } from '@/database/entities/user.entity';

@Controller('contacts')
@UseGuards(RolesGuard)
@Roles(UserRole.ADMIN, UserRole.SUPERADMIN)
export class ContactsController {
  constructor(private contactsService: ContactsService) {}

  @Get()
  findAll(@Request() req: any) {
    return this.contactsService.findAllByTenant(req.tenantId);
  }

  @Get(':id')
  findOne(@Param('id') id: string, @Request() req: any) {
    return this.contactsService.findOne(id, req.tenantId);
  }

  @Patch(':id')
  update(@Param('id') id: string, @Body() data: any, @Request() req: any) {
    return this.contactsService.update(id, req.tenantId, data);
  }
}
