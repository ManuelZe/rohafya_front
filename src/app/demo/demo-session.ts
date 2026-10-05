import { Service, computed, inject } from '@angular/core';
import { Router } from '@angular/router';
import { AuthService } from '../connexion/auth-service';
import { PatientProfileService } from '../patients/patient-profile-service';
import { PatientsService } from '../patients/patients-service';
import { DemoSpace, isDemoToken } from './demo-token';

/** Ouverture et fermeture de la session de démonstration (utilisateur et données fictifs). */
@Service()
export class DemoSession {
  private readonly authService = inject(AuthService);
  private readonly router = inject(Router);
  private readonly patientsService = inject(PatientsService);
  private readonly patientProfileService = inject(PatientProfileService);

  readonly active = computed(() => isDemoToken(this.authService.token()));

  async start(space: DemoSpace): Promise<void> {
    const { demoUser } = await import('./demo-backend');
    this.clearPatientCache();
    this.authService.openSession(demoUser(space));
    await this.router.navigateByUrl(space === 'patient' ? '/patients' : '/doctors');
  }

  stop(): void {
    this.clearPatientCache();
    this.authService.logout().subscribe(() => {
      void this.router.navigateByUrl('/intro');
    });
  }

  /** Les données patient ne sont pas indexées par utilisateur : on vide le cache d'une éventuelle session précédente. */
  private clearPatientCache(): void {
    this.patientsService.resetAll();
    this.patientProfileService.reset();
  }
}
