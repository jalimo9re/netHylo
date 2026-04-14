import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { MatCardModule } from '@angular/material/card';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatTooltipModule } from '@angular/material/tooltip';
import { MatDialogModule, MatDialog } from '@angular/material/dialog';
import {
  ActionsService,
  ActionIntegration,
  ActionProviderSchema,
} from '../../../core/services/actions.service';
import { ActionFormDialogComponent } from './action-form-dialog.component';
import { ActionExecuteDialogComponent } from './action-execute-dialog.component';

@Component({
  selector: 'app-actions-settings',
  standalone: true,
  imports: [
    CommonModule,
    MatCardModule,
    MatButtonModule,
    MatIconModule,
    MatTooltipModule,
    MatDialogModule,
  ],
  templateUrl: './actions-settings.component.html',
  host: {
    class: 'flex-1 flex flex-col min-h-0',
  },
})
export class ActionsSettingsComponent implements OnInit {
  integrations: ActionIntegration[] = [];
  schemas: Record<string, ActionProviderSchema> = {};
  loading = true;
  testingId: string | null = null;
  testResult: { id: string; success: boolean; message: string } | null = null;

  constructor(
    private actionsService: ActionsService,
    private dialog: MatDialog,
  ) {}

  ngOnInit() {
    this.loadData();
  }

  loadData() {
    this.loading = true;
    this.actionsService.getConfigSchema().subscribe((schemas) => {
      this.schemas = schemas;
    });
    this.actionsService.findAll().subscribe((data) => {
      this.integrations = data;
      this.loading = false;
    });
  }

  getProviderLabel(provider: string): string {
    return this.schemas[provider]?.label || provider;
  }

  getProviderIcon(provider: string): string {
    const icons: Record<string, string> = {
      floww: 'event_available',
    };
    return icons[provider] || 'bolt';
  }

  getCapabilityCount(provider: string): number {
    return this.schemas[provider]?.capabilities?.length || 0;
  }

  getCategoryIcon(category: string): string {
    const icons: Record<string, string> = {
      clients: 'people',
      appointments: 'calendar_month',
      services: 'medical_services',
      sales: 'point_of_sale',
      budgets: 'request_quote',
      system: 'settings',
    };
    return icons[category] || 'bolt';
  }

  getCategoryLabel(category: string): string {
    const labels: Record<string, string> = {
      clients: 'Clientes',
      appointments: 'Citas',
      services: 'Servicios',
      sales: 'Ventas',
      budgets: 'Presupuestos',
      system: 'Sistema',
    };
    return labels[category] || category;
  }

  getCategories(provider: string): string[] {
    const caps = this.schemas[provider]?.capabilities || [];
    return [...new Set(caps.map((c) => c.category))];
  }

  maskValue(value: string): string {
    if (!value || value.length < 8) return '****';
    return value.substring(0, 4) + '****' + value.substring(value.length - 4);
  }

  openAddDialog() {
    const ref = this.dialog.open(ActionFormDialogComponent, {
      width: '600px',
      data: { schemas: this.schemas, integration: null },
    });
    ref.afterClosed().subscribe((result) => {
      if (result) this.loadData();
    });
  }

  openEditDialog(integration: ActionIntegration) {
    const ref = this.dialog.open(ActionFormDialogComponent, {
      width: '600px',
      data: { schemas: this.schemas, integration },
    });
    ref.afterClosed().subscribe((result) => {
      if (result) this.loadData();
    });
  }

  openExecuteDialog(integration: ActionIntegration) {
    this.dialog.open(ActionExecuteDialogComponent, {
      width: '700px',
      maxHeight: '90vh',
      data: { integration, schema: this.schemas[integration.provider] },
    });
  }

  testConnection(integration: ActionIntegration) {
    this.testingId = integration.id;
    this.testResult = null;
    this.actionsService.testConnection(integration.id).subscribe({
      next: (result) => {
        this.testingId = null;
        this.testResult = {
          id: integration.id,
          success: result.success,
          message: result.success ? 'Conexion exitosa' : result.error || 'Error desconocido',
        };
        setTimeout(() => {
          if (this.testResult?.id === integration.id) this.testResult = null;
        }, 5000);
      },
      error: (err) => {
        this.testingId = null;
        this.testResult = {
          id: integration.id,
          success: false,
          message: err.error?.message || 'Error de conexion',
        };
      },
    });
  }

  toggleStatus(integration: ActionIntegration) {
    const newStatus = integration.status === 'active' ? 'inactive' : 'active';
    this.actionsService
      .update(integration.id, { status: newStatus } as any)
      .subscribe(() => this.loadData());
  }

  deleteIntegration(integration: ActionIntegration) {
    if (confirm(`¿Eliminar "${integration.name}"? Esta accion no se puede deshacer.`)) {
      this.actionsService.remove(integration.id).subscribe(() => this.loadData());
    }
  }
}
