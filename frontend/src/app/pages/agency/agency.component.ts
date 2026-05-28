import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { MatCardModule } from '@angular/material/card';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatSelectModule } from '@angular/material/select';
import { MatSnackBar, MatSnackBarModule } from '@angular/material/snack-bar';
import { AgencyService, CreateSubaccountDto, TenantBranding } from '../../core/services/agency.service';
import { TenantsService, Tenant } from '../../core/services/tenants.service';
import { PlansService, Plan } from '../../core/services/plans.service';
import { AuthService } from '../../core/services/auth.service';
import { TenantContextService } from '../../core/services/tenant-context.service';
import { TenantBrandingService } from '../../core/services/tenant-branding.service';

@Component({
  selector: 'app-agency',
  standalone: true,
  imports: [
    CommonModule,
    FormsModule,
    MatCardModule,
    MatButtonModule,
    MatIconModule,
    MatFormFieldModule,
    MatInputModule,
    MatSelectModule,
    MatSnackBarModule,
  ],
  templateUrl: './agency.component.html',
  host: { class: 'flex-1 flex flex-col min-h-0' },
})
export class AgencyComponent implements OnInit {
  subaccounts: Tenant[] = [];
  agencyProfile: Tenant | null = null;
  plans: Plan[] = [];
  agencies: Tenant[] = [];
  loading = true;
  isSuperadmin = false;
  selectedAgencyId = '';

  branding: TenantBranding = {
    logoUrl: '',
    primaryColor: '#6366f1',
    customDomain: '',
  };

  newSubaccount: CreateSubaccountDto = {
    name: '',
    slug: '',
    planId: '',
    adminEmail: '',
    adminPassword: '',
    adminFirstName: '',
    adminLastName: '',
  };

  constructor(
    private agencyService: AgencyService,
    private tenantsService: TenantsService,
    private plansService: PlansService,
    private authService: AuthService,
    public tenantContext: TenantContextService,
    private tenantBranding: TenantBrandingService,
    private snackBar: MatSnackBar,
  ) {}

  ngOnInit() {
    this.isSuperadmin = this.authService.currentUser()?.role === 'superadmin';
    this.plansService.findAll().subscribe((plans) => (this.plans = plans));

    if (this.isSuperadmin) {
      this.tenantsService.findAll().subscribe((tenants) => {
        this.agencies = tenants.filter((t) => t.isAgency);
        this.selectedAgencyId = this.agencies[0]?.id || '';
        if (this.selectedAgencyId) {
          this.loadAgencyData();
        } else {
          this.loading = false;
        }
      });
      return;
    }

    this.loadAgencyData();
  }

  get parentTenantId(): string | undefined {
    return this.isSuperadmin ? this.selectedAgencyId || undefined : undefined;
  }

  loadAgencyData() {
    this.loading = true;
    this.agencyService.getProfile(this.parentTenantId).subscribe({
      next: (profile) => {
        this.agencyProfile = profile;
        this.branding = {
          logoUrl: profile.logoUrl || '',
          primaryColor: profile.primaryColor || '#6366f1',
          customDomain: profile.customDomain || '',
        };
      },
      error: () => this.snackBar.open('No se pudo cargar la agencia', 'Cerrar', { duration: 3000 }),
    });

    this.agencyService.listSubaccounts(this.parentTenantId).subscribe({
      next: (rows) => {
        this.subaccounts = rows;
        this.loading = false;
      },
      error: () => {
        this.loading = false;
        this.snackBar.open('Error al cargar subcuentas', 'Cerrar', { duration: 3000 });
      },
    });
  }

  onAgencyChange() {
    this.loadAgencyData();
  }

  saveBranding() {
    this.agencyService.updateBranding(this.branding, this.parentTenantId).subscribe({
      next: (tenant) => {
        this.agencyProfile = tenant;
        this.tenantBranding.loadFromTenant(tenant);
        this.snackBar.open('Branding actualizado', 'Cerrar', { duration: 2500 });
      },
      error: () => this.snackBar.open('Error al guardar branding', 'Cerrar', { duration: 3000 }),
    });
  }

  createSubaccount() {
    this.agencyService.createSubaccount(this.newSubaccount, this.parentTenantId).subscribe({
      next: () => {
        this.newSubaccount = {
          name: '',
          slug: '',
          planId: this.plans[0]?.id || '',
          adminEmail: '',
          adminPassword: '',
          adminFirstName: '',
          adminLastName: '',
        };
        this.loadAgencyData();
        this.snackBar.open('Subcuenta creada', 'Cerrar', { duration: 2500 });
      },
      error: (err) =>
        this.snackBar.open(err.error?.message || 'Error al crear subcuenta', 'Cerrar', {
          duration: 4000,
        }),
    });
  }

  assignPlan(subaccount: Tenant, planId: string) {
    this.agencyService.assignPlan(subaccount.id, planId, this.parentTenantId).subscribe({
      next: () => this.loadAgencyData(),
      error: () => this.snackBar.open('Error al asignar plan', 'Cerrar', { duration: 3000 }),
    });
  }

  switchToSubaccount(subaccount: Tenant) {
    this.tenantContext.setActiveTenantId(subaccount.id);
    this.tenantBranding.loadFromTenant(subaccount);
    this.snackBar.open(`Contexto: ${subaccount.name}`, 'Cerrar', { duration: 2500 });
  }

  clearContext() {
    this.tenantContext.clear();
    if (this.agencyProfile) {
      this.tenantBranding.loadFromTenant(this.agencyProfile);
    } else {
      this.tenantBranding.refresh();
    }
    this.snackBar.open('Contexto de agencia restaurado', 'Cerrar', { duration: 2500 });
  }
}
