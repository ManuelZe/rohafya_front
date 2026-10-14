import { Component, inject, signal } from '@angular/core';
import { form, required, minLength, FormField, FormRoot } from '@angular/forms/signals';
import { Router, RouterLink } from '@angular/router';
import { AuthService } from '../auth-service';
import { extractErrorMessage } from '../../shared/api-error';

import { TranslatePipe } from '../../shared/i18n/t.pipe';
import { LangSwitch } from '../../shared/i18n/lang-switch';
interface MatriculeFormModel {
  federation_id: string;
}

@Component({
  selector: 'app-matricule',
  imports: [LangSwitch, TranslatePipe, RouterLink, FormField, FormRoot],
  templateUrl: './matricule.html',
  styleUrl: './matricule.css',
})
export class Matricule {
  private router = inject(Router);
  authService = inject(AuthService);

  errorMessage = signal<string | null>(null);

  readonly model = signal<MatriculeFormModel>({ federation_id: '' });
  readonly form = form(this.model, (f) => {
    required(f.federation_id, { message: 'Le matricule est requis' });
    minLength(f.federation_id, 3, { message: 'Minimum 3 caractères' });
  });

  handleSubmit() {
    const { federation_id } = this.model();
    if (this.form().valid()) {
      this.handleSendMatricule(federation_id);
    }
  }

  handleSendMatricule(federation_id: string) {
    this.errorMessage.set(null);

    this.authService.sendMatricule(federation_id).subscribe({
      next: () => {
        void this.router.navigate(['/connexion']);
      },
      error: (err: unknown) => {
        this.errorMessage.set(extractErrorMessage(err, "Une erreur est survenue lors de l'envoi du matricule. Veuillez réessayer."));
      },
    });
  }

  navigateToConnexion(): void {
    this.router.navigate(['/connexion']);
  }
}
