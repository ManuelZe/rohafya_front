import { Component, ElementRef, afterNextRender, inject, input, output, signal, viewChild } from '@angular/core';
import { FormField, FormRoot, form, pattern, required } from '@angular/forms/signals';
import { AuthService } from '../auth-service';
import { extractErrorMessage } from '../../shared/api-error';
import { TranslatePipe } from '../../shared/i18n/t.pipe';

/** Deuxième étape de la connexion : code de l'application d'authentification (ou code de secours). */
@Component({
  selector: 'app-mfa-step',
  imports: [TranslatePipe, FormRoot, FormField],
  template: `
    <form class="mfa-step" [formRoot]="mfaForm" (submit)="submit()" aria-labelledby="mfa-title">
      <h2 id="mfa-title" class="mfa-title">{{ 'Double authentification' | t }}</h2>
      <p class="mfa-help">
        {{ (recovery() ? 'Saisissez l’un de vos codes de secours (8 caractères). Chaque code ne sert qu’une fois.' : 'Ouvrez votre application d’authentification et saisissez le code à 6 chiffres affiché pour ROHAFYA.') | t }}
      </p>
      <label class="mfa-label" for="mfa-code">{{ (recovery() ? 'Code de secours' : 'Code à 6 chiffres') | t }}</label>
      <input
        #codeInput
        id="mfa-code"
        class="mfa-input"
        type="text"
        [attr.inputmode]="recovery() ? 'text' : 'numeric'"
        [attr.autocomplete]="recovery() ? 'off' : 'one-time-code'"
        [formField]="mfaForm.code"
        [attr.aria-invalid]="!!error()"
        [attr.aria-describedby]="error() ? 'mfa-error' : null"
      />
      @if (error()) {
        <p id="mfa-error" class="mfa-error" role="alert">{{ error() | t }}</p>
      }
      <button type="submit" class="mfa-submit" [disabled]="busy() || mfaForm().invalid()">
        {{ (busy() ? 'Vérification…' : 'Valider') | t }}
      </button>
      <div class="mfa-links">
        <button type="button" class="mfa-link" (click)="toggleRecovery()">
          {{ (recovery() ? 'Utiliser le code de l’application' : 'Téléphone indisponible ? Utiliser un code de secours') | t }}
        </button>
        <button type="button" class="mfa-link" (click)="cancelled.emit()">{{ 'Recommencer la connexion' | t }}</button>
      </div>
    </form>
  `,
  styles: `
    .mfa-step {
      display: flex;
      flex-direction: column;
      gap: 0.6rem;
    }
    .mfa-title {
      margin: 0;
      font-size: 1.15rem;
      color: var(--rohafya-navy, #0c4562);
    }
    .mfa-help {
      margin: 0;
      font-size: 0.9rem;
      line-height: 1.5;
      color: #4b5563;
    }
    .mfa-label {
      font-weight: 600;
      font-size: 0.9rem;
    }
    .mfa-input {
      font-size: 1.4rem;
      letter-spacing: 0.3em;
      text-align: center;
      padding: 0.6rem;
      border: 1px solid #9ca3af;
      border-radius: 0.5rem;
    }
    .mfa-input:focus-visible {
      outline: 3px solid var(--rohafya-green-600, #059669);
      outline-offset: 1px;
    }
    .mfa-error {
      margin: 0;
      color: #b91c1c;
      font-size: 0.85rem;
    }
    .mfa-submit {
      min-height: 2.75rem;
      border: none;
      border-radius: 0.5rem;
      background: var(--rohafya-green-700, #047857);
      color: #ffffff;
      font: inherit;
      font-weight: 700;
      cursor: pointer;
    }
    .mfa-submit:disabled {
      opacity: 0.6;
      cursor: not-allowed;
    }
    .mfa-links {
      display: flex;
      flex-direction: column;
      align-items: flex-start;
      gap: 0.25rem;
    }
    .mfa-link {
      border: none;
      background: none;
      padding: 0.25rem 0;
      color: var(--rohafya-green-700, #047857);
      font: inherit;
      font-size: 0.85rem;
      text-decoration: underline;
      cursor: pointer;
    }
  `,
})
export class MfaStep {
  private readonly auth = inject(AuthService);

  readonly token = input.required<string>();
  readonly verified = output<void>();
  readonly cancelled = output<void>();

  readonly recovery = signal(false);
  readonly busy = signal(false);
  readonly error = signal<string | null>(null);
  readonly model = signal({ code: '' });
  readonly mfaForm = form(this.model, (f) => {
    required(f.code, { message: 'Saisissez le code' });
    pattern(f.code, /^(\d{6}|[A-Za-z0-9]{4}-?[A-Za-z0-9]{4})$/, { message: 'Code incomplet' });
  });
  private readonly input = viewChild<ElementRef<HTMLInputElement>>('codeInput');

  constructor() {
    afterNextRender(() => this.input()?.nativeElement.focus());
  }

  toggleRecovery(): void {
    this.recovery.update((value) => !value);
    this.model.set({ code: '' });
    this.error.set(null);
    this.input()?.nativeElement.focus();
  }

  submit(): void {
    if (this.busy() || this.mfaForm().invalid()) return;
    this.busy.set(true);
    this.error.set(null);
    this.auth.verifyMfa(this.token(), this.model().code.trim()).subscribe({
      next: () => {
        this.busy.set(false);
        this.verified.emit();
      },
      error: (err: unknown) => {
        this.busy.set(false);
        this.model.set({ code: '' });
        this.error.set(extractErrorMessage(err, 'Code incorrect. Réessayez.'));
        this.input()?.nativeElement.focus();
      },
    });
  }
}
