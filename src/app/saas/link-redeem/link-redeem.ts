import { Component, PLATFORM_ID, computed, effect, inject, input, signal, untracked } from '@angular/core';
import { isPlatformBrowser } from '@angular/common';
import { Router, RouterLink } from '@angular/router';
import { AuthService } from '../../connexion/auth-service';
import { EmailCodeLogin } from '../../connexion/email-code-login/email-code-login';
import { extractErrorMessage } from '../../doctors/shared/api-resource';
import { PatientsService } from '../../patients/patients-service';
import { PublicTokenInfo, SaasAccountService } from '../saas-account.service';
import { PatientLinkView } from '../saas.models';

const STATUS_MESSAGES: Record<Exclude<PublicTokenInfo['status'], 'active'>, string> = {
  used: 'Ce QR code a déjà été utilisé. Si votre dossier est déjà rattaché, connectez-vous pour voir vos résultats.',
  expired: "Ce QR code a expiré. Demandez-en un nouveau à l'accueil de l'établissement.",
  revoked: "Ce QR code a été annulé par l'établissement. Utilisez le dernier code qui vous a été remis.",
};

/** Page ouverte par le QR code de la facture : connexion (ou création de compte) puis rattachement du dossier. */
@Component({
  selector: 'app-link-redeem',
  imports: [RouterLink, EmailCodeLogin],
  templateUrl: './link-redeem.html',
  styleUrls: ['../../connexion/connexion.css', './link-redeem.css'],
})
export class LinkRedeem {
  private readonly authService = inject(AuthService);
  private readonly account = inject(SaasAccountService);
  private readonly patientsService = inject(PatientsService);
  private readonly router = inject(Router);
  private readonly platformId = inject(PLATFORM_ID);

  /** Jeton du QR code (paramètre de route /l/:token). */
  readonly token = input.required<string>();

  readonly info = signal<PublicTokenInfo | null>(null);
  readonly loadError = signal<string | null>(null);
  readonly busy = signal(false);
  readonly errorMessage = signal<string | null>(null);
  readonly result = signal<{ message: string; link: PatientLinkView } | null>(null);

  readonly isLoggedIn = this.authService.isLoggedIn;
  readonly userEmail = computed(() => this.authService.currentUser()?.email ?? '');
  readonly statusMessage = computed(() => {
    const status = this.info()?.status;
    return status && status !== 'active' ? STATUS_MESSAGES[status] : null;
  });
  readonly passwordLoginParams = computed(() => ({ returnUrl: `/l/${this.token()}` }));

  constructor() {
    effect(() => {
      const token = this.token();
      if (!isPlatformBrowser(this.platformId)) return;
      untracked(() => this.loadInfo(token));
    });
  }

  private loadInfo(token: string): void {
    this.account.publicTokenInfo(token).subscribe({
      next: (info) => this.info.set(info),
      error: (err: unknown) => this.loadError.set(extractErrorMessage(err, "Ce QR code n'est pas reconnu.")),
    });
  }

  redeem(): void {
    if (this.busy()) return;
    this.busy.set(true);
    this.errorMessage.set(null);
    this.account.redeem(this.token()).subscribe({
      next: (response) => {
        this.busy.set(false);
        this.result.set(response);
        this.patientsService.resetAll();
        this.account.load(true).subscribe();
      },
      error: (err: unknown) => {
        this.busy.set(false);
        this.errorMessage.set(extractErrorMessage(err, 'Le rattachement a échoué. Réessayez.'));
      },
    });
  }

  goToResults(): void {
    void this.router.navigateByUrl('/patients/etablissements');
  }
}
