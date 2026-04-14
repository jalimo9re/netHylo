import { Component, signal, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { MatIconModule } from '@angular/material/icon';
import { MatSnackBar, MatSnackBarModule } from '@angular/material/snack-bar';
import { PlansService, Plan } from '../../../core/services/plans.service';
import { SystemConfigService } from '../../../core/services/system-config.service';
import { forkJoin } from 'rxjs';

interface PlanConfig extends Plan {
  icon: string;
}

@Component({
  selector: 'app-system-settings',
  standalone: true,
  imports: [CommonModule, FormsModule, MatIconModule, MatSnackBarModule],
  templateUrl: './system-settings.component.html',
  host: {
    class: 'flex-1 flex flex-col min-h-0',
  },
})
export class SystemSettingsComponent implements OnInit {
  plans: PlanConfig[] = [];
  loadingPlans = true;

  emailProvider = signal<'smtp' | 'resend'>('smtp');
  
  smtpConfig = {
    host: 'smtp.gmail.com',
    port: 587,
    user: '',
    pass: ''
  };

  resendKey = '';

  redsysConfig = {
    fuc: '',
    terminal: '1',
    key: ''
  };

  constructor(
    private snackBar: MatSnackBar,
    private plansService: PlansService,
    private configService: SystemConfigService
  ) {}

  ngOnInit() {
    this.loadPlans();
    this.loadConfigs();
  }

  loadConfigs() {
    this.configService.getAll().subscribe(configs => {
      if (configs['EMAIL_PROVIDER']) this.emailProvider.set(configs['EMAIL_PROVIDER']);
      if (configs['EMAIL_CONFIG']) this.smtpConfig = configs['EMAIL_CONFIG'];
      if (configs['RESEND_KEY']) this.resendKey = configs['RESEND_KEY'];
      if (configs['REDSYS_CONFIG']) this.redsysConfig = configs['REDSYS_CONFIG'];
    });
  }

  loadPlans() {
    this.loadingPlans = true;
    this.plansService.findAll().subscribe({
      next: (data) => {
        const icons: Record<string, string> = {
          basic: 'bolt',
          medium: 'auto_awesome',
          full: 'diamond'
        };
        const order = ['basic', 'medium', 'full'];
        this.plans = data
          .map(p => ({
            ...p,
            icon: icons[p.name] || 'rocket'
          }))
          .sort((a, b) => order.indexOf(a.name) - order.indexOf(b.name));
        this.loadingPlans = false;
      },
      error: () => (this.loadingPlans = false)
    });
  }

  saveSettings() {
    const planUpdates = this.plans.map(plan => 
      this.plansService.update(plan.id, {
        price: plan.price,
        maxUsers: plan.maxUsers,
        maxIntegrations: plan.maxIntegrations
      })
    );

    // Save System Configs
    const configUpdate = this.configService.setBulk({
      EMAIL_PROVIDER: this.emailProvider(),
      EMAIL_CONFIG: this.smtpConfig,
      RESEND_KEY: this.resendKey,
      REDSYS_CONFIG: this.redsysConfig
    });

    forkJoin([...planUpdates, configUpdate]).subscribe({
      next: () => {
        this.snackBar.open('Configuración guardada correctamente', 'Cerrar', {
          duration: 3000,
          horizontalPosition: 'right',
          verticalPosition: 'top',
          panelClass: ['!bg-green-500', '!text-white']
        });
      },
      error: () => {
        this.snackBar.open('Error al guardar la configuración', 'Cerrar', {
          duration: 3000,
          panelClass: ['!bg-red-500', '!text-white']
        });
      }
    });
  }
}
