import { Component, computed, effect, inject, signal, PLATFORM_ID } from '@angular/core';
import { isPlatformBrowser, CommonModule } from '@angular/common';
import { form, required, email, FormField, FormRoot } from '@angular/forms/signals';
import { AuthService } from '../../connexion/auth-service';
import { PatientProfileService } from '../patient-profile-service';
import { PatientUpdatePayload } from '../patient-profile.models';
import { PageHeader } from '../shared/page-header/page-header';
import { EdenLoader } from '../../shared/eden-loader/eden-loader';

interface ParametresFormModel {
  PatientName: string;
  PatientLastname: string;
  PatientDOB: string;
  PatientPOB: string;
  PatientNat: string;
  PatientCNI: string;
  PatientGender: string;
  PatientPhone: string;
  PatientPhone2: string;
  PatientEmail: string;
}

function emptyFormModel(): ParametresFormModel {
  return {
    PatientName: '',
    PatientLastname: '',
    PatientDOB: '',
    PatientPOB: '',
    PatientNat: '',
    PatientCNI: '',
    PatientGender: '',
    PatientPhone: '',
    PatientPhone2: '',
    PatientEmail: '',
  };
}

/**
 * Convertit une date renvoyée par l'API en 'YYYY-MM-DD' pour <input type="date">.
 * L'API renvoie soit un format ISO (ex: 1990-05-12T00:00:00), soit un format RFC 1123
 * (ex: 'Mon, 07 Sep 2026 00:00:00 GMT'). On repasse par Date puis par les getters UTC
 * pour éviter tout décalage de jour dû au fuseau horaire local.
 */
function toDateInputValue(value: string | null): string {
  if (!value) return '';

  if (/^\d{4}-\d{2}-\d{2}/.test(value)) {
    return value.slice(0, 10);
  }

  const date = new Date(value);
  if (isNaN(date.getTime())) {
    return '';
  }

  const year = date.getUTCFullYear();
  const month = String(date.getUTCMonth() + 1).padStart(2, '0');
  const day = String(date.getUTCDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

const ACCESS_DENIED_MESSAGE = 'L’UTILISATEUR NE PEUT PAS AVOIR ACCÈS À CES DONNÉES.';

@Component({
  selector: 'app-parametres',
  imports: [EdenLoader, CommonModule, FormField, FormRoot, PageHeader],
  templateUrl: './parametres.html',
  styleUrl: './parametres.css',
})
export class Parametres {
  private readonly authService = inject(AuthService);
  private readonly profileService = inject(PatientProfileService);
  private readonly platformId = inject(PLATFORM_ID);

  readonly accessDeniedMessage = ACCESS_DENIED_MESSAGE;

  accessDenied = computed(() => {
    const user = this.authService.currentUser();

    if (!isPlatformBrowser(this.platformId)) {
      return true;
    }
    if (!user || !this.authService.isPatient() || user.patient_id === null) {
      return true;
    }
    return false;
  });

  loading = computed(() => this.profileService.loading());
  isConfirmed = computed(() => this.profileService.isConfirmed());
  profile = computed(() => this.profileService.profile());

  submitting = signal(false);
  errorMessage = signal<string | null>(null);
  successMessage = signal<string | null>(null);

  private prefilled = false;

  readonly formModel = signal<ParametresFormModel>(emptyFormModel());
  readonly profileForm = form(this.formModel, (f) => {
    required(f.PatientLastname, { message: 'Le nom est requis.' });
    required(f.PatientName, { message: 'Le prénom est requis.' });
    required(f.PatientDOB, { message: 'La date de naissance est requise.' });
    required(f.PatientPOB, { message: 'Le lieu de naissance est requis.' });
    required(f.PatientNat, { message: 'La nationalité est requise.' });
    required(f.PatientCNI, { message: 'Le numéro de CNI est requis.' });
    required(f.PatientGender, { message: 'Le genre est requis.' });
    required(f.PatientPhone, { message: 'Le téléphone est requis.' });
    required(f.PatientEmail, { message: "L'email est requis." });
    email(f.PatientEmail, { message: "Le format de l'email est invalide." });
  });

  constructor() {
    const user = this.authService.currentUser();
    if (isPlatformBrowser(this.platformId) && user && this.authService.isPatient() && user.patient_id !== null) {
      this.profileService.loadProfile(user.patient_id).subscribe();
    }

    effect(() => {
      const profile = this.profile();
      if (profile && !this.prefilled) {
        this.prefilled = true;
        this.formModel.set({
          PatientName: profile.PatientName ?? '',
          PatientLastname: profile.PatientLastname ?? '',
          PatientDOB: toDateInputValue(profile.PatientDOB),
          PatientPOB: profile.PatientPOB ?? '',
          PatientNat: profile.PatientNat ?? '',
          PatientCNI: profile.PatientCNI ?? '',
          PatientGender: profile.PatientGender ?? '',
          PatientPhone: profile.PatientPhone ?? '',
          PatientPhone2: profile.PatientPhone2 ?? '',
          PatientEmail: profile.PatientEmail ?? '',
        });
      }
    });
  }

  submit(): void {
    if (this.profileForm().invalid()) {
      this.errorMessage.set('Merci de compléter correctement tous les champs obligatoires.');
      this.successMessage.set(null);
      return;
    }

    const user = this.authService.currentUser();
    if (!user || user.patient_id === null) {
      return;
    }

    const model = this.formModel();
    const payload: PatientUpdatePayload = { ...model };

    this.submitting.set(true);
    this.errorMessage.set(null);
    this.successMessage.set(null);

    this.profileService.updatePatient(user.patient_id, payload).subscribe({
      next: () => {
        this.submitting.set(false);
        this.successMessage.set('Vos informations ont été mises à jour avec succès. Votre compte est confirmé.');
      },
      error: (err) => {
        this.submitting.set(false);
        this.errorMessage.set('Échec de la mise à jour de vos informations.');
        console.error(err);
      },
    });
  }
}
