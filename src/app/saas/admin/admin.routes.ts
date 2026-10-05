import { Routes } from '@angular/router';
import { AdminShell } from './admin-shell';

const TITLE_SUFFIX = ' · Administration';

/** Espace administrateur d'établissement — chargé à la demande depuis app.routes.ts (/admin). */
export const ADMIN_ROUTES: Routes = [
  {
    path: '',
    component: AdminShell,
    children: [
      {
        path: '',
        title: 'Tableau de bord' + TITLE_SUFFIX,
        loadComponent: () => import('./dashboard/admin-dashboard').then((m) => m.AdminDashboard),
      },
      {
        path: 'patients',
        title: 'Patients' + TITLE_SUFFIX,
        loadComponent: () => import('./patients/admin-patients').then((m) => m.AdminPatients),
      },
      {
        path: 'patients/:ref',
        title: 'Dossier patient' + TITLE_SUFFIX,
        loadComponent: () => import('./patients/admin-patient-detail').then((m) => m.AdminPatientDetail),
      },
      {
        path: 'rattachements',
        title: 'Rattachements' + TITLE_SUFFIX,
        loadComponent: () => import('./links/admin-links').then((m) => m.AdminLinks),
      },
      {
        path: 'qr-codes',
        title: 'QR codes' + TITLE_SUFFIX,
        loadComponent: () => import('./qr-codes/admin-qr-codes').then((m) => m.AdminQrCodes),
      },
      {
        path: 'medecins',
        title: 'Médecins' + TITLE_SUFFIX,
        loadComponent: () => import('./doctors/admin-doctors').then((m) => m.AdminDoctors),
      },
      {
        path: 'donnees',
        title: 'Données reçues' + TITLE_SUFFIX,
        loadComponent: () => import('./records/admin-records').then((m) => m.AdminRecords),
      },
      {
        path: 'imports-pdf',
        title: 'Imports PDF' + TITLE_SUFFIX,
        loadComponent: () => import('./pdf-imports/admin-pdf-imports').then((m) => m.AdminPdfImports),
      },
      {
        path: 'imports-pdf/:id',
        title: 'Compte rendu PDF' + TITLE_SUFFIX,
        loadComponent: () => import('./pdf-imports/admin-pdf-import-detail').then((m) => m.AdminPdfImportDetail),
      },
      {
        path: 'integration',
        title: 'Intégration' + TITLE_SUFFIX,
        loadComponent: () => import('./integration/admin-integration').then((m) => m.AdminIntegration),
      },
      {
        path: 'parametres',
        title: 'Paramètres' + TITLE_SUFFIX,
        loadComponent: () => import('./settings/admin-settings').then((m) => m.AdminSettings),
      },
      {
        path: 'journal',
        title: 'Journal' + TITLE_SUFFIX,
        loadComponent: () => import('./audit/admin-audit').then((m) => m.AdminAudit),
      },
    ],
  },
];
