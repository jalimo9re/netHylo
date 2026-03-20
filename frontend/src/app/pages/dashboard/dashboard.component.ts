import { Component } from '@angular/core';
import { MatCardModule } from '@angular/material/card';
import { MatIconModule } from '@angular/material/icon';

@Component({
  selector: 'app-dashboard',
  standalone: true,
  imports: [MatCardModule, MatIconModule],
  templateUrl: './dashboard.component.html',
})
export class DashboardComponent {
  stats = [
    { label: 'Conversaciones abiertas', value: 0, icon: 'chat', color: 'bg-blue-500' },
    { label: 'Mensajes hoy', value: 0, icon: 'message', color: 'bg-green-500' },
    { label: 'Contactos', value: 0, icon: 'people', color: 'bg-purple-500' },
    { label: 'Integraciones activas', value: 0, icon: 'extension', color: 'bg-orange-500' },
  ];
}
