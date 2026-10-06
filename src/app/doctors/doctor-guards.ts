import { inject } from '@angular/core';
import { CanActivateChildFn, CanActivateFn, Router } from '@angular/router';
import { map } from 'rxjs';
import { AuthService } from '../connexion/auth-service';
import { SaasAccountService } from '../saas/saas-account.service';
import { DoctorProfileService } from './doctor-profile.service';

/**
 * Réserve l'espace /doctors aux comptes ayant le rôle Doctor et un profil docteur lié.
 * Un compte patient qui s'y aventure est renvoyé vers son propre espace.
 */
export const doctorGuard: CanActivateFn = () => {
  const authService = inject(AuthService);
  const router = inject(Router);
  const user = authService.currentUser();

  if (user && authService.isDoctor() && user.doctor_id !== null) {
    return true;
  }
  if (user && authService.isPatient() && user.patient_id !== null) {
    return router.parseUrl('/patients');
  }
  return router.parseUrl('/connexion');
};

/**
 * Tant que le profil docteur n'est pas confirmé (doctor_is_confirmed === false),
 * seule la page Paramètres reste accessible.
 */
export const doctorConfirmedGuard: CanActivateChildFn = (childRoute) => {
  if (childRoute.routeConfig?.path === 'parametres') {
    return true;
  }

  const authService = inject(AuthService);
  const profileService = inject(DoctorProfileService);
  const router = inject(Router);

  const user = authService.currentUser();
  if (!user || user.doctor_id === null) {
    return true;
  }

  return profileService
    .loadProfile(user.doctor_id)
    .pipe(map((profile) => (!profile || profile.doctor_is_confirmed ? true : router.parseUrl('/doctors/parametres'))));
};

/**
 * Pages Commissions : seulement si le module est activé pour le médecin (sinon retour au tableau
 * de bord). Le menu les masque déjà ; ce garde couvre aussi l'accès direct par l'adresse.
 */
export const commissionsEnabledGuard: CanActivateFn = () => {
  const account = inject(SaasAccountService);
  const router = inject(Router);
  return account.load().pipe(map(() => (account.commissionsEnabled() ? true : router.parseUrl('/doctors'))));
};
