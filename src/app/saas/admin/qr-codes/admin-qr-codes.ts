import { Component, PLATFORM_ID, effect, inject, signal, untracked } from '@angular/core';
import { DatePipe, isPlatformBrowser } from '@angular/common';
import { RouterLink } from '@angular/router';
import { FormField, FormRoot, email, form, required } from '@angular/forms/signals';
import { PIcon } from '@primeicons/angular/p-icon';
import { extractErrorMessage } from '../../../doctors/shared/api-resource';
import { PageHeader } from '../../../patients/shared/page-header/page-header';
import { Pager } from '../../shared/pager';
import { IssuedLinkToken, LinkTokenView } from '../../saas.models';
import { TenantAdminService } from '../../tenant-admin.service';
import { QrTicket } from '../shared/qr-ticket';
import { TenantContext } from '../tenant-context.service';

const PAGE_SIZE = 20;
const STATUS_LABELS: Record<LinkTokenView['status'], string> = {
  active: 'Actif',
  used: 'Utilisé',
  expired: 'Expiré',
  revoked: 'Annulé',
};

@Component({
  selector: 'app-admin-qr-codes',
  imports: [DatePipe, RouterLink, FormField, FormRoot, PIcon, PageHeader, Pager, QrTicket],
  templateUrl: './admin-qr-codes.html',
  styleUrls: ['../../../doctors/shared/doctor-ui.css', '../../shared/console-ui.css'],
})
export class AdminQrCodes {
  private readonly service = inject(TenantAdminService);
  private readonly platformId = inject(PLATFORM_ID);
  readonly context = inject(TenantContext);

  readonly statusLabels = STATUS_LABELS;
  readonly pageSize = PAGE_SIZE;

  readonly model = signal({ local_ref: '', email: '' });
  readonly qrForm = form(this.model, (f) => {
    required(f.local_ref, { message: 'Le numéro de dossier est requis' });
    email(f.email, { message: 'Adresse e-mail invalide' });
  });
  readonly issuing = signal(false);
  readonly formError = signal<string | null>(null);
  readonly notice = signal<string | null>(null);
  readonly ticket = signal<IssuedLinkToken | null>(null);

  readonly tokens = signal<LinkTokenView[]>([]);
  readonly total = signal(0);
  readonly page = signal(1);
  readonly loading = signal(false);
  readonly loaded = signal(false);
  readonly error = signal<string | null>(null);
  readonly busyId = signal<number | null>(null);

  constructor() {
    effect(() => {
      const id = this.context.tenantId();
      if (!id || !isPlatformBrowser(this.platformId)) return;
      untracked(() => {
        this.page.set(1);
        this.load();
      });
    });
  }

  load(): void {
    const id = this.context.tenantId();
    if (!id) return;
    this.loading.set(true);
    this.error.set(null);
    this.service.tokens(id, { page: this.page(), page_size: PAGE_SIZE }).subscribe({
      next: (result) => {
        this.tokens.set(result.items);
        this.total.set(result.total);
        this.loading.set(false);
        this.loaded.set(true);
      },
      error: (err: unknown) => {
        this.error.set(extractErrorMessage(err, "Impossible de charger l'historique."));
        this.loading.set(false);
      },
    });
  }

  goTo(page: number): void {
    this.page.set(page);
    this.load();
  }

  issue(): void {
    const id = this.context.tenantId();
    if (!id || this.qrForm().invalid() || this.issuing()) return;
    const { local_ref, email: mail } = this.model();
    this.issuing.set(true);
    this.formError.set(null);
    this.notice.set(null);
    this.service.issueToken(id, local_ref.trim(), mail.trim() || undefined).subscribe({
      next: (token) => {
        this.issuing.set(false);
        if (token.already_linked) {
          this.notice.set(`Le dossier ${token.local_ref} est déjà rattaché à un compte EDEN : aucun QR code n'est nécessaire.`);
          return;
        }
        this.ticket.set(token);
        this.qrForm().reset({ local_ref: '', email: '' });
        this.page.set(1);
        this.load();
      },
      error: (err: unknown) => {
        this.issuing.set(false);
        this.formError.set(extractErrorMessage(err, 'Impossible de générer le QR code.'));
      },
    });
  }

  revoke(token: LinkTokenView): void {
    const id = this.context.tenantId();
    if (!id || this.busyId()) return;
    this.busyId.set(token.id);
    this.service.revokeToken(id, token.id).subscribe({
      next: () => {
        this.busyId.set(null);
        this.load();
      },
      error: (err: unknown) => {
        this.busyId.set(null);
        this.error.set(extractErrorMessage(err, "Impossible d'annuler ce QR code."));
      },
    });
  }
}
