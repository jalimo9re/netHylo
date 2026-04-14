import { Component, output } from '@angular/core';
import { MatIconModule } from '@angular/material/icon';
import { AuthService } from '../../../core/services/auth.service';

@Component({
  selector: 'app-topbar',
  standalone: true,
  imports: [MatIconModule],
  templateUrl: './topbar.component.html',
})
export class TopbarComponent {
  menuToggle = output<void>();

  constructor(private authService: AuthService) {}

  get userEmail(): string {
    return this.authService.currentUser()?.email || '';
  }

  get userRole(): string {
    const roles: Record<string, string> = {
      superadmin: 'Super Admin',
      admin: 'Administrador',
      agent: 'Agente',
    };
    const role = this.authService.currentUser()?.role || '';
    return roles[role] || role;
  }

  logout() {
    this.authService.logout();
  }
}
