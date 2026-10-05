import { inject } from '@angular/core';
import { CanActivateChildFn, Router } from '@angular/router';
import { map } from 'rxjs';
import { AuthService } from '../connexion/auth-service';
import { PatientProfileService } from './patient-profile-service';

/**
 * Empêche l'accès à toute page de l'espace patient tant que le profil n'est pas confirmé
 * (patient_is_confirmed === false) et redirige systématiquement vers /patients/parametres.
 * La page Paramètres elle-même reste toujours accessible.
 */
export const patientConfirmedGuard: CanActivateChildFn = (childRoute) => {
  if (childRoute.routeConfig?.path === 'parametres') {
    return true;
  }

  const authService = inject(AuthService);
  const profileService = inject(PatientProfileService);
  const router = inject(Router);

  const user = authService.currentUser();
  if (!user || !authService.isPatient() || user.patient_id === null) {
    return true;
  }

  return profileService.loadProfile(user.patient_id).pipe(
    map((profile) => (!profile || profile.patient_is_confirmed ? true : router.parseUrl('/patients/parametres')))
  );
};
