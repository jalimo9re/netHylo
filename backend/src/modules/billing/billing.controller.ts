import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  Patch,
  Post,
  Query,
  Request,
  UseGuards,
} from '@nestjs/common';
import { BillingService } from './billing.service';
import { Roles } from '@/common/decorators/roles.decorator';
import { RolesGuard } from '@/common/guards/roles.guard';
import { UserRole } from '@/database/entities/user.entity';

@Controller('billing')
@UseGuards(RolesGuard)
@Roles(UserRole.ADMIN, UserRole.SUPERADMIN)
export class BillingController {
  constructor(private readonly billingService: BillingService) {}

  @Get('metrics')
  getMetrics(@Request() req: any, @Query('periodDays') periodDays?: string) {
    const days = periodDays ? parseInt(periodDays, 10) : 30;
    return this.billingService.getMetrics(req.tenantId, Number.isFinite(days) ? days : 30);
  }

  @Get('products')
  listProducts(@Request() req: any) {
    return this.billingService.listProducts(req.tenantId);
  }

  @Post('products')
  createProduct(@Request() req: any, @Body() data: any) {
    return this.billingService.createProduct(req.tenantId, data);
  }

  @Patch('products/:id')
  updateProduct(@Request() req: any, @Param('id') id: string, @Body() data: any) {
    return this.billingService.updateProduct(req.tenantId, id, data);
  }

  @Delete('products/:id')
  deleteProduct(@Request() req: any, @Param('id') id: string) {
    return this.billingService.deleteProduct(req.tenantId, id);
  }

  @Get('prices')
  listPrices(@Request() req: any, @Query('productId') productId?: string) {
    return this.billingService.listPrices(req.tenantId, productId);
  }

  @Post('prices')
  createPrice(@Request() req: any, @Body() data: any) {
    return this.billingService.createPrice(req.tenantId, data);
  }

  @Patch('prices/:id')
  updatePrice(@Request() req: any, @Param('id') id: string, @Body() data: any) {
    return this.billingService.updatePrice(req.tenantId, id, data);
  }

  @Delete('prices/:id')
  deletePrice(@Request() req: any, @Param('id') id: string) {
    return this.billingService.deletePrice(req.tenantId, id);
  }

  @Get('invoices')
  listInvoices(@Request() req: any) {
    return this.billingService.listInvoices(req.tenantId);
  }

  @Get('invoices/:id')
  getInvoice(@Request() req: any, @Param('id') id: string) {
    return this.billingService.getInvoice(req.tenantId, id);
  }

  @Post('invoices')
  createInvoice(@Request() req: any, @Body() data: any) {
    return this.billingService.createInvoice(req.tenantId, data);
  }

  @Post('payments')
  recordPayment(@Request() req: any, @Body() data: any) {
    return this.billingService.recordPayment(req.tenantId, data);
  }

  @Get('subscriptions')
  listSubscriptions(@Request() req: any) {
    return this.billingService.listSubscriptions(req.tenantId);
  }

  @Post('subscriptions')
  createSubscription(@Request() req: any, @Body() data: any) {
    return this.billingService.createSubscription(req.tenantId, data);
  }
}
