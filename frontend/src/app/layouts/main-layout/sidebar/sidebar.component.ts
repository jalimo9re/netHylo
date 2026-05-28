import { Component, computed, output, signal, OnInit } from '@angular/core';
import { RouterLink, RouterLinkActive } from '@angular/router';
import { MatIconModule } from '@angular/material/icon';
import { AuthService } from '../../../core/services/auth.service';
import { TenantsService } from '../../../core/services/tenants.service';

interface NavItem {
  label: string;
  icon: string;
  route: string;
  roles: string[];
  agencyOnly?: boolean;
}

@Component({
  selector: 'app-sidebar',
  standalone: true,
  imports: [RouterLink, RouterLinkActive, MatIconModule],
  templateUrl: './sidebar.component.html',
})
export class SidebarComponent implements OnInit {
  navClicked = output<void>();
  isAgencyTenant = signal(false);

  private allNavItems: NavItem[] = [
    { label: 'Dashboard', icon: 'dashboard', route: '/dashboard', roles: ['superadmin', 'admin', 'agent'] },
    { label: 'Tenants', icon: 'business', route: '/tenants', roles: ['superadmin'] },
    {
      label: 'Agency',
      icon: 'corporate_fare',
      route: '/agency',
      roles: ['superadmin', 'admin'],
      agencyOnly: true,
    },
    { label: 'Inbox', icon: 'inbox', route: '/inbox', roles: ['admin', 'agent'] },
    { label: 'Contactos', icon: 'contacts', route: '/contacts', roles: ['admin', 'agent'] },
    { label: 'CRM', icon: 'view_kanban', route: '/crm', roles: ['admin', 'agent'] },
    { label: 'Formularios', icon: 'description', route: '/forms', roles: ['admin', 'agent'] },
    { label: 'Automatizaciones', icon: 'hub', route: '/automations', roles: ['admin', 'agent'] },
    { label: 'Campañas', icon: 'campaign', route: '/campaigns', roles: ['admin', 'agent'] },
    { label: 'Social Planner', icon: 'event_note', route: '/social-planner', roles: ['admin', 'agent'] },
    { label: 'Calendario', icon: 'calendar_month', route: '/calendar', roles: ['admin', 'agent'] },
    { label: 'Websites', icon: 'language', route: '/sites', roles: ['admin', 'agent'] },
    { label: 'Funnels', icon: 'filter_alt', route: '/funnels', roles: ['admin', 'agent'] },
    { label: 'Facturación', icon: 'payments', route: '/billing', roles: ['admin'] },
    { label: 'Afiliados', icon: 'share', route: '/affiliates', roles: ['admin', 'agent'] },
    { label: 'Reputación', icon: 'star', route: '/reputation', roles: ['admin', 'agent'] },
    { label: 'Mobile', icon: 'phone_iphone', route: '/mobile', roles: ['admin', 'superadmin'] },
    { label: 'Voice', icon: 'support_agent', route: '/voice', roles: ['admin', 'agent'] },
    { label: 'Memberships', icon: 'school', route: '/memberships', roles: ['admin', 'agent'] },
    { label: 'Usuarios', icon: 'group', route: '/users', roles: ['superadmin', 'admin'] },
    { label: 'Configuración', icon: 'settings', route: '/settings', roles: ['superadmin', 'admin'] },
  ];

  navItems = computed(() => {
    const role = this.authService.currentUser()?.role || '';
    const filtered = this.allNavItems.filter((item) => {
      if (!item.roles.includes(role)) return false;
      if (item.agencyOnly && role !== 'superadmin' && !this.isAgencyTenant()) {
        return false;
      }
      return true;
    });

    // Evita duplicados de rutas si se repite un ítem al fusionar menús.
    const uniqueByRoute = new Map(filtered.map((item) => [item.route, item]));
    return Array.from(uniqueByRoute.values());
  });

  constructor(
    private authService: AuthService,
    private tenantsService: TenantsService,
  ) {}

  ngOnInit() {
    const role = this.authService.currentUser()?.role;
    if (role === 'admin') {
      this.tenantsService.findMe().subscribe({
        next: (tenant) => this.isAgencyTenant.set(!!tenant.isAgency),
        error: () => this.isAgencyTenant.set(false),
      });
    }
    if (role === 'superadmin') {
      this.isAgencyTenant.set(true);
    }
  }

  onNavClick() {
    this.navClicked.emit();
  }
}
