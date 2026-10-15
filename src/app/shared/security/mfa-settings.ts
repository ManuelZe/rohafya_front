import { Component, DestroyRef, PLATFORM_ID, computed, inject, signal } from '@angular/core';
import { isPlatformBrowser } from '@angular/common';
import { FormField, FormRoot, form, pattern, required } from '@angular/forms/signals';
import { PIcon } from '@primeicons/angular/p-icon';
import { AuthService } from '../../connexion/auth-service';
import { SaasAccountService } from '../../saas/saas-account.service';
import type { SecurityStatus } from '../../saas/saas.models';
import { extractErrorMessage } from '../api-error';
import { LocalDatePipe } from '../i18n/ldate.pipe';
import { TranslatePipe } from '../i18n/t.pipe';
import { tr } from '../i18n/i18n';
import { MfaSetup, SecurityService } from './security.service';

type Step = 'idle' | 'setup' | 'codes';
type Action = 'renew' | 'disable' | null;

/** Double authentification du compte : activation (QR code), codes de secours, désactivation. */
@Component({
  selector: 'app-mfa-settings',
  imports: [TranslatePipe, LocalDatePipe, PIcon, FormRoot, FormField],
  templateUrl: './mfa-settings.html',
  styleUrl: './mfa-settings.css',
})
export class MfaSettings {
  private readonly service = inject(SecurityService);
  private readonly auth = inject(AuthService);
  private readonly account = inject(SaasAccountService);

  readonly status = signal<SecurityStatus | null>(null);
  readonly step = signal<Step>('idle');
  readonly setup = signal<MfaSetup | null>(null);
  readonly codes = signal<string[]>([]);
  readonly action = signal<Action>(null);
  readonly busy = signal(false);
  readonly error = signal<string | null>(null);
  readonly notice = signal<string | null>(null);

  readonly model = signal({ code: '' });
  readonly codeForm = form(this.model, (f) => {
    required(f.code, { message: 'Saisissez le code' });
    pattern(f.code, /^(\d{6}|[A-Za-z0-9]{4}-?[A-Za-z0-9]{4})$/, { message: 'Code à 6 chiffres attendu' });
  });

  /** Clé à saisir à la main, par groupes de 4 caractères. */
  readonly secretGroups = computed(() => (this.setup()?.secret.match(/.{1,4}/g) ?? []).join(' '));
  /** Fichier texte des codes de secours, téléchargé par un vrai lien (fonctionne aussi sur téléphone). */
  readonly codesFile = computed(() => {
    const codes = this.codes();
    if (!codes.length || typeof URL === 'undefined') return null;
    const text = [tr('Codes de secours ROHAFYA (chacun ne sert qu’une fois) :'), '', ...codes].join('\n');
    return URL.createObjectURL(new Blob([text], { type: 'text/plain;charset=utf-8' }));
  });

  constructor() {
    if (isPlatformBrowser(inject(PLATFORM_ID))) this.load();
    inject(DestroyRef).onDestroy(() => {
      const file = this.codesFile();
      if (file) URL.revokeObjectURL(file);
    });
  }

  load(): void {
    this.service.status().subscribe({
      next: (status) => this.status.set(status),
      error: (err: unknown) => this.error.set(extractErrorMessage(err, 'Impossible de charger la sécurité du compte.')),
    });
  }

  start(): void {
    this.run(this.service.setup(), (setup) => {
      this.setup.set(setup);
      this.step.set('setup');
    });
  }

  confirm(): void {
    if (this.codeForm().invalid()) return;
    this.run(this.service.enable(this.code()), (result) => {
      this.auth.replaceToken(result.access_token);
      this.status.set(result.security);
      this.codes.set(result.recovery_codes);
      this.setup.set(null);
      this.step.set('codes');
      this.account.load(true).subscribe();
    });
  }

  startAction(action: Action): void {
    this.action.set(action);
    this.model.set({ code: '' });
    this.error.set(null);
    this.notice.set(null);
  }

  submitAction(): void {
    if (this.codeForm().invalid()) return;
    if (this.action() === 'renew') {
      this.run(this.service.renewRecoveryCodes(this.code()), (result) => {
        this.status.set(result.security);
        this.codes.set(result.recovery_codes);
        this.action.set(null);
        this.step.set('codes');
      });
    } else if (this.action() === 'disable') {
      this.run(this.service.disable(this.code()), (result) => {
        this.status.set(result.security);
        this.action.set(null);
        this.notice.set('Double authentification désactivée.');
        this.account.load(true).subscribe();
      });
    }
  }

  done(): void {
    this.codes.set([]);
    this.step.set('idle');
    this.notice.set('Double authentification active : elle vous sera demandée à chaque connexion.');
  }

  private code(): string {
    return this.model().code.trim();
  }

  private run<T>(request: import('rxjs').Observable<T>, next: (value: T) => void): void {
    if (this.busy()) return;
    this.busy.set(true);
    this.error.set(null);
    request.subscribe({
      next: (value) => {
        this.busy.set(false);
        this.model.set({ code: '' });
        next(value);
      },
      error: (err: unknown) => {
        this.busy.set(false);
        this.error.set(extractErrorMessage(err, 'L’opération a échoué. Réessayez.'));
      },
    });
  }
}
