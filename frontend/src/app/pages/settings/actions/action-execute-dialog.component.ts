import { Component, Inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import {
  MAT_DIALOG_DATA,
  MatDialogRef,
  MatDialogModule,
} from '@angular/material/dialog';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatSelectModule } from '@angular/material/select';
import { MatTooltipModule } from '@angular/material/tooltip';
import {
  ActionsService,
  ActionIntegration,
  ActionProviderSchema,
  ActionCapability,
  ActionResult,
} from '../../../core/services/actions.service';

interface DialogData {
  integration: ActionIntegration;
  schema: ActionProviderSchema;
}

@Component({
  selector: 'app-action-execute-dialog',
  standalone: true,
  imports: [
    CommonModule,
    FormsModule,
    MatDialogModule,
    MatButtonModule,
    MatIconModule,
    MatSelectModule,
    MatTooltipModule,
  ],
  templateUrl: './action-execute-dialog.component.html',
})
export class ActionExecuteDialogComponent {
  categories: { key: string; label: string; icon: string }[] = [];
  selectedCategory = '';
  selectedAction = '';
  capabilities: ActionCapability[] = [];
  currentCapability: ActionCapability | null = null;
  params: Record<string, any> = {};
  executing = false;
  result: ActionResult | null = null;

  private categoryLabels: Record<string, string> = {
    clients: 'Clientes',
    appointments: 'Citas',
    services: 'Servicios',
    sales: 'Ventas',
    budgets: 'Presupuestos',
    system: 'Sistema',
  };

  private categoryIcons: Record<string, string> = {
    clients: 'people',
    appointments: 'calendar_month',
    services: 'medical_services',
    sales: 'point_of_sale',
    budgets: 'request_quote',
    system: 'settings',
  };

  constructor(
    private dialogRef: MatDialogRef<ActionExecuteDialogComponent>,
    @Inject(MAT_DIALOG_DATA) public data: DialogData,
    private actionsService: ActionsService,
  ) {
    this.capabilities = data.schema.capabilities || [];
    const cats = [...new Set(this.capabilities.map((c) => c.category))];
    this.categories = cats.map((c) => ({
      key: c,
      label: this.categoryLabels[c] || c,
      icon: this.categoryIcons[c] || 'bolt',
    }));
  }

  get actionsForCategory(): ActionCapability[] {
    return this.capabilities.filter((c) => c.category === this.selectedCategory);
  }

  onCategoryChange() {
    this.selectedAction = '';
    this.currentCapability = null;
    this.params = {};
    this.result = null;
  }

  onActionChange() {
    this.currentCapability =
      this.capabilities.find(
        (c) => c.category === this.selectedCategory && c.action === this.selectedAction,
      ) || null;
    this.params = {};
    this.result = null;
    if (this.currentCapability) {
      for (const p of this.currentCapability.params) {
        this.params[p.key] = '';
      }
    }
  }

  isValid(): boolean {
    if (!this.currentCapability) return false;
    return this.currentCapability.params
      .filter((p) => p.required)
      .every((p) => {
        const val = this.params[p.key];
        return val !== undefined && val !== null && String(val).trim() !== '';
      });
  }

  execute() {
    if (!this.currentCapability) return;
    this.executing = true;
    this.result = null;

    const cleanParams: Record<string, any> = {};
    for (const [key, value] of Object.entries(this.params)) {
      if (value !== undefined && value !== null && String(value).trim() !== '') {
        cleanParams[key] = value;
      }
    }

    this.actionsService
      .executeAction(
        this.data.integration.id,
        this.selectedCategory,
        this.selectedAction,
        cleanParams,
      )
      .subscribe({
        next: (result) => {
          this.result = result;
          this.executing = false;
        },
        error: (err) => {
          this.result = {
            success: false,
            error: err.error?.message || 'Error ejecutando accion',
          };
          this.executing = false;
        },
      });
  }

  formatResult(data: any): string {
    return JSON.stringify(data, null, 2);
  }

  close() {
    this.dialogRef.close();
  }
}
