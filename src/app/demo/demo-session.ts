import { Service, computed, inject } from '@angular/core';
import { Router } from '@angular/router';
import { firstValueFrom } from 'rxjs';
import { AuthService } from '../connexion/auth-service';
import { CommissionsService } from '../doctors/commissions/commissions.service';
import { DoctorProfileService } from '../doctors/doctor-profile.service';
import { DoctorResultatsService } from '../doctors/resultats/doctor-resultats.service';
import { PatientProfileService } from '../patients/patient-profile-service';
import { PatientsService } from '../patients/patients-service';
import { SaasAccountService } from '../saas/saas-account.service';
import { DEMO_HOME, DemoSpace, demoSpaceOf, isDemoToken } from './demo-token';

/**
 * Ouverture, changement de profil et fermeture de la session de démonstration.
 * Les trois profils partagent les mêmes données fictives : on peut passer de l'un à l'autre
 * pour suivre une demande du patient ou du médecin jusqu'à l'établissement.
 */
@Service()
export class DemoSession {
  private readonly authService = inject(AuthService);
  private readonly router = inject(Router);
  private readonly patientsService = inject(PatientsService);
  private readonly patientProfileService = inject(PatientProfileService);
  private readonly doctorProfileService = inject(DoctorProfileService);
  private readonly commissionsService = inject(CommissionsService);
  private readonly doctorResultatsService = inject(DoctorResultatsService);
  private readonly saasAccount = inject(SaasAccountService);

  /** Profil de la session démo en cours, sinon null. */
  readonly space = computed(() => demoSpaceOf(this.authService.token()));
  readonly active = computed(() => this.space() !== null);

  /**
   * Au démarrage : ferme une session démo d'un profil retiré de la démo (super-administrateur).
   * Sans cela, la page d'accueil renverrait vers un espace que la démo ne sert plus.
   */
  closeObsoleteSession(): void {
    if (isDemoToken(this.authService.token()) && this.space() === null) this.authService.forgetSession();
  }

  /** Ouvre (ou remplace) la session démo avec le profil choisi. */
  async start(space: DemoSpace): Promise<void> {
    const { demoUser } = await import('./demo-backend');
    this.clearCaches();
    this.authService.openSession(demoUser(space));
    await this.router.navigateByUrl(DEMO_HOME[space]);
  }

  /** Change de profil sans quitter la démo : les données saisies sont conservées. */
  switchTo(space: DemoSpace): Promise<void> {
    return this.start(space);
  }

  /** Remet les données fictives à leur état d'origine, puis rouvre le profil en cours. */
  async resetData(): Promise<void> {
    const space = this.space();
    const { resetDemoData } = await import('./demo-backend');
    resetDemoData();
    if (space) await this.start(space);
  }

  async stop(): Promise<void> {
    this.clearCaches();
    await firstValueFrom(this.authService.logout(), { defaultValue: null });
    await this.router.navigateByUrl('/intro');
  }

  /** Les services gardent en cache les données de l'utilisateur précédent : on les vide à chaque changement. */
  private clearCaches(): void {
    this.patientsService.resetAll();
    this.patientProfileService.reset();
    this.doctorProfileService.reset();
    this.commissionsService.resetAll();
    this.doctorResultatsService.reset();
    this.saasAccount.reset();
  }
}
