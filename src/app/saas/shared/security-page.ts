import { Component, inject } from '@angular/core';
import { PageHeader } from '../../patients/shared/page-header/page-header';
import { TranslatePipe } from '../../shared/i18n/t.pipe';
import { MfaSettings } from '../../shared/security/mfa-settings';
import { SaasAccountService } from '../saas-account.service';

/** Page « Sécurité » des consoles : double authentification du compte administrateur. */
@Component({
  selector: 'app-console-security',
  imports: [TranslatePipe, PageHeader, MfaSettings],
  template: `
    <div class="page">
      <app-page-header [title]="'Sécurité' | t" [subtitle]="'Double authentification de votre compte administrateur.' | t" />
      @if (account.mfaSetupNeeded()) {
        <div class="banner banner-info" role="status">
          <span>{{ 'Pour protéger les données de santé, la double authentification est obligatoire pour les administrateurs. Activez-la pour ouvrir la console.' | t }}</span>
        </div>
      }
      <section class="card">
        <app-mfa-settings />
      </section>
    </div>
  `,
  styleUrls: ['../../doctors/shared/doctor-ui.css', './console-ui.css'],
})
export class ConsoleSecurity {
  readonly account = inject(SaasAccountService);
}
