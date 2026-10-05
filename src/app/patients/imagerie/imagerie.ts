import { Component, inject, signal, computed, PLATFORM_ID } from '@angular/core';
import { isPlatformBrowser, CommonModule } from '@angular/common';
import { PIcon } from '@primeicons/angular/p-icon';
import { ImagerieService } from './imagerie.service';
import { AuthService } from '../../connexion/auth-service';
import { PageHeader } from '../shared/page-header/page-header';
import { StatusTag } from '../shared/status-tag/status-tag';
import { ShareExamDialog } from '../shared/share-exam-dialog/share-exam-dialog';
import { ExamenImagerie } from '../patients.models';
import { ExpirationFilter, isWithinDateRange, matchesExpirationFilter } from '../shared/exam-filters';
import { EdenLoader } from '../../shared/eden-loader/eden-loader';

const ACCESS_DENIED_MESSAGE = 'L’UTILISATEUR NE PEUT PAS AVOIR ACCÈS À CES DONNÉES.';

@Component({
  selector: 'app-imagerie',
  imports: [EdenLoader, CommonModule, PIcon, PageHeader, StatusTag, ShareExamDialog],
  templateUrl: './imagerie.html',
  styleUrl: './imagerie.css',
  host: {
    '(document:keydown.escape)': 'closeViewer()',
  },
})
export class Imagerie {
  private readonly imagerieService = inject(ImagerieService);
  private readonly authService = inject(AuthService);
  private readonly platformId = inject(PLATFORM_ID);

  readonly accessDeniedMessage = ACCESS_DENIED_MESSAGE;

  accessDenied = computed(() => {
    const user = this.authService.currentUser();

    if (!isPlatformBrowser(this.platformId)) {
      return true;
    }
    if (!user || !this.authService.isPatient() || user.patient_id === null) {
      return true;
    }
    return false;
  });

  results = signal<ExamenImagerie[]>([]);
  loading = signal(false);
  errorMessage = signal<string | null>(null);

  expirationFilter = signal<ExpirationFilter>('all');
  dateFrom = signal('');
  dateTo = signal('');

  filteredResults = computed(() => {
    const filter = this.expirationFilter();
    const from = this.dateFrom();
    const to = this.dateTo();

    return this.results().filter(
      (r) => matchesExpirationFilter(filter, r.statut_expiration) && isWithinDateRange(r.validation_date, from, to)
    );
  });

  hasActiveFilters = computed(() => this.expirationFilter() !== 'all' || !!this.dateFrom() || !!this.dateTo());

  selectedResult = signal<ExamenImagerie | null>(null);
  moreInfoLoading = signal(false);
  moreInfoBlockedMessage = signal<string | null>(null);
  moreInfoItems = signal<Record<string, string | number | boolean | null>[] | null>(null);

  shareTarget = signal<ExamenImagerie | null>(null);

  constructor() {
    if (isPlatformBrowser(this.platformId) && !this.accessDenied()) {
      this.loadResults();
    }
  }

  loadResults(): void {
    this.loading.set(true);
    this.errorMessage.set(null);

    this.imagerieService.getAllResults().subscribe({
      next: (data) => {
        this.results.set(data);
        this.loading.set(false);
      },
      error: (err) => {
        this.errorMessage.set('Impossible de charger les résultats d\'imagerie.');
        this.loading.set(false);
        console.error(err);
      },
    });
  }

  setExpirationFilter(filter: ExpirationFilter): void {
    this.expirationFilter.set(filter);
  }

  onDateFromChange(event: Event): void {
    this.dateFrom.set((event.target as HTMLInputElement).value);
  }

  onDateToChange(event: Event): void {
    this.dateTo.set((event.target as HTMLInputElement).value);
  }

  resetFilters(): void {
    this.expirationFilter.set('all');
    this.dateFrom.set('');
    this.dateTo.set('');
  }

  openViewer(result: ExamenImagerie): void {
    this.selectedResult.set(result);
    this.moreInfoItems.set(null);
    this.moreInfoBlockedMessage.set(null);
    this.moreInfoLoading.set(true);

    this.imagerieService.getMoreInfos(result.number).subscribe((res) => {
      this.moreInfoLoading.set(false);
      if (res.blocked) {
        this.moreInfoBlockedMessage.set(res.message ?? 'Ce résultat n\'est plus accessible.');
      } else {
        this.moreInfoItems.set(res.items);
      }
    });
  }

  closeViewer(): void {
    this.selectedResult.set(null);
    this.moreInfoItems.set(null);
    this.moreInfoBlockedMessage.set(null);
  }

  openShare(result: ExamenImagerie, event: Event): void {
    event.stopPropagation();
    this.shareTarget.set(result);
  }

  closeShare(): void {
    this.shareTarget.set(null);
  }

  detailEntries(record: Record<string, string | number | boolean | null>): Array<{ label: string; value: string }> {
    return Object.entries(record)
      .filter(([, value]) => value !== null && value !== '' && value !== undefined)
      .map(([key, value]) => ({ label: this.formatDetailKey(key), value: this.formatDetailValue(value) }));
  }

  private formatDetailKey(key: string): string {
    return key.replace(/_/g, ' ').replace(/\b\w/g, (c) => c.toUpperCase());
  }

  private formatDetailValue(value: string | number | boolean | null): string {
    if (typeof value === 'boolean') {
      return value ? 'Oui' : 'Non';
    }
    return String(value);
  }
}
