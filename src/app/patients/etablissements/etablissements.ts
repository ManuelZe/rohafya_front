import { Component, PLATFORM_ID, inject, signal } from '@angular/core';
import { DatePipe, isPlatformBrowser } from '@angular/common';
import { FormField, FormRoot, form, required } from '@angular/forms/signals';
import { PIcon } from '@primeicons/angular/p-icon';
import { extractErrorMessage } from '../../doctors/shared/api-resource';
import { SaasAccountService } from '../../saas/saas-account.service';
import { LINK_STATUS_LABELS, PatientLinkView } from '../../saas/saas.models';
import { PatientsService } from '../patients-service';
import { PageHeader } from '../shared/page-header/page-header';

/** « Mes établissements » : établissements rattachés au compte, ajout par code, retrait. */
@Component({
  selector: 'app-etablissements',
  imports: [DatePipe, FormField, FormRoot, PIcon, PageHeader],
  templateUrl: './etablissements.html',
  styleUrls: ['../../doctors/shared/doctor-ui.css', './etablissements.css'],
})
export class Etablissements {
  private readonly account = inject(SaasAccountService);
  private readonly patientsService = inject(PatientsService);
  private readonly platformId = inject(PLATFORM_ID);

  readonly statusLabels = LINK_STATUS_LABELS;
  readonly links = signal<PatientLinkView[] | null>(null);
  readonly loading = signal(false);
  readonly loadError = signal<string | null>(null);

  readonly codeModel = signal({ code: '' });
  readonly codeForm = form(this.codeModel, (f) => {
    required(f.code, { message: 'Saisissez le code imprimé sur votre facture' });
  });
  readonly adding = signal(false);
  readonly addError = signal<string | null>(null);
  readonly success = signal<string | null>(null);

  readonly confirmRemove = signal<PatientLinkView | null>(null);
  readonly removing = signal(false);

  constructor() {
    if (isPlatformBrowser(this.platformId)) {
      this.load();
    }
  }

  load(): void {
    this.loading.set(true);
    this.loadError.set(null);
    this.account.links().subscribe({
      next: (links) => {
        this.links.set(links);
        this.loading.set(false);
      },
      error: (err: unknown) => {
        this.loadError.set(extractErrorMessage(err, 'Impossible de charger vos établissements.'));
        this.loading.set(false);
      },
    });
  }

  addEstablishment(): void {
    if (this.codeForm().invalid() || this.adding()) return;
    this.adding.set(true);
    this.addError.set(null);
    this.success.set(null);
    this.account.redeem(this.codeModel().code.trim()).subscribe({
      next: (response) => {
        this.adding.set(false);
        this.success.set(response.message);
        this.codeForm().reset({ code: '' });
        this.afterChange();
      },
      error: (err: unknown) => {
        this.adding.set(false);
        this.addError.set(extractErrorMessage(err, 'Code invalide.'));
      },
    });
  }

  askRemove(link: PatientLinkView): void {
    this.confirmRemove.set(link);
  }

  cancelRemove(): void {
    this.confirmRemove.set(null);
  }

  remove(): void {
    const link = this.confirmRemove();
    if (!link || this.removing()) return;
    this.removing.set(true);
    this.account.revoke(link).subscribe({
      next: (response) => {
        this.removing.set(false);
        this.confirmRemove.set(null);
        this.success.set(response.message);
        this.afterChange();
      },
      error: (err: unknown) => {
        this.removing.set(false);
        this.confirmRemove.set(null);
        this.loadError.set(extractErrorMessage(err, 'Le retrait a échoué.'));
      },
    });
  }

  trackLink(link: PatientLinkView): string {
    return `${link.tenant_id}-${link.local_ref}`;
  }

  /** Les listes de résultats et factures agrègent les établissements : on les recharge. */
  private afterChange(): void {
    this.patientsService.resetAll();
    this.account.load(true).subscribe();
    this.load();
  }
}
