import { Component, computed, output } from '@angular/core';
import { RouterLink, RouterLinkActive } from '@angular/router';
import { MatIconModule } from '@angular/material/icon';
import { AuthService } from '../../../core/services/auth.service';

interface NavItem {
  label: string;
  icon: string;
  route: string;
  roles: string[];
}

@Component({
  selector: 'app-sidebar',
  standalone: true,
  imports: [RouterLink, RouterLinkActive, MatIconModule],
  templateUrl: './sidebar.component.html',
})
export class SidebarComponent {
  navClicked = output<void>();

  private allNavItems: NavItem[] = [
    { label: 'Dashboard', icon: 'dashboard', route: '/dashboard', roles: ['superadmin', 'admin', 'agent'] },
    { label: 'Tenants', icon: 'business', route: '/tenants', roles: ['superadmin'] },
    { label: 'Inbox', icon: 'inbox', route: '/inbox', roles: ['admin', 'agent'] },
    { label: 'Contactos', icon: 'contacts', route: '/contacts', roles: ['admin', 'agent'] },
    { label: 'Usuarios', icon: 'group', route: '/users', roles: ['superadmin', 'admin'] },
    { label: 'Configuración', icon: 'settings', route: '/settings', roles: ['superadmin', 'admin'] },
  ];

  navItems = computed(() => {
    const role = this.authService.currentUser()?.role || '';
    return this.allNavItems.filter((item) => item.roles.includes(role));
  });

  constructor(private authService: AuthService) {}

  onNavClick() {
    this.navClicked.emit();
  }
}
