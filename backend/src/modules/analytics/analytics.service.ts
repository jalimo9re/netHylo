import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { MoreThanOrEqual, Repository } from 'typeorm';
import {
  BillingInvoice,
  BillingInvoiceStatus,
  Campaign,
  CampaignEvent,
  CampaignEventType,
  CampaignStatus,
  CrmDeal,
  CrmPipeline,
  FormSubmission,
} from '@/database/entities';
import { DashboardService } from '../dashboard/dashboard.service';

@Injectable()
export class AnalyticsService {
  constructor(
    private dashboardService: DashboardService,
    @InjectRepository(CrmPipeline) private pipelineRepo: Repository<CrmPipeline>,
    @InjectRepository(CrmDeal) private dealRepo: Repository<CrmDeal>,
    @InjectRepository(FormSubmission) private submissionRepo: Repository<FormSubmission>,
    @InjectRepository(Campaign) private campaignRepo: Repository<Campaign>,
    @InjectRepository(CampaignEvent) private eventRepo: Repository<CampaignEvent>,
    @InjectRepository(BillingInvoice) private invoiceRepo: Repository<BillingInvoice>,
  ) {}

  async getOverview(tenantId: string) {
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const inbox = await this.dashboardService.getStats(tenantId);
    const crm = await this.getCrmSummary(tenantId);
    const forms = await this.getFormsSummary(tenantId, today);
    const campaigns = await this.getCampaignsSummary(tenantId);
    const revenue = await this.getRevenueSummary(tenantId);

    return {
      generatedAt: new Date().toISOString(),
      inbox,
      crm,
      forms,
      campaigns,
      revenue,
      kpis: [
        { key: 'openConversations', label: 'Conversaciones abiertas', value: inbox.openConversations, icon: 'chat' },
        { key: 'messagesToday', label: 'Mensajes hoy', value: inbox.messagesToday, icon: 'message' },
        { key: 'contacts', label: 'Contactos', value: inbox.contacts, icon: 'people' },
        { key: 'activeIntegrations', label: 'Integraciones activas', value: inbox.activeIntegrations, icon: 'extension' },
        { key: 'totalDeals', label: 'Oportunidades CRM', value: crm.totalDeals, icon: 'view_kanban' },
        { key: 'pipelineValue', label: 'Valor pipeline', value: crm.pipelineValue, icon: 'payments' },
        { key: 'formSubmissionsToday', label: 'Leads hoy (formularios)', value: forms.submissionsToday, icon: 'description' },
        { key: 'campaignsSent', label: 'Campañas enviadas', value: campaigns.completed, icon: 'campaign' },
        { key: 'campaignOpenRate', label: 'Tasa apertura campañas', value: campaigns.avgOpenRate, icon: 'mark_email_read' },
        { key: 'wonRevenue', label: 'Ingresos ganados (CRM)', value: revenue.wonAmount, icon: 'trending_up' },
        { key: 'billingRevenue', label: 'Facturación cobrada', value: revenue.billingRevenue, icon: 'receipt_long' },
        { key: 'totalRevenue', label: 'Ingresos totales', value: revenue.totalRevenue, icon: 'account_balance' },
      ],
    };
  }

  private async getCrmSummary(tenantId: string) {
    const pipelines = await this.pipelineRepo.find({ where: { tenantId } });
    const deals = await this.dealRepo.find({ where: { tenantId } });
    const totalDeals = deals.length;
    const pipelineValue = deals.reduce((sum, deal) => sum + Number(deal.amount || 0), 0);
    const wonStage = 'Won';
    const wonDeals = deals.filter((d) => d.stage === wonStage).length;

    const byPipeline = await Promise.all(
      pipelines.slice(0, 5).map(async (pipeline) => {
        const pipelineDeals = deals.filter((d) => d.pipelineId === pipeline.id);
        return {
          pipelineId: pipeline.id,
          name: pipeline.name,
          totalDeals: pipelineDeals.length,
          value: pipelineDeals.reduce((sum, d) => sum + Number(d.amount || 0), 0),
        };
      }),
    );

    return { totalDeals, pipelineValue, wonDeals, pipelines: byPipeline };
  }

  private async getFormsSummary(tenantId: string, today: Date) {
    const [submissionsTotal, submissionsToday] = await Promise.all([
      this.submissionRepo.count({ where: { tenantId } }),
      this.submissionRepo.count({
        where: { tenantId, createdAt: MoreThanOrEqual(today) },
      }),
    ]);
    return { submissionsTotal, submissionsToday };
  }

  private async getCampaignsSummary(tenantId: string) {
    const campaigns = await this.campaignRepo.find({ where: { tenantId } });
    const completed = campaigns.filter((c) => c.status === CampaignStatus.COMPLETED).length;
    const scheduled = campaigns.filter((c) => c.status === CampaignStatus.SCHEDULED).length;
    const sending = campaigns.filter((c) => c.status === CampaignStatus.SENDING).length;

    const sentEvents = await this.countEventsByTenant(tenantId, CampaignEventType.SENT);
    const openedEvents = await this.countEventsByTenant(tenantId, CampaignEventType.OPENED);

    const avgOpenRate =
      sentEvents > 0 ? Number(((openedEvents / sentEvents) * 100).toFixed(2)) : 0;

    return {
      total: campaigns.length,
      completed,
      scheduled,
      sending,
      sentEvents,
      openedEvents,
      avgOpenRate,
    };
  }

  private async getRevenueSummary(tenantId: string) {
    const wonDeals = await this.dealRepo.find({ where: { tenantId, stage: 'Won' } });
    const wonAmount = wonDeals.reduce((sum, deal) => sum + Number(deal.amount || 0), 0);

    const paidInvoices = await this.invoiceRepo.find({
      where: { tenantId, status: BillingInvoiceStatus.PAID },
    });
    const billingRevenue = paidInvoices.reduce((sum, inv) => sum + Number(inv.total || 0), 0);

    return {
      sources: ['crm_won_deals', 'billing_invoices'],
      billingAvailable: true,
      wonDeals: wonDeals.length,
      wonAmount,
      paidInvoices: paidInvoices.length,
      billingRevenue,
      totalRevenue: wonAmount + billingRevenue,
    };
  }

  private countEventsByTenant(tenantId: string, eventType: CampaignEventType) {
    return this.eventRepo
      .createQueryBuilder('event')
      .innerJoin('event.campaign', 'campaign')
      .where('campaign.tenant_id = :tenantId', { tenantId })
      .andWhere('event.event_type = :eventType', { eventType })
      .getCount();
  }
}
