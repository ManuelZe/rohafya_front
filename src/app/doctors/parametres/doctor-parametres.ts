import { Component, DestroyRef, PLATFORM_ID, computed, effect, inject, signal, untracked } from '@angular/core';
import { isPlatformBrowser } from '@angular/common';
import { RouterLink } from '@angular/router';
import { form, required, email, pattern, validate, FormField, FormRoot } from '@angular/forms/signals';
import { PIcon } from '@primeicons/angular/p-icon';
import { AuthService } from '../../connexion/auth-service';
import { PageHeader } from '../../patients/shared/page-header/page-header';
import { DoctorProfileService } from '../doctor-profile.service';
import { DoctorUpdatePayload } from '../doctor.models';
import { extractErrorMessage } from '../shared/api-resource';
import { EdenLoader } from '../../shared/eden-loader/eden-loader';

type ProfileFormModel = DoctorUpdatePayload;
type FieldName = keyof ProfileFormModel;

const FIELD_NAMES: FieldName[] = [
  'DoctorLastname',
  'DoctorName',
  'DoctorDOB',
  'DoctorPOB',
  'DoctorCNI',
  'DoctorPhone',
  'DoctorPhone2',
  'DoctorEmail',
];

function emptyModel(): ProfileFormModel {
  return {
    DoctorName: '',
    DoctorLastname: '',
    DoctorDOB: '',
    DoctorPOB: '',
    DoctorCNI: '',
    DoctorPhone: '',
    DoctorPhone2: '',
    DoctorEmail: '',
  };
}

/** Même conversion que côté patient : l'API renvoie ISO ou RFC 1123, l'input attend 'YYYY-MM-DD'. */
function toDateInputValue(value: string | null): string {
  if (!value) return '';
  if (/^\d{4}-\d{2}-\d{2}/.test(value)) return value.slice(0, 10);
  const date = new Date(value);
  if (isNaN(date.getTime())) return '';
  const pad = (n: number) => String(n).padStart(2, '0');
  return `${date.getUTCFullYear()}-${pad(date.getUTCMonth() + 1)}-${pad(date.getUTCDate())}`;
}

const PHONE_PATTERN = /^\+?[0-9 ]{8,15}$/;

@Component({
  selector: 'app-doctor-parametres',
  imports: [EdenLoader, RouterLink, FormField, FormRoot, PIcon, PageHeader],
  templateUrl: './doctor-parametres.html',
  styleUrls: ['../shared/doctor-ui.css', './doctor-parametres.css'],
})
export class DoctorParametres {
  private readonly authService = inject(AuthService);
  private readonly profileService = inject(DoctorProfileService);
  private readonly platformId = inject(PLATFORM_ID);

  readonly profile = this.profileService.profile;
  readonly loading = this.profileService.loading;
  readonly isConfirmed = this.profileService.isConfirmed;

  readonly submitting = signal(false);
  readonly errorMessage = signal<string | null>(null);
  readonly successMessage = signal<string | null>(null);
  /** Le compte vient d'être confirmé : on propose d'accéder au tableau de bord. */
  readonly justConfirmed = signal(false);

  readonly signatureUrl = signal<string | null>(null);
  readonly signatureState = signal<'idle' | 'loading' | 'none'>('idle');

  readonly model = signal<ProfileFormModel>(emptyModel());
  readonly profileForm = form(this.model, (f) => {
    required(f.DoctorLastname, { message: 'Le nom est requis.' });
    required(f.DoctorName, { message: 'Le prénom est requis.' });
    required(f.DoctorDOB, { message: 'La date de naissance est requise.' });
    validate(f.DoctorDOB, ({ value }) => {
      const dob = value() ? new Date(`${value()}T00:00:00`) : null;
      if (!dob || isNaN(dob.getTime())) return undefined;
      const adult = new Date();
      adult.setFullYear(adult.getFullYear() - 18);
      return dob > adult ? { kind: 'dob', message: 'Date de naissance invalide (âge minimum : 18 ans).' } : undefined;
    });
    required(f.DoctorPOB, { message: 'Le lieu de naissance est requis.' });
    required(f.DoctorCNI, { message: 'Le numéro de CNI est requis.' });
    required(f.DoctorPhone, { message: 'Le téléphone est requis.' });
    pattern(f.DoctorPhone, PHONE_PATTERN, { message: 'Numéro invalide (8 à 15 chiffres).' });
    pattern(f.DoctorPhone2, PHONE_PATTERN, { message: 'Numéro invalide (8 à 15 chiffres).' });
    validate(f.DoctorPhone2, ({ value, valueOf }) =>
      value() && value().replace(/\s/g, '') === valueOf(f.DoctorPhone).replace(/\s/g, '')
        ? { kind: 'samePhone', message: 'Le second numéro doit être différent du premier.' }
        : undefined
    );
    required(f.DoctorEmail, { message: "L'email est requis." });
    email(f.DoctorEmail, { message: "Le format de l'email est invalide." });
  });

  readonly readOnlyInfo = computed(() => {
    const p = this.profile();
    if (!p) return [];
    const gender = p.DoctorGender === 'm' || p.DoctorGender === 'M' ? 'Masculin' : p.DoctorGender === 'f' || p.DoctorGender === 'F' ? 'Féminin' : '';
    return [
      { label: 'Matricule', value: p.DoctorFederationID },
      { label: "N° d'ordre", value: p.DoctorNO },
      { label: 'Spécialité', value: p.Speciality && p.Speciality !== 'Nothing' ? p.Speciality : '' },
      { label: 'Genre', value: gender },
    ].filter((i) => !!i.value);
  });

  private prefilledFor: number | null = null;

  constructor() {
    const user = this.authService.currentUser();
    if (isPlatformBrowser(this.platformId) && user && user.doctor_id !== null) {
      this.profileService.loadProfile(user.doctor_id).subscribe();
    }

    effect(() => {
      const p = this.profile();
      if (!p || this.prefilledFor === p.id) return;
      this.prefilledFor = p.id;
      untracked(() => {
        this.model.set({
          DoctorName: p.DoctorName ?? '',
          DoctorLastname: p.DoctorLastname ?? '',
          DoctorDOB: toDateInputValue(p.DoctorDOB),
          DoctorPOB: p.DoctorPOB ?? '',
          DoctorCNI: p.DoctorCNI ?? '',
          DoctorPhone: p.DoctorPhone ?? '',
          DoctorPhone2: p.DoctorPhone2 ?? '',
          DoctorEmail: p.DoctorEmail ?? '',
        });
        if (p.DoctorFederationID) this.loadSignature(p.DoctorFederationID);
      });
    });

    inject(DestroyRef).onDestroy(() => {
      const url = this.signatureUrl();
      if (url) URL.revokeObjectURL(url);
    });
  }

  /** Premier message d'erreur d'un champ, affiché une fois le champ touché. */
  errorOf(name: FieldName): string | null {
    const state = this.profileForm[name]();
    if (!state.touched()) return null;
    return state.errors()[0]?.message ?? null;
  }

  submit(): void {
    if (this.profileForm().invalid()) {
      FIELD_NAMES.forEach((name) => this.profileForm[name]().markAsTouched());
      this.errorMessage.set('Merci de corriger les champs signalés.');
      this.successMessage.set(null);
      return;
    }

    const doctorId = this.authService.currentUser()?.doctor_id;
    if (doctorId === null || doctorId === undefined) return;

    const wasConfirmed = !!this.profile()?.doctor_is_confirmed;

    this.submitting.set(true);
    this.errorMessage.set(null);
    this.successMessage.set(null);

    this.profileService.updateAndConfirm(doctorId, this.model()).subscribe({
      next: () => {
        this.submitting.set(false);
        this.justConfirmed.set(!wasConfirmed);
        this.successMessage.set(
          wasConfirmed ? 'Vos informations ont été mises à jour.' : 'Merci ! Votre profil est confirmé : tout votre espace est désormais accessible.'
        );
      },
      error: (err: unknown) => {
        this.submitting.set(false);
        this.errorMessage.set(extractErrorMessage(err, 'Échec de la mise à jour de vos informations.'));
      },
    });
  }

  private loadSignature(matricule: string): void {
    this.signatureState.set('loading');
    this.profileService.getSignature(matricule).subscribe({
      next: (blob) => {
        if (!blob.type.startsWith('image/')) {
          this.signatureState.set('none');
          return;
        }
        this.signatureUrl.set(URL.createObjectURL(blob));
        this.signatureState.set('idle');
      },
      error: () => this.signatureState.set('none'),
    });
  }
}
