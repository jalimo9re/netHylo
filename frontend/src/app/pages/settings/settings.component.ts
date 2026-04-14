import { Component, computed, OnInit } from '@angular/core';
import { RouterOutlet, RouterLink, RouterLinkActive, Router } from '@angular/router';
import { MatIconModule } from '@angular/material/icon';
import { AuthService } from '../../core/services/auth.service';

@Component({
  selector: 'app-settings',
  standalone: true,
  imports: [RouterOutlet, RouterLink, RouterLinkActive, MatIconModule],
  templateUrl: './settings.component.html',
  host: {
    class: 'flex-1 flex flex-col min-h-0',
  },
})
export class SettingsComponent implements OnInit {
  tabs = computed(() => {
    const role = this.authService.currentUser()?.role;
    const items = [];
    
    if (role === 'admin') {
      items.push({ label: 'Integraciones', icon: 'extension', route: 'integrations' });
      items.push({ label: 'Acciones', icon: 'bolt', route: 'actions' });
    }
    
    if (role === 'superadmin') {
      items.push({ label: 'Sistema', icon: 'settings_suggest', route: 'system' });
    }
    
    return items;
  });

  constructor(
    private authService: AuthService,
    private router: Router
  ) {}

  ngOnInit() {
    // If we are on /settings, redirect to the first available tab
    if (this.router.url === '/settings' || this.router.url === '/settings/') {
      const firstTab = this.tabs()[0];
      if (firstTab) {
        this.router.navigate(['/settings', firstTab.route]);
      }
    }
  }
}
