import { Component } from '@angular/core';
import { RouterOutlet, RouterLink, RouterLinkActive } from '@angular/router';
import { MatIconModule } from '@angular/material/icon';

@Component({
  selector: 'app-settings',
  standalone: true,
  imports: [RouterOutlet, RouterLink, RouterLinkActive, MatIconModule],
  templateUrl: './settings.component.html',
})
export class SettingsComponent {
  tabs = [
    { label: 'Integraciones', icon: 'extension', route: 'integrations' },
  ];
}
