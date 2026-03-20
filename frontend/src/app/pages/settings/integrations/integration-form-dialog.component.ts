import { Component, Inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import {
  MAT_DIALOG_DATA,
  MatDialogRef,
  MatDialogModule,
} from '@angular/material/dialog';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatSelectModule } from '@angular/material/select';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatTooltipModule } from '@angular/material/tooltip';
import {
  IntegrationsService,
  Integration,
  ProviderSchema,
  ProviderField,
} from '../../../core/services/integrations.service';

interface DialogData {
  schemas: Record<string, ProviderSchema>;
  integration: Integration | null;
}

@Component({
  selector: 'app-integration-form-dialog',
  standalone: true,
  imports: [
    CommonModule,
    FormsModule,
    MatDialogModule,
    MatFormFieldModule,
    MatInputModule,
    MatSelectModule,
    MatButtonModule,
    MatIconModule,
    MatTooltipModule,
  ],
  templateUrl: './integration-form-dialog.component.html',
})
export class IntegrationFormDialogComponent {
  isEdit: boolean;
  providers: { key: string; label: string }[];
  selectedProvider = '';
  name = '';
  config: Record<string, string> = {};
  fields: ProviderField[] = [];
  loading = false;
  error = '';

  constructor(
    private dialogRef: MatDialogRef<IntegrationFormDialogComponent>,
    @Inject(MAT_DIALOG_DATA) public data: DialogData,
    private integrationsService: IntegrationsService,
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
    // Initialize empty values for new fields
    for (const field of this.fields) {
      if (!this.config[field.key]) {
        this.config[field.key] = '';
      }
    }
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

    const payload = {
      name: this.name,
      provider: this.selectedProvider,
      config: this.config,
    };

    const request = this.isEdit
      ? this.integrationsService.update(this.data.integration!.id, payload as any)
      : this.integrationsService.create(payload);

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
