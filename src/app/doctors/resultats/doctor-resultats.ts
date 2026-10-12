import { Component, ElementRef, PLATFORM_ID, afterNextRender, computed, effect, inject, input, signal, untracked, viewChild, Injector } from '@angular/core';
import { DatePipe, isPlatformBrowser } from '@angular/common';
import { PIcon } from '@primeicons/angular/p-icon';
import { AuthService } from '../../connexion/auth-service';
import { PageHeader } from '../../patients/shared/page-header/page-header';
import { StatusTag } from '../../patients/shared/status-tag/status-tag';
import { EXAM_TYPES, ExamType, SendResult } from '../../patients/resultats/resultats.models';
import { dateValue } from '../commissions/commissions.models';
import { DoctorResultatsService, ExamDetailsResult } from './doctor-resultats.service';
import { patientName } from './result-fields';
import { MedicalReportView } from '../../shared/medical-report/medical-report-view';
import { buildReport } from '../../shared/medical-report/medical-report';
import { RohafyaLoader } from '../../shared/rohafya-loader/rohafya-loader';

type TypeFilter = 'all' | ExamType;

@Component({
  selector: 'app-doctor-resultats',
  imports: [RohafyaLoader, DatePipe, PIcon, PageHeader, StatusTag, MedicalReportView],
  templateUrl: './doctor-resultats.html',
  styleUrls: ['../shared/doctor-ui.css', './doctor-resultats.css'],
  host: {
    '(document:keydown.escape)': 'closeViewer()',
  },
})
export class DoctorResultats {
  private readonly authService = inject(AuthService);
  private readonly service = inject(DoctorResultatsService);
  private readonly platformId = inject(PLATFORM_ID);
  private readonly injector = inject(Injector);

  /** ?ouvrir=<id> : ouvre directement un résultat (liens du tableau de bord). */
  readonly ouvrir = input<string>();

  readonly received = this.service.received;
  readonly examTypes = EXAM_TYPES;

  readonly typeFilter = signal<TypeFilter>('all');
  readonly search = signal('');

  readonly sorted = computed(() => [...(this.received.data() ?? [])].sort((a, b) => dateValue(b.sended_at) - dateValue(a.sended_at)));

  readonly countsByType = computed(() => {
    const counts: Record<string, number> = { all: this.sorted().length };
    for (const r of this.sorted()) counts[r.exam_type] = (counts[r.exam_type] ?? 0) + 1;
    return counts;
  });

  readonly filtered = computed(() => {
    const type = this.typeFilter();
    const term = this.search().trim().toLowerCase();
    return this.sorted().filter(
      (r) =>
        (type === 'all' || r.exam_type === type) &&
        (!term || `${r.exam_code} ${r.patient_federation_id}`.toLowerCase().includes(term))
    );
  });

  // ===== Visionneuse =====
  readonly selected = signal<SendResult | null>(null);
  readonly summary = signal<ExamDetailsResult | null>(null);
  readonly summaryLoading = signal(false);
  readonly details = signal<ExamDetailsResult | null>(null);
  readonly detailsLoading = signal(false);

  readonly closeButton = viewChild<ElementRef<HTMLButtonElement>>('closeButton');
  private lastTrigger: HTMLElement | null = null;
  private openedFromQuery = false;

  readonly selectedPatient = computed(() => patientName(this.summary()?.items[0]));
  readonly viewerLoading = computed(() => this.summaryLoading() || this.detailsLoading());

  /** Compte rendu : fiche de l'examen (/result/…) + paramètres ou images (/result/more_infos/…). */
  readonly report = computed(() => {
    const result = this.selected();
    const record = this.summary()?.items[0];
    if (!result || !record) return null;
    return buildReport(result.exam_type, record, this.details()?.items ?? [], {
      name: this.selectedPatient(),
      identifier: result.patient_federation_id,
    });
  });

  constructor() {
    effect(() => {
      const doctorId = this.authService.currentUser()?.doctor_id;
      if (isPlatformBrowser(this.platformId) && doctorId !== null && doctorId !== undefined) {
        untracked(() => this.service.loadReceived(doctorId));
      }
    });

    effect(() => {
      const id = Number(this.ouvrir());
      const list = this.received.data();
      if (!this.openedFromQuery && id && list) {
        const target = list.find((r) => r.id === id);
        if (target) {
          this.openedFromQuery = true;
          untracked(() => this.openViewer(target));
        }
      }
    });
  }

  setType(type: TypeFilter): void {
    this.typeFilter.set(type);
  }

  onSearch(event: Event): void {
    this.search.set((event.target as HTMLInputElement).value);
  }

  refresh(): void {
    const doctorId = this.authService.currentUser()?.doctor_id;
    if (doctorId !== null && doctorId !== undefined) {
      this.service.loadReceived(doctorId, true);
    }
  }

  openViewer(result: SendResult, event?: Event): void {
    this.lastTrigger = (event?.currentTarget as HTMLElement | null) ?? null;
    this.selected.set(result);
    this.summary.set(null);
    this.details.set(null);

    this.summaryLoading.set(true);
    this.service.getExamResults(result.exam_type, result.exam_code, result.patient_federation_id).subscribe((res) => {
      if (this.selected()?.id !== result.id) return; // réponse d'un résultat déjà refermé
      this.summary.set(res);
      this.summaryLoading.set(false);
      this.logResult(result);
    });

    this.detailsLoading.set(true);
    this.service.getMoreInformations(result.exam_type, result.exam_code, result.patient_federation_id).subscribe((res) => {
      if (this.selected()?.id !== result.id) return;
      this.details.set(res);
      this.detailsLoading.set(false);
      this.logResult(result);
    });

    afterNextRender(() => this.closeButton()?.nativeElement.focus(), { injector: this.injector });
  }

  closeViewer(): void {
    if (!this.selected()) return;
    this.selected.set(null);
    this.lastTrigger?.focus();
    this.lastTrigger = null;
  }

  typeCount(type: TypeFilter): number {
    return this.countsByType()[type] ?? 0;
  }

  /** Débogage (console du navigateur) : réponses de l'API et compte rendu affiché, une fois les deux appels terminés. */
  private logResult(result: SendResult): void {
    if (this.summaryLoading() || this.detailsLoading()) return;
    console.groupCollapsed(`[ROHAFYA] Résultat reçu ${result.exam_type} ${result.exam_code} — patient ${result.patient_federation_id}`);
    console.log('Partage :', result);
    console.log('Fiche de l’examen (/result) :', this.summary());
    console.log('Détail (/result/more_infos) :', this.details());
    const items = this.details()?.items ?? [];
    if (items.length) console.table(items);
    console.log('Compte rendu affiché :', this.report());
    console.groupEnd();
  }
}
