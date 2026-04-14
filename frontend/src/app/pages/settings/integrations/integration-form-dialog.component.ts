import { Component, Inject, OnDestroy } from '@angular/core';
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
  IntegrationsService,
  Integration,
  ProviderSchema,
  ProviderField,
} from '../../../core/services/integrations.service';

interface DialogData {
  schemas: Record<string, ProviderSchema>;
  integration: Integration | null;
}

interface OAuthPage {
  pageId: string;
  pageName: string;
  pageAccessToken: string;
  instagram: {
    igAccountId: string;
    igUsername: string;
    igName: string;
  } | null;
}

@Component({
  selector: 'app-integration-form-dialog',
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
  templateUrl: './integration-form-dialog.component.html',
})
export class IntegrationFormDialogComponent implements OnDestroy {
  isEdit: boolean;
  providers: { key: string; label: string }[];
  selectedProvider = '';
  name = '';
  config: Record<string, string> = {};
  fields: ProviderField[] = [];
  loading = false;
  error = '';
  showGuide = false;

  // OAuth state
  oauthLoading = false;
  oauthPages: OAuthPage[] = [];
  oauthType: 'messenger' | 'instagram' | null = null;
  showManualConfig = false;

  private messageListener: ((event: MessageEvent) => void) | null = null;

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

  ngOnDestroy() {
    if (this.messageListener) {
      window.removeEventListener('message', this.messageListener);
    }
  }

  get isOAuthProvider(): boolean {
    return this.selectedProvider === 'meta' || this.selectedProvider === 'instagram';
  }

  onProviderChange() {
    const schema = this.data.schemas[this.selectedProvider];
    this.fields = schema?.fields || [];
    this.oauthPages = [];
    this.oauthType = null;
    this.showManualConfig = false;
    for (const field of this.fields) {
      if (!this.config[field.key]) {
        this.config[field.key] = '';
      }
    }
  }

  startOAuth() {
    this.oauthLoading = true;
    this.error = '';
    this.oauthType = this.selectedProvider === 'instagram' ? 'instagram' : 'messenger';

    this.integrationsService.getOAuthUrl(this.oauthType).subscribe({
      next: ({ url }) => {
        const popup = window.open(url, 'nethylo-oauth', 'width=600,height=700,scrollbars=yes');

        if (this.messageListener) {
          window.removeEventListener('message', this.messageListener);
        }

        this.messageListener = (event: MessageEvent) => {
          if (event.data?.source !== 'nethylo-oauth') return;
          const result = event.data.data;

          if (result.error) {
            this.error = result.error;
            this.oauthLoading = false;
          } else if (result.success && result.pages) {
            this.oauthPages = result.pages;
            this.oauthLoading = false;
          }

          window.removeEventListener('message', this.messageListener!);
          this.messageListener = null;
        };

        window.addEventListener('message', this.messageListener);

        // Detect if popup was closed without completing
        const checkClosed = setInterval(() => {
          if (popup?.closed) {
            clearInterval(checkClosed);
            if (this.oauthLoading) {
              this.oauthLoading = false;
            }
          }
        }, 1000);
      },
      error: (err) => {
        this.error = err.error?.message || 'Error al iniciar la conexion con Facebook';
        this.oauthLoading = false;
      },
    });
  }

  selectPage(page: OAuthPage) {
    this.loading = true;
    this.error = '';

    const isInstagram = this.oauthType === 'instagram' && page.instagram;

    this.integrationsService.createFromOAuth({
      type: isInstagram ? 'instagram' : 'messenger',
      pageId: page.pageId,
      pageName: page.pageName,
      pageAccessToken: page.pageAccessToken,
      igAccountId: page.instagram?.igAccountId,
      igUsername: page.instagram?.igUsername,
    }).subscribe({
      next: () => {
        this.dialogRef.close(true);
      },
      error: (err) => {
        this.error = err.error?.message || 'Error al crear la integracion';
        this.loading = false;
      },
    });
  }

  hasInstagramPages(): boolean {
    return this.oauthPages.some(p => !!p.instagram);
  }

  toggleManualConfig() {
    this.showManualConfig = !this.showManualConfig;
    this.oauthPages = [];
    this.oauthType = null;
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
      ? this.integrationsService.update(this.data.integration!.id, {
          name: this.name,
          config: this.config,
        } as any)
      : this.integrationsService.create({
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
