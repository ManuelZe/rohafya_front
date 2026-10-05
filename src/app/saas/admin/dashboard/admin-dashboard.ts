import { Component, PLATFORM_ID, computed, effect, inject, signal, untracked } from '@angular/core';
import { DatePipe, isPlatformBrowser } from '@angular/common';
import { RouterLink } from '@angular/router';
import { PIcon } from '@primeicons/angular/p-icon';
import { extractErrorMessage } from '../../../doctors/shared/api-resource';
import { PageHeader } from '../../../patients/shared/page-header/page-header';
import { KpiTile } from '../../../shared/kpi-tile/kpi-tile';
import { RECORD_KIND_LABELS, RecordKind, SOURCE_LABELS, TenantDashboard, auditLabel } from '../../saas.models';
import { TenantAdminService } from '../../tenant-admin.service';
import { TenantContext } from '../tenant-context.service';

@Component({
  selector: 'app-admin-dashboard',
  imports: [DatePipe, RouterLink, PIcon, PageHeader, KpiTile],
  templateUrl: './admin-dashboard.html',
  styleUrls: ['../../../doctors/shared/doctor-ui.css', '../../shared/console-ui.css'],
})
export class AdminDashboard {
  private readonly service = inject(TenantAdminService);
  private readonly platformId = inject(PLATFORM_ID);
  readonly context = inject(TenantContext);

  readonly data = signal<TenantDashboard | null>(null);
  readonly loading = signal(false);
  readonly error = signal<string | null>(null);

  readonly auditLabel = auditLabel;
  readonly sourceLabel = computed(() => {
    const source = this.data()?.tenant.source_type;
    return source ? SOURCE_LABELS[source] : '';
  });
  readonly recordRows = computed(() => {
    const records = this.data()?.records;
    if (!records) return [];
    return (Object.keys(RECORD_KIND_LABELS) as RecordKind[]).map((kind) => ({ kind, label: RECORD_KIND_LABELS[kind], count: records[kind] ?? 0 }));
  });

  constructor() {
    effect(() => {
      const id = this.context.tenantId();
      if (!id || !isPlatformBrowser(this.platformId)) return;
      untracked(() => this.load(id));
    });
  }

  load(id = this.context.tenantId()): void {
    if (!id) return;
    this.loading.set(true);
    this.error.set(null);
    this.service.dashboard(id).subscribe({
      next: (data) => {
        this.data.set(data);
        this.loading.set(false);
      },
      error: (err: unknown) => {
        this.error.set(extractErrorMessage(err, 'Impossible de charger le tableau de bord.'));
        this.loading.set(false);
      },
    });
  }
}
