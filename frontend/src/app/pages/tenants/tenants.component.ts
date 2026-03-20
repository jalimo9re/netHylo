import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { MatCardModule } from '@angular/material/card';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatChipsModule } from '@angular/material/chips';
import { MatDialogModule, MatDialog } from '@angular/material/dialog';
import { MatTooltipModule } from '@angular/material/tooltip';
import { TenantsService, Tenant } from '../../core/services/tenants.service';
import { TenantFormDialogComponent } from './tenant-form-dialog.component';

@Component({
  selector: 'app-tenants',
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
  templateUrl: './tenants.component.html',
})
export class TenantsComponent implements OnInit {
  tenants: Tenant[] = [];
  loading = true;

  constructor(
    private tenantsService: TenantsService,
    private dialog: MatDialog,
  ) {}

  ngOnInit() {
    this.loadTenants();
  }

  loadTenants() {
    this.loading = true;
    this.tenantsService.findAll().subscribe((data) => {
      this.tenants = data;
      this.loading = false;
    });
  }

  openAddDialog() {
    const ref = this.dialog.open(TenantFormDialogComponent, {
      width: '600px',
      data: { tenant: null },
    });
    ref.afterClosed().subscribe((result) => {
      if (result) this.loadTenants();
    });
  }

  openEditDialog(tenant: Tenant) {
    const ref = this.dialog.open(TenantFormDialogComponent, {
      width: '600px',
      data: { tenant },
    });
    ref.afterClosed().subscribe((result) => {
      if (result) this.loadTenants();
    });
  }

  toggleStatus(tenant: Tenant) {
    if (tenant.isActive) {
      this.tenantsService.deactivate(tenant.id).subscribe(() => this.loadTenants());
    } else {
      this.tenantsService.update(tenant.id, { isActive: true } as any).subscribe(() => this.loadTenants());
    }
  }
}
