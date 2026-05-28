import { Component, OnInit, signal } from '@angular/core';
import { RouterOutlet } from '@angular/router';
import { SidebarComponent } from './sidebar/sidebar.component';
import { TopbarComponent } from './topbar/topbar.component';
import { TenantBrandingService } from '../../core/services/tenant-branding.service';
import { AuthService } from '../../core/services/auth.service';

@Component({
  selector: 'app-main-layout',
  standalone: true,
  imports: [RouterOutlet, SidebarComponent, TopbarComponent],
  templateUrl: './main-layout.component.html',
})
export class MainLayoutComponent implements OnInit {
  sidebarOpen = signal(false);

  constructor(
    private tenantBranding: TenantBrandingService,
    private authService: AuthService,
  ) {}

  ngOnInit() {
    if (this.authService.currentUser()?.role !== 'superadmin') {
      this.tenantBranding.refresh();
    }
  }

  toggleSidebar() {
    this.sidebarOpen.update((v) => !v);
  }

  closeSidebar() {
    this.sidebarOpen.set(false);
  }
}
