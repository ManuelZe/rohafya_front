import { Component, DestroyRef, afterNextRender, computed, inject, input, signal } from '@angular/core';
import { RouterLink } from '@angular/router';
import { FormField, FormRoot, form, maxLength } from '@angular/forms/signals';
import { PIcon } from '@primeicons/angular/p-icon';
import { PageHeader } from '../../patients/shared/page-header/page-header';
import { extractErrorMessage } from '../api-error';
import { LocalDatePipe } from '../i18n/ldate.pipe';
import { TranslatePipe } from '../i18n/t.pipe';
import { MfaSettings } from './mfa-settings';
import { AccessLogEntry, DeletionRequestView, SecurityService } from './security.service';

/** Libellé d'une ligne de l'historique des accès, selon l'action du journal. */
const ACCESS_LABELS: Record<string, string> = {
  'patient.viewed': 'Dossier consulté par l’établissement',
  'patient.saved': 'Dossier mis à jour par l’établissement',
  'result.viewed': 'Résultat partagé consulté par le médecin',
  'link_token.issued': 'QR code de rattachement remis',
  'link_token.revoked': 'QR code de rattachement annulé',
  'link.active': 'Dossier rattaché à votre compte',
  'link.pending': 'Rattachement en attente de validation',
  'link.revoked': 'Rattachement retiré par l’établissement',
  'link.revoked_by_patient': 'Établissement retiré de votre compte',
  'link.conflict': 'Tentative de rattachement par un autre compte',
  'account.exported': 'Export de vos données',
  'account.deletion_requested': 'Demande de suppression du compte',
  'account.deletion_cancelled': 'Demande de suppression annulée',
};
const ACCESS_ICONS: Record<string, string> = {
  'patient.viewed': 'eye',
  'result.viewed': 'eye',
  'link.conflict': 'exclamation-triangle',
  'account.exported': 'download',
};

/**
 * Confidentialité (patient et médecin) : historique des accès au dossier, export des données,
 * double authentification facultative et demande de suppression du compte (loi n° 2024/017).
 */
@Component({
  selector: 'app-privacy-center',
  imports: [TranslatePipe, LocalDatePipe, RouterLink, PIcon, PageHeader, FormRoot, FormField, MfaSettings],
  templateUrl: './privacy-center.html',
  styleUrl: './privacy-center.css',
})
export class PrivacyCenter {
  private readonly service = inject(SecurityService);

  /** Historique des accès : seulement pour un patient (son dossier médical). */
  readonly showAccessLog = input(true);

  readonly log = signal<AccessLogEntry[] | null>(null);
  readonly logError = signal<string | null>(null);
  readonly showAll = signal(false);
  readonly visibleLog = computed(() => (this.showAll() ? this.log() : this.log()?.slice(0, 10)) ?? []);

  readonly exportUrl = signal<string | null>(null);
  readonly exporting = signal(false);
  readonly exportError = signal<string | null>(null);

  readonly deletion = signal<DeletionRequestView | null>(null);
  readonly deletionBusy = signal(false);
  readonly deletionError = signal<string | null>(null);
  readonly confirmDeletion = signal(false);
  readonly deletionModel = signal({ reason: '', confirmed: false });
  readonly deletionForm = form(this.deletionModel, (f) => {
    maxLength(f.reason, 2000, { message: '2000 caractères au plus.' });
  });

  readonly labels = ACCESS_LABELS;
  readonly icons = ACCESS_ICONS;

  constructor() {
    afterNextRender(() => this.load());
    inject(DestroyRef).onDestroy(() => {
      const url = this.exportUrl();
      if (url) URL.revokeObjectURL(url);
    });
  }

  load(): void {
    if (this.showAccessLog()) {
      this.service.accessLog().subscribe({
        next: (result) => this.log.set(result.items),
        error: (err: unknown) => this.logError.set(extractErrorMessage(err, 'Impossible de charger l’historique des accès.')),
      });
    }
    this.service.deletionRequest().subscribe({ next: (request) => this.deletion.set(request), error: () => undefined });
  }

  /** Prépare le fichier puis propose un vrai lien (le téléchargement fonctionne aussi sur téléphone). */
  prepareExport(): void {
    if (this.exporting()) return;
    this.exporting.set(true);
    this.exportError.set(null);
    this.service.exportData().subscribe({
      next: (data) => {
        const previous = this.exportUrl();
        if (previous) URL.revokeObjectURL(previous);
        this.exportUrl.set(URL.createObjectURL(new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' })));
        this.exporting.set(false);
        if (this.showAccessLog()) this.load();
      },
      error: (err: unknown) => {
        this.exporting.set(false);
        this.exportError.set(extractErrorMessage(err, 'L’export a échoué. Réessayez.'));
      },
    });
  }

  requestDeletion(): void {
    if (this.deletionBusy() || !this.deletionModel().confirmed) return;
    this.deletionBusy.set(true);
    this.deletionError.set(null);
    this.service.requestDeletion(this.deletionModel().reason.trim()).subscribe({
      next: (request) => {
        this.deletionBusy.set(false);
        this.deletion.set(request);
        this.confirmDeletion.set(false);
      },
      error: (err: unknown) => {
        this.deletionBusy.set(false);
        this.deletionError.set(extractErrorMessage(err, 'La demande n’a pas pu être envoyée.'));
      },
    });
  }

  cancelDeletion(): void {
    if (this.deletionBusy()) return;
    this.deletionBusy.set(true);
    this.service.cancelDeletion().subscribe({
      next: () => {
        this.deletionBusy.set(false);
        this.deletion.set(null);
      },
      error: (err: unknown) => {
        this.deletionBusy.set(false);
        this.deletionError.set(extractErrorMessage(err, 'L’annulation a échoué.'));
      },
    });
  }
}
