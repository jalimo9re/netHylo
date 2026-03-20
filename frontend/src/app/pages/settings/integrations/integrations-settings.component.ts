import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { MatCardModule } from '@angular/material/card';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatChipsModule } from '@angular/material/chips';
import { MatSelectModule } from '@angular/material/select';
import { MatInputModule } from '@angular/material/input';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatDialogModule, MatDialog } from '@angular/material/dialog';
import { MatTooltipModule } from '@angular/material/tooltip';
import {
  IntegrationsService,
  Integration,
  ProviderSchema,
} from '../../../core/services/integrations.service';
import { IntegrationFormDialogComponent } from './integration-form-dialog.component';

@Component({
  selector: 'app-integrations-settings',
  standalone: true,
  imports: [
    CommonModule,
    FormsModule,
    MatCardModule,
    MatButtonModule,
    MatIconModule,
    MatChipsModule,
    MatTooltipModule,
    MatDialogModule,
  ],
  templateUrl: './integrations-settings.component.html',
})
export class IntegrationsSettingsComponent implements OnInit {
  integrations: Integration[] = [];
  schemas: Record<string, ProviderSchema> = {};
  loading = true;

  constructor(
    private integrationsService: IntegrationsService,
    private dialog: MatDialog,
  ) {}

  ngOnInit() {
    this.loadData();
  }

  loadData() {
    this.loading = true;
    this.integrationsService.getConfigSchema().subscribe((schemas) => {
      this.schemas = schemas;
    });
    this.integrationsService.findAll().subscribe((data) => {
      this.integrations = data;
      this.loading = false;
    });
  }

  getProviderLabel(provider: string): string {
    return this.schemas[provider]?.label || provider;
  }

  getProviderIcon(provider: string): string {
    const icons: Record<string, string> = {
      whatsapp: 'chat',
      meta: 'public',
      instagram: 'photo_camera',
      telegram: 'send',
      tiktok: 'videocam',
    };
    return icons[provider] || 'extension';
  }

  getStatusColor(status: string): string {
    const colors: Record<string, string> = {
      active: 'bg-green-100 text-green-800',
      inactive: 'bg-gray-100 text-gray-800',
      error: 'bg-red-100 text-red-800',
    };
    return colors[status] || 'bg-gray-100 text-gray-800';
  }

  maskValue(value: string): string {
    if (!value || value.length < 8) return '****';
    return value.substring(0, 4) + '****' + value.substring(value.length - 4);
  }

  openAddDialog() {
    const ref = this.dialog.open(IntegrationFormDialogComponent, {
      width: '600px',
      data: { schemas: this.schemas, integration: null },
    });
    ref.afterClosed().subscribe((result) => {
      if (result) this.loadData();
    });
  }

  openEditDialog(integration: Integration) {
    const ref = this.dialog.open(IntegrationFormDialogComponent, {
      width: '600px',
      data: { schemas: this.schemas, integration },
    });
    ref.afterClosed().subscribe((result) => {
      if (result) this.loadData();
    });
  }

  toggleStatus(integration: Integration) {
    const newStatus = integration.status === 'active' ? 'inactive' : 'active';
    this.integrationsService
      .update(integration.id, { status: newStatus } as any)
      .subscribe(() => this.loadData());
  }

  deleteIntegration(integration: Integration) {
    if (confirm(`¿Eliminar la integración "${integration.name}"? Esta acción no se puede deshacer.`)) {
      this.integrationsService
        .remove(integration.id)
        .subscribe(() => this.loadData());
    }
  }
}
