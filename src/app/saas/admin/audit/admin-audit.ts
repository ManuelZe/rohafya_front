import { Component, PLATFORM_ID, effect, inject, signal, untracked } from '@angular/core';
import { isPlatformBrowser } from '@angular/common';
import { PIcon } from '@primeicons/angular/p-icon';
import { extractErrorMessage } from '../../../doctors/shared/api-resource';
import { PageHeader } from '../../../patients/shared/page-header/page-header';
import { AuditTable } from '../../shared/audit-table';
import { Pager } from '../../shared/pager';
import { AuditEntry } from '../../saas.models';
import { TenantAdminService } from '../../tenant-admin.service';
import { TenantContext } from '../tenant-context.service';

const PAGE_SIZE = 30;

@Component({
  selector: 'app-admin-audit',
  imports: [PIcon, PageHeader, AuditTable, Pager],
  template: `
    <div class="page">
      <app-page-header title="Journal" subtitle="Qui a fait quoi sur les données de l'établissement, et quand." />
      <section class="card">
        @if (error()) {
          <div class="banner banner-error" role="alert">
            <svg [pIcon]="'exclamation-circle'" [size]="16" aria-hidden="true"></svg>
            <span>{{ error() }}</span>
            <button type="button" class="btn btn-ghost" (click)="load()">Réessayer</button>
          </div>
        }
        @if (loading() && entries().length === 0) {
          <div class="state" role="status">
            <span class="spinner spinner-lg" aria-hidden="true"></span>
            <span>Chargement…</span>
          </div>
        } @else if (entries().length === 0) {
          <div class="state"><span>Aucune activité enregistrée.</span></div>
        } @else {
          <app-audit-table [entries]="entries()" [class.is-refreshing]="loading()" />
          <app-pager [page]="page()" [pageSize]="pageSize" [total]="total()" (pageChange)="goTo($event)" />
        }
      </section>
    </div>
  `,
  styleUrls: ['../../../doctors/shared/doctor-ui.css', '../../shared/console-ui.css'],
})
export class AdminAudit {
  private readonly service = inject(TenantAdminService);
  private readonly platformId = inject(PLATFORM_ID);
  readonly context = inject(TenantContext);

  readonly pageSize = PAGE_SIZE;
  readonly entries = signal<AuditEntry[]>([]);
  readonly total = signal(0);
  readonly page = signal(1);
  readonly loading = signal(false);
  readonly error = signal<string | null>(null);

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

  goTo(page: number): void {
    this.page.set(page);
    this.load();
  }

  load(): void {
    const id = this.context.tenantId();
    if (!id) return;
    this.loading.set(true);
    this.error.set(null);
    this.service.audit(id, { page: this.page(), page_size: PAGE_SIZE }).subscribe({
      next: (result) => {
        this.entries.set(result.items);
        this.total.set(result.total);
        this.loading.set(false);
      },
      error: (err: unknown) => {
        this.error.set(extractErrorMessage(err, 'Impossible de charger le journal.'));
        this.loading.set(false);
      },
    });
  }
}
