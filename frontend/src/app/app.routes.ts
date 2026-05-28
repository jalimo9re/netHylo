import { Routes } from '@angular/router';
import { authGuard } from './core/guards/auth.guard';
import { agencyGuard } from './core/guards/agency.guard';

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
        path: 'contacts',
        loadComponent: () =>
          import('./pages/contacts/contacts.component').then(
            (m) => m.ContactsComponent,
          ),
      },
      {
        path: 'crm',
        loadComponent: () =>
          import('./pages/crm/crm-pipeline.component').then(
            (m) => m.CrmPipelineComponent,
          ),
      },
      {
        path: 'forms',
        loadComponent: () =>
          import('./pages/forms/forms.component').then(
            (m) => m.FormsComponent,
          ),
      },
      {
        path: 'automations',
        loadComponent: () =>
          import('./pages/automations/automations.component').then(
            (m) => m.AutomationsComponent,
          ),
      },
      {
        path: 'campaigns',
        loadComponent: () =>
          import('./pages/campaigns/campaigns.component').then(
            (m) => m.CampaignsComponent,
          ),
      },
      {
        path: 'social-planner',
        loadComponent: () =>
          import('./pages/social-planner/social-planner.component').then(
            (m) => m.SocialPlannerComponent,
          ),
      },
      {
        path: 'calendar',
        loadComponent: () =>
          import('./pages/calendar/calendar.component').then(
            (m) => m.CalendarComponent,
          ),
      },
      {
        path: 'sites',
        loadComponent: () =>
          import('./pages/sites/sites.component').then((m) => m.SitesComponent),
      },
      {
        path: 'funnels',
        loadComponent: () =>
          import('./pages/funnels/funnels.component').then(
            (m) => m.FunnelsComponent,
          ),
      },
      {
        path: 'billing',
        loadComponent: () =>
          import('./pages/billing/billing.component').then(
            (m) => m.BillingComponent,
          ),
      },
      {
        path: 'affiliates',
        loadComponent: () =>
          import('./pages/affiliates/affiliates.component').then(
            (m) => m.AffiliatesComponent,
          ),
      },
      {
        path: 'reputation',
        loadComponent: () =>
          import('./pages/reputation/reputation.component').then(
            (m) => m.ReputationComponent,
          ),
      },
      {
        path: 'memberships',
        loadComponent: () =>
          import('./pages/memberships/memberships.component').then(
            (m) => m.MembershipsComponent,
          ),
      },
      {
        path: 'memberships/:id',
        loadComponent: () =>
          import('./pages/memberships/membership-detail.component').then(
            (m) => m.MembershipDetailComponent,
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
        path: 'agency',
        canActivate: [agencyGuard],
        loadComponent: () =>
          import('./pages/agency/agency.component').then(
            (m) => m.AgencyComponent,
          ),
      },
      {
        path: 'mobile',
        loadComponent: () =>
          import('./pages/mobile/mobile.component').then((m) => m.MobileComponent),
      },
      {
        path: 'voice',
        loadComponent: () =>
          import('./pages/voice/voice.component').then((m) => m.VoiceComponent),
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
            path: 'testing',
            loadComponent: () =>
              import(
                './pages/settings/testing/integration-testing.component'
              ).then((m) => m.IntegrationTestingComponent),
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
