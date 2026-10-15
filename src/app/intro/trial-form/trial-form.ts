import { HttpClient } from '@angular/common/http';
import { Component, ElementRef, Injector, afterNextRender, inject, signal, viewChild } from '@angular/core';
import { FormField, FormRoot, email, form, maxLength, required, validate } from '@angular/forms/signals';
import { environment } from '../../../environments/environment';
import { extractErrorMessage } from '../../shared/api-error';
import { I18n } from '../../shared/i18n/i18n';
import { RouterLink } from '@angular/router';
import { TranslatePipe } from '../../shared/i18n/t.pipe';
import { TRIAL_KINDS, TRIAL_SLOTS, TRIAL_VOLUMES } from '../intro.content';

interface TrialModel {
  contact_name: string;
  job_title: string;
  establishment: string;
  city: string;
  phone: string;
  email: string;
  kind: string;
  monthly_volume: string;
  software: string;
  pain_points: string;
  preferred_slot: string;
  consent: boolean;
  /** Champ piège, invisible : rempli seulement par les robots. */
  website: string;
}

function emptyModel(): TrialModel {
  return {
    contact_name: '',
    job_title: '',
    establishment: '',
    city: '',
    phone: '',
    email: '',
    kind: '',
    monthly_volume: '',
    software: '',
    pain_points: '',
    preferred_slot: '',
    consent: false,
    website: '',
  };
}

type FieldName = keyof Omit<TrialModel, 'website'>;

/**
 * Demande d'essai d'un établissement (POST /saas/public/trial-requests, sans compte).
 * Les questions sont celles de la qualification du document de vente (annexe D.7).
 */
@Component({
  selector: 'app-trial-form',
  imports: [FormField, FormRoot, TranslatePipe, RouterLink],
  templateUrl: './trial-form.html',
  styleUrls: ['../intro-buttons.css', './trial-form.css'],
})
export class TrialForm {
  private readonly http = inject(HttpClient);
  private readonly i18n = inject(I18n);
  private readonly injector = inject(Injector);
  private readonly confirmation = viewChild<ElementRef<HTMLElement>>('confirmation');
  private readonly errorBox = viewChild<ElementRef<HTMLElement>>('errorBox');

  protected readonly kinds = TRIAL_KINDS;
  protected readonly volumes = TRIAL_VOLUMES;
  protected readonly slots = TRIAL_SLOTS;

  protected readonly model = signal<TrialModel>(emptyModel());
  protected readonly trialForm = form(this.model, (f) => {
    required(f.contact_name, { message: 'Indiquez votre nom.' });
    required(f.establishment, { message: 'Indiquez le nom de l’établissement.' });
    required(f.city, { message: 'Indiquez la ville.' });
    required(f.phone, { message: 'Indiquez un numéro WhatsApp ou de téléphone.' });
    required(f.email, { message: 'Indiquez une adresse e-mail.' });
    email(f.email, { message: 'Adresse e-mail invalide.' });
    required(f.kind, { message: 'Choisissez le type d’établissement.' });
    maxLength(f.pain_points, 2000, { message: '2 000 caractères au plus.' });
    validate(f.consent, ({ value }) => (value() ? undefined : { kind: 'consent', message: 'Cochez cette case pour que nous puissions vous recontacter.' }));
  });

  protected readonly sending = signal(false);
  protected readonly error = signal<string | null>(null);
  protected readonly sent = signal<string | null>(null);

  protected errorOf(name: FieldName): string | null {
    const state = this.trialForm[name]();
    if (!state.touched() || !state.invalid()) return null;
    return state.errors()[0]?.message ?? null;
  }

  protected submit(): void {
    if (this.sending()) return;
    if (this.trialForm().invalid()) {
      (Object.keys(this.model()) as (keyof TrialModel)[]).forEach((name) => this.trialForm[name]().markAsTouched());
      this.error.set('Vérifiez les champs signalés.');
      afterNextRender(() => this.errorBox()?.nativeElement.focus(), { injector: this.injector });
      return;
    }
    this.sending.set(true);
    this.error.set(null);
    this.http.post<{ message: string }>(`${environment.apiUrl}saas/public/trial-requests`, { ...this.model(), locale: this.i18n.lang() }).subscribe({
      next: (res) => {
        this.sending.set(false);
        this.sent.set(res?.message ?? 'Merci ! Votre demande est bien reçue.');
        this.model.set(emptyModel());
        afterNextRender(() => this.confirmation()?.nativeElement.focus(), { injector: this.injector });
      },
      error: (err: unknown) => {
        this.sending.set(false);
        this.error.set(extractErrorMessage(err, 'L’envoi a échoué. Réessayez, ou écrivez-nous sur WhatsApp.'));
        afterNextRender(() => this.errorBox()?.nativeElement.focus(), { injector: this.injector });
      },
    });
  }
}
