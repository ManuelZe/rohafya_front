import { Component, inject, signal, computed, PLATFORM_ID } from '@angular/core';
import { CdkTrapFocus } from '@angular/cdk/a11y';
import { isPlatformBrowser, CommonModule } from '@angular/common';
import { PIcon } from '@primeicons/angular/p-icon';
import { ImagerieService } from './imagerie.service';
import { AuthService } from '../../connexion/auth-service';
import { PageHeader } from '../shared/page-header/page-header';
import { StatusTag } from '../shared/status-tag/status-tag';
import { ShareExamDialog } from '../shared/share-exam-dialog/share-exam-dialog';
import { ExamenImagerie } from '../patients.models';
import { ExpirationFilter, isWithinDateRange, matchesExpirationFilter } from '../shared/exam-filters';
import { ListToolbar } from '../../shared/list/list-toolbar';
import { ShowMore } from '../../shared/list/show-more';
import { ListWindow } from '../../shared/list/list-window';
import { FilterOption, SortOrder, distinctValues, matchesText, sortByDate } from '../../shared/list/list-filters';
import { SaasAccountService } from '../../saas/saas-account.service';
import { RohafyaLoader } from '../../shared/rohafya-loader/rohafya-loader';
import { MedicalReportView } from '../../shared/medical-report/medical-report-view';
import { buildReport, PatientIdentity } from '../../shared/medical-report/medical-report';
import { ExamResultDetail } from '../resultats/resultats.models';
import { PatientProfileService } from '../patient-profile-service';

import { TranslatePipe } from '../../shared/i18n/t.pipe';
import { LocalDatePipe } from '../../shared/i18n/ldate.pipe';
const ACCESS_DENIED_MESSAGE = 'L’UTILISATEUR NE PEUT PAS AVOIR ACCÈS À CES DONNÉES.';

@Component({
  selector: 'app-imagerie',
  imports: [LocalDatePipe, TranslatePipe, RohafyaLoader, ListToolbar, ShowMore, MedicalReportView, CdkTrapFocus, CommonModule, PIcon, PageHeader, StatusTag, ShareExamDialog],
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

  results = signal<ExamenImagerie[]>([]);
  loading = signal(false);
  errorMessage = signal<string | null>(null);

  readonly statusOptions: FilterOption[] = [
    { value: 'all', label: 'Tous' },
    { value: 'available', label: 'Disponibles' },
    { value: 'expired', label: 'Expirés' },
  ];
  readonly search = signal('');
  readonly expirationFilter = signal<string>('all');
  readonly establishment = signal('');
  readonly dateFrom = signal('');
  readonly dateTo = signal('');
  readonly sort = signal<SortOrder>('recent');

  /** Établissements présents dans les résultats (filtre affiché à partir de deux). */
  readonly establishments = computed(() => distinctValues(this.results().map((r) => r.establishment)));

  readonly filteredResults = computed(() => {
    const filter = this.expirationFilter() as ExpirationFilter;
    const from = this.dateFrom();
    const to = this.dateTo();
    const term = this.search();
    const establishment = this.establishment();
    const items = this.results().filter(
      (r) =>
        matchesExpirationFilter(filter, r.statut_expiration) &&
        isWithinDateRange(r.validation_date, from, to) &&
        (!establishment || r.establishment === establishment) &&
        matchesText(term, r.requested_test, r.number, r.establishment, r.requestor, r.doctor)
    );
    return sortByDate(items, (r) => r.validation_date, this.sort());
  });

  /** Affichage par tranches de 10 : lisible sur téléphone même avec des centaines de résultats. */
  readonly list = new ListWindow(this.filteredResults, 10, () => [
    this.search(),
    this.expirationFilter(),
    this.establishment(),
    this.dateFrom(),
    this.dateTo(),
    this.sort(),
  ]);

  private readonly account = inject(SaasAccountService);
  /** Partage : illimité sauf configuration contraire du super-administrateur. */
  readonly canShare = this.account.canShare;
  readonly shareMessage = computed(() => this.account.shareRight()?.message ?? null);

  selectedResult = signal<ExamenImagerie | null>(null);
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
    return buildReport('Imagerie', result as unknown as ExamResultDetail, this.moreInfoItems() ?? [], identity);
  });

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
        console.log('[ROHAFYA] Imagerie — liste des résultats reçue de l’API :', data);
        this.loading.set(false);
      },
      error: (err) => {
        this.errorMessage.set('Impossible de charger les résultats d\'imagerie.');
        this.loading.set(false);
        console.error(err);
      },
    });
  }




  resetFilters(): void {
    this.search.set('');
    this.expirationFilter.set('all');
    this.establishment.set('');
    this.dateFrom.set('');
    this.dateTo.set('');
    this.sort.set('recent');
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
      this.logResult(result, res);
    });
  }

  closeViewer(): void {
    this.selectedResult.set(null);
    this.moreInfoItems.set(null);
    this.moreInfoBlockedMessage.set(null);
  }

  openShare(result: ExamenImagerie, event: Event): void {
    event.stopPropagation();
    if (!this.canShare()) return;
    this.shareTarget.set(result);
  }

  closeShare(): void {
    this.shareTarget.set(null);
    // Le compteur de partages (s'il est limité) a pu changer.
    if (this.account.shareRight()?.configured) this.account.load(true).subscribe();
  }

  /** Débogage (console du navigateur) : champs reçus de l'API et compte rendu affiché. */
  private logResult(result: ExamenImagerie, res: { blocked: boolean; message?: string; items: Record<string, unknown>[] }): void {
    console.groupCollapsed(`[ROHAFYA] Imagerie ${result.number} — ${result.requested_test}`);
    console.log('Fiche de l’examen (liste) :', result);
    console.log('Détail (more_infos) :', res.blocked ? res.message : res.items);
    if (res.items.length) console.table(res.items);
    console.log('Compte rendu affiché :', this.report());
    console.groupEnd();
  }
}
