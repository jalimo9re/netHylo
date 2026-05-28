import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { MatIconModule } from '@angular/material/icon';
import { RouterLink } from '@angular/router';
import {
  DashboardService,
  ActivityItem,
  AgentPerformance,
} from '../../core/services/dashboard.service';
import { AnalyticsService, AnalyticsKpi } from '../../core/services/analytics.service';

@Component({
  selector: 'app-dashboard',
  standalone: true,
  imports: [CommonModule, MatIconModule, RouterLink],
  templateUrl: './dashboard.component.html',
  host: {
    class: 'flex-1 flex flex-col min-h-0',
  },
})
export class DashboardComponent implements OnInit {
  stats: AnalyticsKpi[] = [];
  activity: ActivityItem[] = [];
  loading = true;
  crmSummary: { totalDeals: number; pipelineValue: number } | null = null;
  formsToday = 0;
  campaignOpenRate = 0;
  agentPerformance: AgentPerformance | null = null;

  constructor(
    private dashboardService: DashboardService,
    private analyticsService: AnalyticsService,
  ) {}

  ngOnInit() {
    this.analyticsService.getOverview().subscribe({
      next: (overview) => {
        this.stats = overview.kpis.slice(0, 8);
        this.crmSummary = overview.crm;
        this.formsToday = overview.forms.submissionsToday;
        this.campaignOpenRate = overview.campaigns.avgOpenRate;
        this.loading = false;
      },
      error: () => {
        this.dashboardService.getStats().subscribe({
          next: (data) => {
            this.stats = [
              { key: 'openConversations', label: 'Conversaciones abiertas', value: data.openConversations, icon: 'chat' },
              { key: 'messagesToday', label: 'Mensajes hoy', value: data.messagesToday, icon: 'message' },
              { key: 'contacts', label: 'Contactos', value: data.contacts, icon: 'people' },
              { key: 'activeIntegrations', label: 'Integraciones activas', value: data.activeIntegrations, icon: 'extension' },
            ];
            this.loading = false;
          },
          error: () => (this.loading = false),
        });
      },
    });

    this.dashboardService.getRecentActivity().subscribe({
      next: (data) => (this.activity = data),
    });

    this.dashboardService.getAgentPerformance().subscribe({
      next: (data) => (this.agentPerformance = data),
    });
  }

  formatKpiValue(kpi: AnalyticsKpi): string | number {
    if (kpi.key === 'pipelineValue' || kpi.key === 'wonRevenue' || kpi.key === 'billingRevenue' || kpi.key === 'totalRevenue') {
      return new Intl.NumberFormat('es-ES', { style: 'currency', currency: 'EUR', maximumFractionDigits: 0 }).format(kpi.value);
    }
    if (kpi.key === 'campaignOpenRate') {
      return `${kpi.value}%`;
    }
    return kpi.value;
  }

  getTimeAgo(dateStr: string): string {
    if (!dateStr) return '';
    const diff = Date.now() - new Date(dateStr).getTime();
    const mins = Math.floor(diff / 60000);
    if (mins < 1) return 'Ahora';
    if (mins < 60) return `hace ${mins}m`;
    const hours = Math.floor(mins / 60);
    if (hours < 24) return `hace ${hours}h`;
    const days = Math.floor(hours / 24);
    return `hace ${days}d`;
  }
}
