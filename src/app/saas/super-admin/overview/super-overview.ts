import { Component, PLATFORM_ID, inject, signal } from '@angular/core';
import { DatePipe, isPlatformBrowser } from '@angular/common';
import { RouterLink } from '@angular/router';
import { PIcon } from '@primeicons/angular/p-icon';
import { extractErrorMessage } from '../../../doctors/shared/api-resource';
import { PageHeader } from '../../../patients/shared/page-header/page-header';
import { KpiTile } from '../../../shared/kpi-tile/kpi-tile';
import { SOURCE_LABELS, SuperStats, TenantWithStats, auditLabel } from '../../saas.models';
import { SuperAdminService } from '../../super-admin.service';

@Component({
  selector: 'app-super-overview',
  imports: [DatePipe, RouterLink, PIcon, PageHeader, KpiTile],
  templateUrl: './super-overview.html',
  styleUrls: ['../../../doctors/shared/doctor-ui.css', '../../shared/console-ui.css'],
})
export class SuperOverview {
  private readonly service = inject(SuperAdminService);

  readonly stats = signal<SuperStats | null>(null);
  readonly tenants = signal<TenantWithStats[] | null>(null);
  readonly loading = signal(false);
  readonly error = signal<string | null>(null);
  readonly sourceLabels = SOURCE_LABELS;
  readonly auditLabel = auditLabel;

  constructor() {
    if (isPlatformBrowser(inject(PLATFORM_ID))) {
      this.load();
    }
  }

  load(): void {
    this.loading.set(true);
    this.error.set(null);
    this.service.stats().subscribe({
      next: (stats) => {
        this.stats.set(stats);
        this.loading.set(false);
      },
      error: (err: unknown) => {
        this.error.set(extractErrorMessage(err, 'Impossible de charger les statistiques.'));
        this.loading.set(false);
      },
    });
    this.service.tenants().subscribe({
      next: (tenants) => this.tenants.set(tenants),
      error: () => this.tenants.set([]),
    });
  }

  count(value: number | undefined): string {
    return (value ?? 0).toLocaleString('fr-FR');
  }
}
