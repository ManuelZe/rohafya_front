import { Component, inject, signal, computed, PLATFORM_ID } from '@angular/core';
import { CdkTrapFocus } from '@angular/cdk/a11y';
import { isPlatformBrowser, CommonModule } from '@angular/common';
import { PIcon } from '@primeicons/angular/p-icon';
import { ExplorationService } from './exploration.service';
import { AuthService } from '../../connexion/auth-service';
import { PageHeader } from '../shared/page-header/page-header';
import { StatusTag } from '../shared/status-tag/status-tag';
import { ShareExamDialog } from '../shared/share-exam-dialog/share-exam-dialog';
import { ExplorationLab } from '../patients.models';
import { ExpirationFilter, isWithinDateRange, matchesExpirationFilter } from '../shared/exam-filters';
import { RohafyaLoader } from '../../shared/rohafya-loader/rohafya-loader';
import { MedicalReportView } from '../../shared/medical-report/medical-report-view';
import { buildReport, PatientIdentity } from '../../shared/medical-report/medical-report';
import { ExamResultDetail } from '../resultats/resultats.models';
import { PatientProfileService } from '../patient-profile-service';

const ACCESS_DENIED_MESSAGE = 'L’UTILISATEUR NE PEUT PAS AVOIR ACCÈS À CES DONNÉES.';

@Component({
  selector: 'app-exploration',
  imports: [RohafyaLoader, MedicalReportView, CdkTrapFocus, CommonModule, PIcon, PageHeader, StatusTag, ShareExamDialog],
  templateUrl: './exploration.html',
  styleUrl: './exploration.css',
  host: {
    '(document:keydown.escape)': 'closeViewer()',
  },
})
export class Exploration {
  private readonly explorationService = inject(ExplorationService);
  private readonly authService = inject(AuthService);
  private readonly platformId = inject(PLATFORM_ID);
  private readonly patientProfile = inject(PatientProfileService).profile;

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

  results = signal<ExplorationLab[]>([]);
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

  selectedResult = signal<ExplorationLab | null>(null);
  moreInfoLoading = signal(false);
  moreInfoBlockedMessage = signal<string | null>(null);
  moreInfoItems = signal<Record<string, string | number | boolean | null>[] | null>(null);

  /** Compte rendu de l'examen ouvert : fiche + détail + identité du patient connecté. */
  readonly report = computed(() => {
    const result = this.selectedResult();
    if (!result || this.moreInfoLoading() || this.moreInfoBlockedMessage()) return null;
    const p = this.patientProfile();
    const identity: PatientIdentity = p
      ? {
          name: `${p.PatientName ?? ''} ${p.PatientLastname ?? ''}`.trim(),
          identifier: p.PatientFederationID,
          birthDate: p.PatientDOB,
          sex: p.PatientGender,
        }
      : {};
    return buildReport('Exploration', result as unknown as ExamResultDetail, this.moreInfoItems() ?? [], identity);
  });

  shareTarget = signal<ExplorationLab | null>(null);

  constructor() {
    if (isPlatformBrowser(this.platformId) && !this.accessDenied()) {
      this.loadResults();
    }
  }

  loadResults(): void {
    this.loading.set(true);
    this.errorMessage.set(null);

    this.explorationService.getAllResults().subscribe({
      next: (data) => {
        this.results.set(data);
        console.log('[ROHAFYA] Exploration — liste des résultats reçue de l’API :', data);
        this.loading.set(false);
      },
      error: (err) => {
        this.errorMessage.set('Impossible de charger les résultats d\'exploration fonctionnelle.');
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

  openViewer(result: ExplorationLab): void {
    this.selectedResult.set(result);
    this.moreInfoItems.set(null);
    this.moreInfoBlockedMessage.set(null);
    this.moreInfoLoading.set(true);

    this.explorationService.getMoreInfos(result.name).subscribe((res) => {
      this.moreInfoLoading.set(false);
      if (res.blocked) {
        this.moreInfoBlockedMessage.set(res.message ?? 'Ce résultat n\'est plus accessible.');
      } else {
        this.moreInfoItems.set(res.items);
      }
      this.logResult(result, res);
    });
  }

  closeViewer(): void {
    this.selectedResult.set(null);
    this.moreInfoItems.set(null);
    this.moreInfoBlockedMessage.set(null);
  }

  openShare(result: ExplorationLab, event: Event): void {
    event.stopPropagation();
    this.shareTarget.set(result);
  }

  closeShare(): void {
    this.shareTarget.set(null);
  }

  /** Débogage (console du navigateur) : champs reçus de l'API et compte rendu affiché. */
  private logResult(result: ExplorationLab, res: { blocked: boolean; message?: string; items: Record<string, unknown>[] }): void {
    console.groupCollapsed(`[ROHAFYA] Exploration ${result.name} — ${result.test}`);
    console.log('Fiche de l’examen (liste) :', result);
    console.log('Détail (more_infos) :', res.blocked ? res.message : res.items);
    if (res.items.length) console.table(res.items);
    console.log('Compte rendu affiché :', this.report());
    console.groupEnd();
  }
}
