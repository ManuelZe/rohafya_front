import { Component, PLATFORM_ID, effect, inject, signal, untracked } from '@angular/core';
import { DatePipe, isPlatformBrowser } from '@angular/common';
import { RouterLink } from '@angular/router';
import { PIcon } from '@primeicons/angular/p-icon';
import { extractErrorMessage } from '../../../doctors/shared/api-resource';
import { PageHeader } from '../../../patients/shared/page-header/page-header';
import { Pager } from '../../shared/pager';
import { LINK_STATUS_LABELS, LinkStatus, PatientLinkView } from '../../saas.models';
import { TenantAdminService } from '../../tenant-admin.service';
import { TenantContext } from '../tenant-context.service';

const PAGE_SIZE = 25;
const METHOD_LABELS: Record<string, string> = {
  qr: 'QR code',
  code: 'Code court',
  admin: 'Établissement',
  legacy: 'Historique',
};

@Component({
  selector: 'app-admin-links',
  imports: [DatePipe, RouterLink, PIcon, PageHeader, Pager],
  templateUrl: './admin-links.html',
  styleUrls: ['../../../doctors/shared/doctor-ui.css', '../../shared/console-ui.css'],
})
export class AdminLinks {
  private readonly service = inject(TenantAdminService);
  private readonly platformId = inject(PLATFORM_ID);
  readonly context = inject(TenantContext);

  readonly filters: { value: LinkStatus | ''; label: string }[] = [
    { value: 'pending', label: 'En attente' },
    { value: 'active', label: 'Rattachés' },
    { value: 'revoked', label: 'Retirés' },
    { value: '', label: 'Tous' },
  ];
  readonly statusLabels = LINK_STATUS_LABELS;
  readonly pageSize = PAGE_SIZE;

  readonly status = signal<LinkStatus | ''>('pending');
  readonly page = signal(1);
  readonly items = signal<PatientLinkView[]>([]);
  readonly total = signal(0);
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

  setStatus(value: LinkStatus | ''): void {
    this.status.set(value);
    this.page.set(1);
    this.load();
  }

  goTo(page: number): void {
    this.page.set(page);
    this.load();
  }

  load(): void {
    const id = this.context.tenantId();
    if (!id) return;
    this.loading.set(true);
    this.error.set(null);
    this.service.links(id, { status: this.status(), page: this.page(), page_size: PAGE_SIZE }).subscribe({
      next: (result) => {
        this.items.set(result.items);
        this.total.set(result.total);
        this.loading.set(false);
        this.loaded.set(true);
      },
      error: (err: unknown) => {
        this.error.set(extractErrorMessage(err, 'Impossible de charger les rattachements.'));
        this.loading.set(false);
      },
    });
  }

  approve(link: PatientLinkView): void {
    this.act(link, 'approve');
  }

  revoke(link: PatientLinkView): void {
    this.act(link, 'revoke');
  }

  method(link: PatientLinkView): string {
    return METHOD_LABELS[link.method ?? ''] ?? '—';
  }

  private act(link: PatientLinkView, action: 'approve' | 'revoke'): void {
    const id = this.context.tenantId();
    if (!id || link.id === null || this.busyId()) return;
    this.busyId.set(link.id);
    const request = action === 'approve' ? this.service.approveLink(id, link.id) : this.service.revokeLink(id, link.id);
    request.subscribe({
      next: () => {
        this.busyId.set(null);
        this.load();
      },
      error: (err: unknown) => {
        this.busyId.set(null);
        this.error.set(extractErrorMessage(err, "L'opération a échoué."));
      },
    });
  }
}
