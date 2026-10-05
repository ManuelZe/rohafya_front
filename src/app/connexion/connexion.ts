import { Component, inject, input, signal } from '@angular/core';
import { form, required, minLength, FormField, FormRoot } from '@angular/forms/signals';
import { Router, RouterLink } from "@angular/router";
import { AuthService } from './auth-service';
import { HttpErrorResponse } from '@angular/common/http';
import { LoginErrorResponse } from './login-response.model';
import { EmailCodeLogin } from './email-code-login/email-code-login';

interface LoginFormModel {
  username: string;
  password: string;
}

@Component({
  selector: 'app-connexion',
  imports: [RouterLink, FormField, FormRoot, EmailCodeLogin],
  templateUrl: './connexion.html',
  styleUrl: './connexion.css',
})
export class Connexion {

  authService = inject(AuthService);
  router = inject(Router);
  errorMessage = signal<string | null>(null);

  userType = signal<'doctor' | 'patient' | null>(null);

  /** Mot de passe historique, ou code à usage unique envoyé par e-mail. */
  readonly mode = signal<'password' | 'email'>('password');

  /** Page à rouvrir après la connexion (ex. rattachement par QR code : /l/<jeton>). */
  readonly returnUrl = input<string>();

  readonly model = signal<LoginFormModel>({ username: '', password: '' });
  readonly form = form(this.model, (f) => {
    required(f.username, { message: "Le nom d'utilisateur est requis" });
    minLength(f.username, 3, { message: 'Minimum 3 caractères' });
    required(f.password, { message: 'Le mot de passe est requis' });
    minLength(f.password, 6, { message: 'Minimum 6 caractères' });
  });

  selectUserType(type: 'doctor' | 'patient'): void {
    this.userType.set(type);
  }

  handleSubmit() {
    const { username, password } = this.model();
    if (this.form().valid() && this.userType()) {
      this.handleLogin(username, password, true);
    }
  }

  handleLogin(username: string, password: string, remember_me: boolean = true) {
    this.errorMessage.set(null);

    this.authService.login(username, password, remember_me).subscribe({
      next: () => this.onLoggedIn(),
      error: (err: HttpErrorResponse) => {
        const backendError = err.error as LoginErrorResponse;
        console.error('Erreur de connexion', err);
        this.errorMessage.set(
          backendError?.message ?? 'Une erreur est survenue. Réessayez.'
        );
      }
    });
  }

  /** Après connexion : la page demandée, sinon l'espace choisi s'il est autorisé, sinon celui du rôle. */
  onLoggedIn(): void {
    const target = this.returnUrl();
    const safeTarget = target && target.startsWith('/') && !target.startsWith('//') ? target : null;
    void this.router.navigateByUrl(safeTarget ?? this.authService.homeUrl(this.userType()));
  }
}
