import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { MatIconModule } from '@angular/material/icon';
import { RouterLink } from '@angular/router';
import {
  DashboardService,
  DashboardStats,
  ActivityItem,
} from '../../core/services/dashboard.service';

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
  stats: { label: string; value: number; icon: string }[] = [
    { label: 'Conversaciones abiertas', value: 0, icon: 'chat' },
    { label: 'Mensajes hoy', value: 0, icon: 'message' },
    { label: 'Contactos', value: 0, icon: 'people' },
    { label: 'Integraciones activas', value: 0, icon: 'extension' },
  ];
  activity: ActivityItem[] = [];
  loading = true;

  constructor(private dashboardService: DashboardService) {}

  ngOnInit() {
    this.dashboardService.getStats().subscribe({
      next: (data: DashboardStats) => {
        this.stats[0].value = data.openConversations;
        this.stats[1].value = data.messagesToday;
        this.stats[2].value = data.contacts;
        this.stats[3].value = data.activeIntegrations;
        this.loading = false;
      },
      error: () => (this.loading = false),
    });

    this.dashboardService.getRecentActivity().subscribe({
      next: (data) => (this.activity = data),
    });
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
