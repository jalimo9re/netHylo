import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  Patch,
  Post,
  Request,
  UseGuards,
} from '@nestjs/common';
import { SitesService } from './sites.service';
import { Roles } from '@/common/decorators/roles.decorator';
import { RolesGuard } from '@/common/guards/roles.guard';
import { UserRole } from '@/database/entities/user.entity';
import {
  CreatePageDto,
  CreateSiteDto,
  UpdatePageDto,
  UpdateSiteDto,
} from './dto/site-builder.dto';

@Controller('sites')
@UseGuards(RolesGuard)
@Roles(UserRole.ADMIN, UserRole.SUPERADMIN, UserRole.AGENT)
export class SitesController {
  constructor(private readonly sitesService: SitesService) {}

  @Get()
  list(@Request() req: { tenantId: string }) {
    return this.sitesService.listSites(req.tenantId);
  }

  @Get(':id')
  get(@Request() req: { tenantId: string }, @Param('id') id: string) {
    return this.sitesService.getSite(req.tenantId, id);
  }

  @Post()
  create(@Request() req: { tenantId: string }, @Body() data: CreateSiteDto) {
    return this.sitesService.createSite(req.tenantId, data);
  }

  @Patch(':id')
  update(
    @Request() req: { tenantId: string },
    @Param('id') id: string,
    @Body() data: UpdateSiteDto,
  ) {
    return this.sitesService.updateSite(req.tenantId, id, data);
  }

  @Delete(':id')
  remove(@Request() req: { tenantId: string }, @Param('id') id: string) {
    return this.sitesService.deleteSite(req.tenantId, id);
  }

  @Patch(':id/publish')
  publish(
    @Request() req: { tenantId: string },
    @Param('id') id: string,
    @Body('isPublished') isPublished: boolean,
  ) {
    return this.sitesService.publishSite(req.tenantId, id, Boolean(isPublished));
  }

  @Get(':siteId/pages')
  listPages(@Request() req: { tenantId: string }, @Param('siteId') siteId: string) {
    return this.sitesService.listPages(req.tenantId, siteId);
  }

  @Post(':siteId/pages')
  createPage(
    @Request() req: { tenantId: string },
    @Param('siteId') siteId: string,
    @Body() data: CreatePageDto,
  ) {
    return this.sitesService.createPage(req.tenantId, siteId, data);
  }

  @Patch(':siteId/pages/:pageId')
  updatePage(
    @Request() req: { tenantId: string },
    @Param('siteId') siteId: string,
    @Param('pageId') pageId: string,
    @Body() data: UpdatePageDto,
  ) {
    return this.sitesService.updatePage(req.tenantId, siteId, pageId, data);
  }

  @Delete(':siteId/pages/:pageId')
  deletePage(
    @Request() req: { tenantId: string },
    @Param('siteId') siteId: string,
    @Param('pageId') pageId: string,
  ) {
    return this.sitesService.deletePage(req.tenantId, siteId, pageId);
  }
}
