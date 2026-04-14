import { Routes } from '@angular/router';
import { authGuard } from './core/guards/auth.guard';

export const routes: Routes = [
  {
    path: 'login',
    loadComponent: () =>
      import('./pages/login/login.component').then((m) => m.LoginComponent),
  },
  {
    path: '',
    loadComponent: () =>
      import('./layouts/main-layout/main-layout.component').then(
        (m) => m.MainLayoutComponent,
      ),
    canActivate: [authGuard],
    children: [
      { path: '', redirectTo: 'dashboard', pathMatch: 'full' },
      {
        path: 'dashboard',
        loadComponent: () =>
          import('./pages/dashboard/dashboard.component').then(
            (m) => m.DashboardComponent,
          ),
      },
      {
        path: 'inbox',
        loadComponent: () =>
          import('./pages/inbox/inbox.component').then(
            (m) => m.InboxComponent,
          ),
      },
      {
        path: 'tenants',
        loadComponent: () =>
          import('./pages/tenants/tenants.component').then(
            (m) => m.TenantsComponent,
          ),
      },
      {
        path: 'users',
        loadComponent: () =>
          import('./pages/users/users.component').then(
            (m) => m.UsersComponent,
          ),
      },
      {
        path: 'settings',
        loadComponent: () =>
          import('./pages/settings/settings.component').then(
            (m) => m.SettingsComponent,
          ),
        children: [
          {
            path: 'integrations',
            loadComponent: () =>
              import(
                './pages/settings/integrations/integrations-settings.component'
              ).then((m) => m.IntegrationsSettingsComponent),
          },
          {
            path: 'actions',
            loadComponent: () =>
              import(
                './pages/settings/actions/actions-settings.component'
              ).then((m) => m.ActionsSettingsComponent),
          },
          {
            path: 'system',
            loadComponent: () =>
              import('./pages/settings/system/system-settings.component').then(
                (m) => m.SystemSettingsComponent,
              ),
          },
        ],
      },
    ],
  },
  { path: '**', redirectTo: '' },
];
