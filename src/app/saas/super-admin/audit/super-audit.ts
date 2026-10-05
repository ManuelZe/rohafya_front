import { Component, PLATFORM_ID, inject, signal } from '@angular/core';
import { isPlatformBrowser } from '@angular/common';
import { PIcon } from '@primeicons/angular/p-icon';
import { extractErrorMessage } from '../../../doctors/shared/api-resource';
import { PageHeader } from '../../../patients/shared/page-header/page-header';
import { AuditTable } from '../../shared/audit-table';
import { Pager } from '../../shared/pager';
import { AuditEntry, TenantWithStats } from '../../saas.models';
import { SuperAdminService } from '../../super-admin.service';

const PAGE_SIZE = 30;

@Component({
  selector: 'app-super-audit',
  imports: [PIcon, PageHeader, AuditTable, Pager],
  template: `
    <div class="page">
      <app-page-header title="Journal" subtitle="Toutes les opérations sensibles de la plateforme." />
      <section class="card">
        <div class="toolbar">
          <div class="form-row tenant-filter">
            <label for="audit-tenant">Établissement</label>
            <select id="audit-tenant" class="field" (change)="onTenant($event)">
              <option value="">Tous</option>
              @for (tenant of tenants(); track tenant.id) {
                <option [value]="tenant.id">{{ tenant.display_name }}</option>
              }
            </select>
          </div>
          <span class="muted total" aria-live="polite">{{ total() }} entrée(s)</span>
        </div>
        @if (error()) {
          <div class="banner banner-error notice" role="alert">
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
          <div class="audit-body">
            <app-audit-table [entries]="entries()" [showEstablishment]="true" [class.is-refreshing]="loading()" />
          </div>
          <app-pager [page]="page()" [pageSize]="pageSize" [total]="total()" (pageChange)="goTo($event)" />
        }
      </section>
    </div>
  `,
  styleUrls: ['../../../doctors/shared/doctor-ui.css', '../../shared/console-ui.css'],
  styles: `
    .tenant-filter {
      flex: 1 1 240px;
      max-width: 360px;
    }
    .audit-body {
      margin-top: 1rem;
    }
  `,
})
export class SuperAudit {
  private readonly service = inject(SuperAdminService);

  readonly pageSize = PAGE_SIZE;
  readonly tenants = signal<TenantWithStats[]>([]);
  readonly tenantId = signal<number | undefined>(undefined);
  readonly entries = signal<AuditEntry[]>([]);
  readonly total = signal(0);
  readonly page = signal(1);
  readonly loading = signal(false);
  readonly error = signal<string | null>(null);

  constructor() {
    if (isPlatformBrowser(inject(PLATFORM_ID))) {
      this.service.tenants().subscribe({ next: (tenants) => this.tenants.set(tenants) });
      this.load();
    }
  }

  onTenant(event: Event): void {
    const value = (event.target as HTMLSelectElement).value;
    this.tenantId.set(value ? Number(value) : undefined);
    this.page.set(1);
    this.load();
  }

  goTo(page: number): void {
    this.page.set(page);
    this.load();
  }

  load(): void {
    this.loading.set(true);
    this.error.set(null);
    this.service.audit({ page: this.page(), tenant_id: this.tenantId() }).subscribe({
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
