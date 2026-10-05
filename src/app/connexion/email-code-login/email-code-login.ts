import { Component, inject, output, signal } from '@angular/core';
import { FormField, FormRoot, email, form, maxLength, minLength, pattern, required } from '@angular/forms/signals';
import { extractErrorMessage } from '../../doctors/shared/api-resource';
import { AuthService } from '../auth-service';
import { CurrentUser } from '../current-user.model';

type Step = 'email' | 'code' | 'names';

/**
 * Connexion sans mot de passe : un code à usage unique est envoyé par e-mail.
 * Si aucun compte n'existe pour cette adresse, le nom et le prénom sont demandés pour créer un compte patient.
 */
@Component({
  selector: 'app-email-code-login',
  imports: [FormField, FormRoot],
  templateUrl: './email-code-login.html',
  styleUrls: ['../connexion.css', './email-code-login.css'],
})
export class EmailCodeLogin {
  private readonly authService = inject(AuthService);

  readonly loggedIn = output<CurrentUser>();

  readonly step = signal<Step>('email');
  readonly busy = signal(false);
  readonly errorMessage = signal<string | null>(null);
  readonly info = signal<string | null>(null);

  readonly emailModel = signal({ email: '' });
  readonly emailForm = form(this.emailModel, (f) => {
    required(f.email, { message: "L'adresse e-mail est requise" });
    email(f.email, { message: 'Adresse e-mail invalide' });
  });

  readonly codeModel = signal({ code: '' });
  readonly codeForm = form(this.codeModel, (f) => {
    required(f.code, { message: 'Le code est requis' });
    maxLength(f.code, 8, { message: 'Le code contient 6 chiffres' });
    pattern(f.code, /^\s*\d{6}\s*$/, { message: 'Le code contient 6 chiffres' });
  });

  readonly namesModel = signal({ first_name: '', last_name: '' });
  readonly namesForm = form(this.namesModel, (f) => {
    required(f.first_name, { message: 'Le prénom est requis' });
    minLength(f.first_name, 2, { message: 'Minimum 2 caractères' });
    required(f.last_name, { message: 'Le nom est requis' });
    minLength(f.last_name, 2, { message: 'Minimum 2 caractères' });
  });

  submitEmail(): void {
    if (this.emailForm().invalid() || this.busy()) return;
    this.sendCode();
  }

  resend(): void {
    this.codeForm().reset({ code: '' });
    this.sendCode();
  }

  changeEmail(): void {
    this.step.set('email');
    this.codeForm().reset({ code: '' });
    this.errorMessage.set(null);
    this.info.set(null);
  }

  submitCode(): void {
    if (this.codeForm().invalid() || this.busy()) return;
    this.verify();
  }

  submitNames(): void {
    if (this.namesForm().invalid() || this.busy()) return;
    const { first_name, last_name } = this.namesModel();
    this.verify({ first_name: first_name.trim(), last_name: last_name.trim() });
  }

  private sendCode(): void {
    this.busy.set(true);
    this.errorMessage.set(null);
    this.authService.requestEmailCode(this.email()).subscribe({
      next: () => {
        this.busy.set(false);
        this.step.set('code');
        this.info.set(`Un code à 6 chiffres a été envoyé à ${this.email()}. Il est valable 10 minutes.`);
      },
      error: (err: unknown) => {
        this.busy.set(false);
        this.errorMessage.set(extractErrorMessage(err, "Impossible d'envoyer le code. Réessayez."));
      },
    });
  }

  private verify(names?: { first_name: string; last_name: string }): void {
    this.busy.set(true);
    this.errorMessage.set(null);
    this.authService.verifyEmailCode(this.email(), this.codeModel().code.trim(), names).subscribe({
      next: (result) => {
        this.busy.set(false);
        if (result.kind === 'needs-registration') {
          this.step.set('names');
          this.info.set("Aucun compte n'utilise encore cette adresse : indiquez votre nom pour créer votre compte patient.");
          return;
        }
        this.loggedIn.emit(result.user);
      },
      error: (err: unknown) => {
        this.busy.set(false);
        this.errorMessage.set(extractErrorMessage(err, 'Code incorrect ou expiré.'));
      },
    });
  }

  private email(): string {
    return this.emailModel().email.trim().toLowerCase();
  }
}
