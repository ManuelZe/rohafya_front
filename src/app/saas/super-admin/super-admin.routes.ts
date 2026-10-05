import { Routes } from '@angular/router';
import { SuperAdminShell } from './super-admin-shell';

const TITLE_SUFFIX = ' · Super-administration';

/** Console super-administrateur — chargée à la demande depuis app.routes.ts (/super-admin). */
export const SUPER_ADMIN_ROUTES: Routes = [
  {
    path: '',
    component: SuperAdminShell,
    children: [
      {
        path: '',
        title: "Vue d'ensemble" + TITLE_SUFFIX,
        loadComponent: () => import('./overview/super-overview').then((m) => m.SuperOverview),
      },
      {
        path: 'etablissements',
        title: 'Établissements' + TITLE_SUFFIX,
        loadComponent: () => import('./tenants/super-tenants').then((m) => m.SuperTenants),
      },
      {
        path: 'etablissements/:id',
        title: 'Établissement' + TITLE_SUFFIX,
        loadComponent: () => import('./tenants/super-tenant-detail').then((m) => m.SuperTenantDetail),
      },
      {
        path: 'comptes',
        title: 'Comptes' + TITLE_SUFFIX,
        loadComponent: () => import('./accounts/super-accounts').then((m) => m.SuperAccounts),
      },
      {
        path: 'journal',
        title: 'Journal' + TITLE_SUFFIX,
        loadComponent: () => import('./audit/super-audit').then((m) => m.SuperAudit),
      },
    ],
  },
];
