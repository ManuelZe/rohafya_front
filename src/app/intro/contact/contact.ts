import { Component, DOCUMENT, DestroyRef, inject, signal } from '@angular/core';
import { FormField, FormRoot, form, maxLength, minLength, required } from '@angular/forms/signals';
import { PIcon } from '@primeicons/angular/p-icon';
import { CONTACT } from '../intro.content';

export const CONTACT_PROFILES = [
  { value: 'patient', label: 'Patient' },
  { value: 'doctor', label: 'Médecin' },
  { value: 'establishment', label: 'Établissement de santé' },
  { value: 'partner', label: 'Informaticien ou partenaire' },
  { value: 'other', label: 'Autre' },
] as const;

export type ContactProfile = (typeof CONTACT_PROFILES)[number]['value'];

export interface ContactMessage {
  name: string;
  profile: ContactProfile;
  organization: string;
  message: string;
}

/** Lien mailto: prérempli (objet et corps) à partir du formulaire de contact. */
export function contactMailto(to: string, value: ContactMessage): string {
  const profile = CONTACT_PROFILES.find((p) => p.value === value.profile)?.label ?? 'Autre';
  const name = value.name.trim();
  const organization = value.organization.trim();

  const subject = `ROHAFYA · ${profile} · ${name}`;
  const signature = [name, organization, `Profil : ${profile}`].filter(Boolean).join('\n');
  const body = `${value.message.trim()}\n\n--\n${signature}`;

  return `mailto:${to}?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(body)}`;
}

/** Durée d'affichage du message « copié ». */
const COPIED_MS = 4000;

/**
 * Section « Nous contacter » : téléphone et e-mail cliquables, et un formulaire qui prépare
 * un e-mail dans la messagerie du visiteur (rien n'est envoyé par le site lui-même).
 */
@Component({
  selector: 'app-contact',
  imports: [PIcon, FormField, FormRoot],
  templateUrl: './contact.html',
  styleUrls: ['../intro-buttons.css', './contact.css'],
})
export class Contact {
  private readonly document = inject(DOCUMENT);

  readonly contact = CONTACT;
  readonly profiles = CONTACT_PROFILES;

  readonly copied = signal('');
  readonly prepared = signal(false);

  readonly model = signal<ContactMessage>({ name: '', profile: 'patient', organization: '', message: '' });
  readonly contactForm = form(this.model, (f) => {
    required(f.name, { message: 'Indiquez votre nom' });
    minLength(f.name, 2, { message: 'Minimum 2 caractères' });
    maxLength(f.organization, 120, { message: '120 caractères au maximum' });
    required(f.message, { message: 'Écrivez votre message' });
    minLength(f.message, 10, { message: 'Minimum 10 caractères' });
    maxLength(f.message, 1500, { message: '1 500 caractères au maximum' });
  });

  private copiedTimer: ReturnType<typeof setTimeout> | undefined;

  constructor() {
    inject(DestroyRef).onDestroy(() => clearTimeout(this.copiedTimer));
  }

  async copy(kind: 'phone' | 'email'): Promise<void> {
    const text = kind === 'phone' ? this.contact.phoneDisplay : this.contact.email;
    const label = kind === 'phone' ? 'Numéro copié' : 'Adresse e-mail copiée';
    try {
      await this.document.defaultView?.navigator.clipboard.writeText(text);
      this.announce(`${label} : ${text}`);
    } catch {
      this.announce(`Copie impossible : sélectionnez ${text}`);
    }
  }

  send(): void {
    this.contactForm().markAsTouched();
    if (this.contactForm().invalid()) {
      // Le focus va au premier champ à corriger, dans l'ordre du formulaire.
      const firstInvalid = this.contactForm.name().invalid() ? 'contact-name'
        : this.contactForm.organization().invalid() ? 'contact-organization'
        : 'contact-message';
      this.document.getElementById(firstInvalid)?.focus();
      return;
    }

    const view = this.document.defaultView;
    if (view) view.location.href = contactMailto(this.contact.email, this.model());
    this.prepared.set(true);
  }

  private announce(text: string): void {
    clearTimeout(this.copiedTimer);
    this.copied.set(text);
    this.copiedTimer = setTimeout(() => this.copied.set(''), COPIED_MS);
  }
}
