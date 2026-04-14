import { Component, Inject, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { MatDialogModule, MatDialogRef, MAT_DIALOG_DATA } from '@angular/material/dialog';
import { MatButtonModule } from '@angular/material/button';
import { MatSelectModule } from '@angular/material/select';
import { TenantsService, Tenant } from '../../core/services/tenants.service';
import { PlansService, Plan } from '../../core/services/plans.service';

@Component({
  selector: 'app-tenant-form-dialog',
  standalone: true,
  imports: [
    CommonModule,
    FormsModule,
    MatDialogModule,
    MatButtonModule,
    MatSelectModule,
  ],
  templateUrl: './tenant-form-dialog.component.html',
})
export class TenantFormDialogComponent implements OnInit {
  isEdit: boolean;
  plans: Plan[] = [];
  loading = false;
  error = '';

  companyName = '';
  companySlug = '';
  planId = '';
  adminEmail = '';
  adminPassword = '';
  adminFirstName = '';
  adminLastName = '';

  constructor(
    private dialogRef: MatDialogRef<TenantFormDialogComponent>,
    @Inject(MAT_DIALOG_DATA) public data: { tenant: Tenant | null },
    private tenantsService: TenantsService,
    private plansService: PlansService,
  ) {
    this.isEdit = !!data.tenant;
    if (data.tenant) {
      this.companyName = data.tenant.name;
      this.companySlug = data.tenant.slug;
      this.planId = data.tenant.plan?.id || '';
    }
  }

  ngOnInit() {
    this.plansService.findAll().subscribe((plans) => {
      this.plans = plans;
    });
  }

  onNameChange() {
    if (!this.isEdit) {
      this.companySlug = this.companyName
        .toLowerCase()
        .replace(/[^a-z0-9]+/g, '-')
        .replace(/^-|-$/g, '');
    }
  }

  isValid(): boolean {
    if (!this.companyName || !this.companySlug || !this.planId) return false;
    if (!this.isEdit) {
      return !!(this.adminEmail && this.adminPassword && this.adminFirstName && this.adminLastName);
    }
    return true;
  }

  save() {
    this.loading = true;
    this.error = '';

    if (this.isEdit) {
      this.tenantsService
        .update(this.data.tenant!.id, {
          name: this.companyName,
          slug: this.companySlug,
        } as any)
        .subscribe({
          next: () => this.dialogRef.close(true),
          error: (err) => {
            this.error = err.error?.message || 'Error al actualizar';
            this.loading = false;
          },
        });
    } else {
      this.tenantsService
        .create({
          companyName: this.companyName,
          companySlug: this.companySlug,
          planId: this.planId,
          adminEmail: this.adminEmail,
          adminPassword: this.adminPassword,
          adminFirstName: this.adminFirstName,
          adminLastName: this.adminLastName,
        })
        .subscribe({
          next: () => this.dialogRef.close(true),
          error: (err) => {
            this.error = err.error?.message || 'Error al crear tenant';
            this.loading = false;
          },
        });
    }
  }

  cancel() {
    this.dialogRef.close(false);
  }
}
