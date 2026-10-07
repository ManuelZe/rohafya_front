import { Component, afterNextRender, inject, signal } from '@angular/core';
import { form, required, minLength, email as emailValidator, FormField, FormRoot } from '@angular/forms/signals';
import { Router, RouterLink } from '@angular/router';
import { AuthService } from '../auth-service';
import { HttpErrorResponse } from '@angular/common/http';
import { RegistrationFormData } from '../register.model';
import { EstablishmentsService } from '../../shared/submission/establishments.service';

@Component({
  selector: 'app-register',
  imports: [RouterLink, FormField, FormRoot],
  templateUrl: './register.html',
  styleUrl: './register.css',
})
export class Register {
  authService = inject(AuthService);
  router = inject(Router);
  readonly establishments = inject(EstablishmentsService);

  readonly model = signal<RegistrationFormData>({
    tenant_id: '',
    first_name: '',
    last_name: '',
    email: '',
    message: '',
  });

  readonly form = form(this.model, (f) => {
    required(f.tenant_id, { message: "Choisissez l'établissement destinataire." });
    required(f.first_name, { message: 'Le nom est requis' });
    minLength(f.first_name, 5, { message: 'Minimum 5 caractères' });
    required(f.last_name, { message: 'Le prénom est requis' });
    minLength(f.last_name, 5, { message: 'Minimum 5 caractères' });
    required(f.email, { message: "L'email est requis" });
    emailValidator(f.email, { message: 'Entrez une adresse email valide' });
  });

  constructor() {
    // Page pré-rendue : la liste des établissements n'est chargée que dans le navigateur.
    afterNextRender(() => this.establishments.load());
  }

  errorMessage = signal<string | null>(null);
  successMessage = signal<string | null>(null);

  handleSubmit() {
    this.errorMessage.set(null);
    this.successMessage.set(null);

    if (this.form().invalid()) {
      return;
    }

    this.authService.register(this.model()).subscribe({
      next: () => {
        this.successMessage.set('Votre demande a bien été envoyée.');
        void this.router.navigate(['/connexion']);
        this.model.set({ tenant_id: '', first_name: '', last_name: '', email: '', message: '' });
      },
      error: (err: HttpErrorResponse) => {
        const message = (err.error as { message?: string } | null)?.message;
        this.errorMessage.set(message || 'Une erreur est survenue. Réessayez plus tard.');
      }
    });
  }

}
