import { Component, PLATFORM_ID, computed, effect, inject, signal, untracked } from '@angular/core';
import { DatePipe, isPlatformBrowser } from '@angular/common';
import { RouterLink } from '@angular/router';
import { PIcon } from '@primeicons/angular/p-icon';
import { extractErrorMessage } from '../../../doctors/shared/api-resource';
import { PageHeader } from '../../../patients/shared/page-header/page-header';
import { Pager } from '../../shared/pager';
import { RECORD_KIND_LABELS, RecordKind, RecordSummary } from '../../saas.models';
import { TenantAdminService } from '../../tenant-admin.service';
import { TenantContext } from '../tenant-context.service';

const PAGE_SIZE = 25;
const SOURCE_LABELS: Record<string, string> = { api: 'API EDEN', fhir: 'FHIR', admin: 'Saisie', pdf: 'PDF' };

@Component({
  selector: 'app-admin-records',
  imports: [DatePipe, RouterLink, PIcon, PageHeader, Pager],
  templateUrl: './admin-records.html',
  styleUrls: ['../../../doctors/shared/doctor-ui.css', '../../shared/console-ui.css'],
})
export class AdminRecords {
  private readonly service = inject(TenantAdminService);
  private readonly platformId = inject(PLATFORM_ID);
  readonly context = inject(TenantContext);

  readonly kindLabels = RECORD_KIND_LABELS;
  readonly kinds: { value: RecordKind | ''; label: string }[] = [
    { value: '', label: 'Tout' },
    ...(Object.keys(RECORD_KIND_LABELS) as RecordKind[]).map((value) => ({ value, label: RECORD_KIND_LABELS[value] })),
  ];
  readonly pageSize = PAGE_SIZE;

  readonly kind = signal<RecordKind | ''>('');
  readonly query = signal('');
  readonly page = signal(1);
  readonly items = signal<RecordSummary[]>([]);
  readonly total = signal(0);
  readonly loading = signal(false);
  readonly loaded = signal(false);
  readonly error = signal<string | null>(null);

  readonly isGnuHealth = computed(() => this.context.tenant()?.source_type === 'gnuhealth');

  private searchTimer: ReturnType<typeof setTimeout> | null = null;

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

  setKind(kind: RecordKind | ''): void {
    this.kind.set(kind);
    this.page.set(1);
    this.load();
  }

  onSearch(event: Event): void {
    this.query.set((event.target as HTMLInputElement).value);
    if (this.searchTimer) clearTimeout(this.searchTimer);
    this.searchTimer = setTimeout(() => {
      this.page.set(1);
      this.load();
    }, 300);
  }

  goTo(page: number): void {
    this.page.set(page);
    this.load();
  }

  source(record: RecordSummary): string {
    return SOURCE_LABELS[record.source ?? ''] ?? record.source ?? '—';
  }

  load(): void {
    const id = this.context.tenantId();
    if (!id) return;
    this.loading.set(true);
    this.error.set(null);
    this.service.records(id, { kind: this.kind(), q: this.query(), page: this.page(), page_size: PAGE_SIZE }).subscribe({
      next: (result) => {
        this.items.set(result.items);
        this.total.set(result.total);
        this.loading.set(false);
        this.loaded.set(true);
      },
      error: (err: unknown) => {
        this.error.set(extractErrorMessage(err, 'Impossible de charger les données reçues.'));
        this.loading.set(false);
      },
    });
  }
}
