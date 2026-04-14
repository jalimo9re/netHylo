import { Controller, Get, Post, Body, UseGuards } from '@nestjs/common';
import { SystemConfigService } from './system-config.service';
import { Roles } from '@/common/decorators/roles.decorator';
import { RolesGuard } from '@/common/guards/roles.guard';
import { UserRole } from '@/database/entities/user.entity';

@Controller('system-config')
@UseGuards(RolesGuard)
@Roles(UserRole.SUPERADMIN)
export class SystemConfigController {
  constructor(private configService: SystemConfigService) {}

  @Get()
  getAll() {
    return this.configService.getAll();
  }

  @Post()
  async set(@Body() body: { key: string; value: any }) {
    await this.configService.set(body.key, body.value);
    return { success: true };
  }

  @Post('bulk')
  async setBulk(@Body() body: Record<string, any>) {
    for (const [key, value] of Object.entries(body)) {
      await this.configService.set(key, value);
    }
    return { success: true };
  }
}
