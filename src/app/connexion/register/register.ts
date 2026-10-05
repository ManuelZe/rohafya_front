import { Component, inject, signal } from '@angular/core';
import { form, required, minLength, email as emailValidator, FormField, FormRoot } from '@angular/forms/signals';
import { Router, RouterLink } from '@angular/router';
import { AuthService } from '../auth-service';
import { HttpErrorResponse } from '@angular/common/http';
import { RegistrationFormData } from '../register.model';

@Component({
  selector: 'app-register',
  imports: [RouterLink, FormField, FormRoot],
  templateUrl: './register.html',
  styleUrl: './register.css',
})
export class Register {
  authService = inject(AuthService);
  router = inject(Router);

  readonly model = signal<RegistrationFormData>({
    first_name: '',
    last_name: '',
    email: '',
    message: '',
  });

  readonly form = form(this.model, (f) => {
    required(f.first_name, { message: 'Le nom est requis' });
    minLength(f.first_name, 5, { message: 'Minimum 5 caractères' });
    required(f.last_name, { message: 'Le prénom est requis' });
    minLength(f.last_name, 5, { message: 'Minimum 5 caractères' });
    required(f.email, { message: "L'email est requis" });
    emailValidator(f.email, { message: 'Entrez une adresse email valide' });
  });

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
        this.model.set({ first_name: '', last_name: '', email: '', message: '' });
      },
      error: (err: HttpErrorResponse) => {
        this.errorMessage.set('Une erreur est survenue. Réessayez plus tard.');
      }
    });
  }

}
