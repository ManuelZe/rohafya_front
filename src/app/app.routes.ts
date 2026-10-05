import { Routes } from '@angular/router';
import { Connexion } from './connexion/connexion';
import { Intro } from './intro/intro';
import { Matricule } from './connexion/matricule/matricule';
import { Register } from './connexion/register/register';
import { Patients } from './patients/patients';
import { Factures } from './patients/factures/factures';
import { Overview } from './patients/overview/overview'; // Séparer la section Overview
import { Details } from './patients/factures/details/details';
import { Requests } from './patients/requests/requests';
import { authGuard } from './connexion/auth-guard'; // Importer le guard d'authentification
import { Prescriptions } from './patients/prescriptions/prescriptions';
import { Enregistrement } from './patients/enregistrement/enregistrement';
import { Notifications } from './notifications/notifications';
import { Resultats } from './patients/resultats/resultats';
import { Parametres } from './patients/parametres/parametres';
import { Laboratoire } from './patients/laboratoire/laboratoire';
import { Imagerie } from './patients/imagerie/imagerie';
import { Exploration } from './patients/exploration/exploration';
import { Devis } from './patients/devis/devis';
import { patientConfirmedGuard } from './patients/patient-confirmed-guard';
import { doctorGuard } from './doctors/doctor-guards';
import { superAdminGuard, tenantAdminGuard } from './saas/saas-guards';

export const routes: Routes = [
    { path: '', redirectTo: 'intro', pathMatch: 'full' },
    { path: 'connexion', component: Connexion },
    { path: 'intro', component: Intro },
    { path: 'matricule', component: Matricule },
    { path: 'register', component: Register },
    // Lien du QR code imprimé sur la facture : rattachement d'un dossier d'établissement au compte.
    {
        path: 'l/:token',
        title: 'Rattacher mon dossier',
        loadComponent: () => import('./saas/link-redeem/link-redeem').then((m) => m.LinkRedeem),
    },
    { path: 'requests', component: Requests },
    { path: 'notifications', component: Notifications, canActivate: [authGuard] },
    {
        path: 'patients',
        canActivate: [authGuard], // Ajouter des guards si nécessaire
        canActivateChild: [patientConfirmedGuard], // Bloque l'accès si le profil patient n'est pas confirmé
        component: Patients, // Contient la Sidebar et <router-outlet></router-outlet>
        children: [
            { path: '', component: Overview }, // Route par défaut (/patients)
            { path: 'requests', component: Requests }, // Route enfant (/patients/requests)
            { path: 'factures', component: Factures },
            { path: 'prescriptions', component: Prescriptions },
            { path: 'enregistrement', component: Enregistrement },
            { path: 'resultats', component: Resultats },
            { path: 'laboratoire', component: Laboratoire },
            { path: 'imagerie', component: Imagerie },
            { path: 'exploration', component: Exploration },
            { path: 'devis', component: Devis },
            {
                path: 'etablissements',
                loadComponent: () => import('./patients/etablissements/etablissements').then((m) => m.Etablissements),
            },
            { path: 'parametres', component: Parametres }
        ]
    },
    {
        path: 'doctors',
        canActivate: [authGuard, doctorGuard], // Connecté + rôle Doctor avec un profil docteur lié
        loadChildren: () => import('./doctors/doctors.routes').then((m) => m.DOCTOR_ROUTES),
    },
    {
        path: 'admin',
        canActivate: [authGuard, tenantAdminGuard], // Administrateur d'au moins un établissement
        loadChildren: () => import('./saas/admin/admin.routes').then((m) => m.ADMIN_ROUTES),
    },
    {
        path: 'super-admin',
        canActivate: [authGuard, superAdminGuard], // Super-administrateur de la plateforme
        loadChildren: () => import('./saas/super-admin/super-admin.routes').then((m) => m.SUPER_ADMIN_ROUTES),
    },
];
