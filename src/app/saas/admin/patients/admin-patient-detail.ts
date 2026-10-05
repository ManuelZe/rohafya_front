import { Component, PLATFORM_ID, effect, inject, input, signal, untracked } from '@angular/core';
import { DatePipe, isPlatformBrowser } from '@angular/common';
import { RouterLink } from '@angular/router';
import { PIcon } from '@primeicons/angular/p-icon';
import { extractErrorMessage } from '../../../doctors/shared/api-resource';
import { PageHeader } from '../../../patients/shared/page-header/page-header';
import { IssuedLinkToken, LINK_STATUS_LABELS, PatientDetail, RECORD_KIND_LABELS } from '../../saas.models';
import { TenantAdminService } from '../../tenant-admin.service';
import { QrTicket } from '../shared/qr-ticket';
import { TenantContext } from '../tenant-context.service';

const TOKEN_STATUS_LABELS: Record<string, string> = {
  active: 'Actif',
  used: 'Utilisé',
  expired: 'Expiré',
  revoked: 'Annulé',
};

@Component({
  selector: 'app-admin-patient-detail',
  imports: [DatePipe, RouterLink, PIcon, PageHeader, QrTicket],
  templateUrl: './admin-patient-detail.html',
  styleUrls: ['../../../doctors/shared/doctor-ui.css', '../../shared/console-ui.css'],
})
export class AdminPatientDetail {
  private readonly service = inject(TenantAdminService);
  private readonly platformId = inject(PLATFORM_ID);
  readonly context = inject(TenantContext);

  /** Numéro de dossier local (paramètre de route :ref). */
  readonly ref = input.required<string>();

  readonly statusLabels = LINK_STATUS_LABELS;
  readonly kindLabels = RECORD_KIND_LABELS;
  readonly tokenLabels = TOKEN_STATUS_LABELS;

  readonly detail = signal<PatientDetail | null>(null);
  readonly loading = signal(false);
  readonly error = signal<string | null>(null);
  readonly busy = signal(false);
  readonly notice = signal<string | null>(null);
  readonly ticket = signal<IssuedLinkToken | null>(null);

  constructor() {
    effect(() => {
      const id = this.context.tenantId();
      const ref = this.ref();
      if (!id || !isPlatformBrowser(this.platformId)) return;
      untracked(() => this.load(id, ref));
    });
  }

  load(id = this.context.tenantId(), ref = this.ref()): void {
    if (!id) return;
    this.loading.set(true);
    this.error.set(null);
    this.service.patient(id, ref).subscribe({
      next: (detail) => {
        this.detail.set(detail);
        this.loading.set(false);
      },
      error: (err: unknown) => {
        this.detail.set(null);
        this.error.set(extractErrorMessage(err, 'Dossier introuvable.'));
        this.loading.set(false);
      },
    });
  }

  approve(): void {
    this.changeLink('approve');
  }

  revoke(): void {
    this.changeLink('revoke');
  }

  issueQr(): void {
    const id = this.context.tenantId();
    const patient = this.detail()?.patient;
    if (!id || !patient || this.busy()) return;
    this.busy.set(true);
    this.service.issueToken(id, patient.local_ref, patient.email ?? undefined).subscribe({
      next: (token) => {
        this.busy.set(false);
        if (token.already_linked) {
          this.notice.set('Ce dossier est déjà rattaché à un compte EDEN.');
        } else {
          this.ticket.set(token);
          this.load();
        }
      },
      error: (err: unknown) => {
        this.busy.set(false);
        this.error.set(extractErrorMessage(err, 'Impossible de générer le QR code.'));
      },
    });
  }

  revokeToken(tokenId: number): void {
    const id = this.context.tenantId();
    if (!id || this.busy()) return;
    this.busy.set(true);
    this.service.revokeToken(id, tokenId).subscribe({
      next: () => {
        this.busy.set(false);
        this.load();
      },
      error: (err: unknown) => {
        this.busy.set(false);
        this.error.set(extractErrorMessage(err, "Impossible d'annuler ce QR code."));
      },
    });
  }

  private changeLink(action: 'approve' | 'revoke'): void {
    const id = this.context.tenantId();
    const linkId = this.detail()?.patient.link_id;
    if (!id || !linkId || this.busy()) return;
    this.busy.set(true);
    const request = action === 'approve' ? this.service.approveLink(id, linkId) : this.service.revokeLink(id, linkId);
    request.subscribe({
      next: () => {
        this.busy.set(false);
        this.notice.set(action === 'approve' ? 'Rattachement validé : le patient voit désormais ses résultats.' : 'Rattachement retiré.');
        this.load();
      },
      error: (err: unknown) => {
        this.busy.set(false);
        this.error.set(extractErrorMessage(err, "L'opération a échoué."));
      },
    });
  }
}
