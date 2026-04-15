import { Component, Inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import {
  MAT_DIALOG_DATA,
  MatDialogRef,
  MatDialogModule,
} from '@angular/material/dialog';
import { MatSelectModule } from '@angular/material/select';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatTooltipModule } from '@angular/material/tooltip';
import {
  ActionsService,
  ActionIntegration,
  ActionProviderSchema,
  ActionProviderField,
} from '../../../core/services/actions.service';

interface DialogData {
  schemas: Record<string, ActionProviderSchema>;
  integration: ActionIntegration | null;
}

@Component({
  selector: 'app-action-form-dialog',
  standalone: true,
  imports: [
    CommonModule,
    FormsModule,
    MatDialogModule,
    MatSelectModule,
    MatButtonModule,
    MatIconModule,
    MatTooltipModule,
  ],
  templateUrl: './action-form-dialog.component.html',
})
export class ActionFormDialogComponent {
  isEdit: boolean;
  providers: { key: string; label: string }[];
  selectedProvider = '';
  name = '';
  config: Record<string, string> = {};
  fields: ActionProviderField[] = [];
  loading = false;
  error = '';
  showGuide = false;

  constructor(
    private dialogRef: MatDialogRef<ActionFormDialogComponent>,
    @Inject(MAT_DIALOG_DATA) public data: DialogData,
    private actionsService: ActionsService,
  ) {
    this.isEdit = !!data.integration;
    this.providers = Object.entries(data.schemas).map(([key, schema]) => ({
      key,
      label: schema.label,
    }));

    if (data.integration) {
      this.selectedProvider = data.integration.provider;
      this.name = data.integration.name;
      this.config = { ...data.integration.config };
      this.onProviderChange();
    }
  }

  onProviderChange() {
    const schema = this.data.schemas[this.selectedProvider];
    this.fields = schema?.fields || [];
    for (const field of this.fields) {
      if (!this.config[field.key]) {
        this.config[field.key] = '';
      }
    }
  }

  getSetupGuide() {
    return this.data.schemas[this.selectedProvider]?.setupGuide || [];
  }

  isValid(): boolean {
    if (!this.name || !this.selectedProvider) return false;
    return this.fields
      .filter((f) => f.required)
      .every((f) => this.config[f.key]?.trim());
  }

  save() {
    this.loading = true;
    this.error = '';

    const request = this.isEdit
      ? this.actionsService.update(this.data.integration!.id, {
          name: this.name,
          config: this.config,
        } as any)
      : this.actionsService.create({
          name: this.name,
          provider: this.selectedProvider,
          config: this.config,
        });

    request.subscribe({
      next: () => this.dialogRef.close(true),
      error: (err) => {
        this.error = err.error?.message || 'Error al guardar';
        this.loading = false;
      },
    });
  }

  cancel() {
    this.dialogRef.close(false);
  }
}
