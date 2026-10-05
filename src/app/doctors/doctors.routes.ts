import { Routes } from '@angular/router';
import { Doctors } from './doctors';
import { doctorConfirmedGuard } from './doctor-guards';

const TITLE_SUFFIX = ' · Espace docteur';

/** Espace docteur — chargé à la demande depuis app.routes.ts (/doctors). */
export const DOCTOR_ROUTES: Routes = [
  {
    path: '',
    component: Doctors, // Barre latérale + <router-outlet>
    canActivateChild: [doctorConfirmedGuard], // Bloque tout sauf Paramètres tant que le profil n'est pas confirmé
    children: [
      {
        path: '',
        title: 'Tableau de bord' + TITLE_SUFFIX,
        loadComponent: () => import('./overview/doctor-overview').then((m) => m.DoctorOverview),
      },
      {
        path: 'commissions',
        title: 'Relevé de commissions' + TITLE_SUFFIX,
        loadComponent: () => import('./commissions/releve/releve').then((m) => m.Releve),
      },
      {
        path: 'commissions/mois',
        title: 'Commissions par mois' + TITLE_SUFFIX,
        loadComponent: () => import('./commissions/mensuel/mensuel').then((m) => m.Mensuel),
      },
      {
        path: 'commissions/annee',
        title: 'Commissions par année' + TITLE_SUFFIX,
        loadComponent: () => import('./commissions/annuel/annuel').then((m) => m.Annuel),
      },
      {
        path: 'commissions/periode',
        title: 'Commissions par période' + TITLE_SUFFIX,
        loadComponent: () => import('./commissions/periode/periode').then((m) => m.Periode),
      },
      {
        path: 'resultats',
        title: 'Résultats reçus' + TITLE_SUFFIX,
        loadComponent: () => import('./resultats/doctor-resultats').then((m) => m.DoctorResultats),
      },
      {
        path: 'actualites',
        title: 'Actualités' + TITLE_SUFFIX,
        loadComponent: () => import('./actualites/actualites').then((m) => m.Actualites),
      },
      {
        path: 'requests',
        title: 'Requêtes' + TITLE_SUFFIX,
        data: { audience: 'doctor' },
        loadComponent: () => import('../patients/requests/requests').then((m) => m.Requests),
      },
      {
        path: 'notifications',
        title: 'Notifications' + TITLE_SUFFIX,
        data: { homeLink: '/doctors' },
        loadComponent: () => import('../notifications/notifications').then((m) => m.Notifications),
      },
      {
        path: 'parametres',
        title: 'Paramètres' + TITLE_SUFFIX,
        loadComponent: () => import('./parametres/doctor-parametres').then((m) => m.DoctorParametres),
      },
    ],
  },
];
