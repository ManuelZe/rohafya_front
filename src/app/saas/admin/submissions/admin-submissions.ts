import { Component, OnDestroy, PLATFORM_ID, computed, effect, inject, signal, untracked } from '@angular/core';
import { DatePipe, isPlatformBrowser } from '@angular/common';
import { DomSanitizer, SafeUrl } from '@angular/platform-browser';
import { CdkTrapFocus } from '@angular/cdk/a11y';
import { FormField, FormRoot, form, maxLength } from '@angular/forms/signals';
import { PIcon } from '@primeicons/angular/p-icon';
import { extractErrorMessage } from '../../../doctors/shared/api-resource';
import { PageHeader } from '../../../patients/shared/page-header/page-header';
import { Pager } from '../../shared/pager';
import {
  SUBMISSION_KIND_LABELS,
  SUBMISSION_STATUS_LABELS,
  SubmissionKind,
  SubmissionStatus,
  formatFcfa,
} from '../../../shared/submission/submission.models';
import { SubmissionAdminItem, SubmissionList } from '../../saas.models';
import { TenantAdminService } from '../../tenant-admin.service';
import { TenantContext } from '../tenant-context.service';

const PAGE_SIZE = 25;
const AUTHOR_LABELS: Record<string, string> = { patient: 'Patient', doctor: 'Médecin', anonyme: 'Visiteur' };
const REQUEST_CATEGORIES: Record<string, string> = {
  administration: 'Administration',
  commission: 'Commission',
  connection: 'Connexion',
  error: 'Erreur',
  etat_patient: 'État patient',
  revendication_examen: 'Revendication examen',
  suggestion: 'Suggestion',
  patient_request_examen_out: 'Examen externe',
  patient_request_prix_examen: "Prix d'un examen",
  patient_request_connexion: 'Connexion',
  patient_request_other_administration: 'Autre demande administrative',
};

interface AnswerModel {
  status: SubmissionStatus;
  response: string;
  /** Montant du devis (FCFA), sous forme de texte : vide = non fixé. */
  quote_amount: string;
}

/** Demandes reçues par l'établissement : prescriptions, pré-enregistrements et requêtes. */
@Component({
  selector: 'app-admin-submissions',
  imports: [DatePipe, PIcon, PageHeader, Pager, FormRoot, FormField, CdkTrapFocus],
  templateUrl: './admin-submissions.html',
  styleUrls: ['../../../doctors/shared/doctor-ui.css', '../../shared/console-ui.css', './admin-submissions.css'],
  host: {
    '(document:keydown.escape)': 'close()',
  },
})
export class AdminSubmissions implements OnDestroy {
  private readonly service = inject(TenantAdminService);
  private readonly platformId = inject(PLATFORM_ID);
  private readonly sanitizer = inject(DomSanitizer);
  readonly context = inject(TenantContext);

  readonly kindLabels = SUBMISSION_KIND_LABELS;
  readonly statusLabels = SUBMISSION_STATUS_LABELS;
  readonly authorLabels = AUTHOR_LABELS;
  readonly pageSize = PAGE_SIZE;
  readonly kinds: { value: SubmissionKind | ''; label: string }[] = [
    { value: '', label: 'Toutes' },
    { value: 'prescription', label: 'Prescriptions' },
    { value: 'pre_enregistrement', label: 'Pré-enregistrements' },
    { value: 'requete', label: 'Requêtes' },
  ];
  readonly statuses: { value: SubmissionStatus | ''; label: string }[] = [
    { value: 'recue', label: 'Reçues' },
    { value: 'en_cours', label: 'En cours' },
    { value: 'traitee', label: 'Traitées' },
    { value: 'refusee', label: 'Refusées' },
    { value: '', label: 'Toutes' },
  ];
  readonly answerStatuses: SubmissionStatus[] = ['recue', 'en_cours', 'traitee', 'refusee'];

  readonly kind = signal<SubmissionKind | ''>('');
  readonly status = signal<SubmissionStatus | ''>('recue');
  readonly query = signal('');
  readonly page = signal(1);
  readonly list = signal<SubmissionList | null>(null);
  readonly loading = signal(false);
  readonly loaded = signal(false);
  readonly error = signal<string | null>(null);

  /** Demande ouverte dans la fenêtre de détail. */
  readonly selected = signal<SubmissionAdminItem | null>(null);
  readonly imageUrl = signal<SafeUrl | null>(null);
  readonly imageError = signal(false);
  readonly saving = signal(false);
  readonly saveError = signal<string | null>(null);
  readonly saved = signal(false);
  private objectUrl: string | null = null;

  readonly answer = signal<AnswerModel>({ status: 'recue', response: '', quote_amount: '' });
  readonly answerForm = form(this.answer, (f) => {
    maxLength(f.response, 5000);
  });

  readonly items = computed(() => this.list()?.items ?? []);
  readonly total = computed(() => this.list()?.total ?? 0);

  /** Demandes à traiter (reçues + en cours) par type, pour les onglets. */
  readonly pending = computed(() => {
    const counts = this.list()?.counts ?? {};
    const result: Record<string, number> = { '': 0 };
    for (const kind of ['prescription', 'pre_enregistrement', 'requete'] as SubmissionKind[]) {
      const byStatus = counts[kind] ?? {};
      result[kind] = (byStatus.recue ?? 0) + (byStatus.en_cours ?? 0);
      result[''] += result[kind];
    }
    return result;
  });

  /** Le devis ne concerne que les prescriptions avec demande de devis. */
  readonly quoteRequested = computed(() => {
    const s = this.selected();
    return !!s && s.kind === 'prescription' && !!s.item?.['demande_devis'];
  });

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

  ngOnDestroy(): void {
    this.releaseImage();
  }

  setKind(value: SubmissionKind | ''): void {
    this.kind.set(value);
    this.page.set(1);
    this.load();
  }

  setStatus(value: SubmissionStatus | ''): void {
    this.status.set(value);
    this.page.set(1);
    this.load();
  }

  search(event: Event): void {
    event.preventDefault();
    this.page.set(1);
    this.load();
  }

  onQuery(event: Event): void {
    this.query.set((event.target as HTMLInputElement).value);
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
    this.service
      .submissions(id, { kind: this.kind(), status: this.status(), q: this.query().trim(), page: this.page(), page_size: PAGE_SIZE })
      .subscribe({
        next: (result) => {
          this.list.set(result);
          this.loading.set(false);
          this.loaded.set(true);
        },
        error: (err: unknown) => {
          this.error.set(extractErrorMessage(err, 'Impossible de charger les demandes.'));
          this.loading.set(false);
        },
      });
  }

  // --- Présentation --------------------------------------------------------

  /** Résumé d'une ligne : ce que contient la demande. */
  summary(s: SubmissionAdminItem): string {
    const item = s.item ?? {};
    if (s.kind === 'prescription') {
      const who = s.patient_name ? `Pour ${s.patient_name}` : String(item['NameDoctor'] || 'Prescription');
      return item['Description'] ? `${who} — ${item['Description']}` : who;
    }
    if (s.kind === 'pre_enregistrement') {
      return `${item['prenom'] ?? ''} ${item['nom'] ?? ''}`.trim() || 'Pré-enregistrement';
    }
    return String(item['message'] ?? '');
  }

  categories(s: SubmissionAdminItem): string[] {
    const item = s.item ?? {};
    return Object.entries(REQUEST_CATEGORIES)
      .filter(([key]) => item[key] === true)
      .map(([, label]) => label)
      .filter((label, index, all) => all.indexOf(label) === index);
  }

  field(s: SubmissionAdminItem, key: string): string {
    const value = s.item?.[key];
    return value === null || value === undefined || value === '' ? '' : String(value);
  }

  quote(amount: number | null): string {
    return amount === null ? '' : formatFcfa(amount);
  }

  // --- Détail et réponse ---------------------------------------------------

  open(s: SubmissionAdminItem): void {
    this.selected.set(s);
    this.saveError.set(null);
    this.saved.set(false);
    this.answer.set({
      status: s.status === 'recue' ? 'en_cours' : s.status,
      response: s.response ?? '',
      quote_amount: s.quote_amount === null ? '' : String(s.quote_amount),
    });
    this.releaseImage();
    if (s.has_image) this.loadImage(s);
  }

  close(): void {
    if (!this.selected()) return;
    this.selected.set(null);
    this.releaseImage();
  }

  private loadImage(s: SubmissionAdminItem): void {
    const id = this.context.tenantId();
    if (!id) return;
    this.service.submissionImage(id, s.id).subscribe({
      next: (blob) => {
        if (this.selected()?.id !== s.id) return;
        this.objectUrl = URL.createObjectURL(blob);
        this.imageUrl.set(this.sanitizer.bypassSecurityTrustUrl(this.objectUrl));
      },
      error: () => this.imageError.set(true),
    });
  }

  private releaseImage(): void {
    if (this.objectUrl) URL.revokeObjectURL(this.objectUrl);
    this.objectUrl = null;
    this.imageUrl.set(null);
    this.imageError.set(false);
  }

  submitAnswer(): void {
    const id = this.context.tenantId();
    const s = this.selected();
    if (!id || !s || this.saving()) return;
    const model = this.answer();
    const amount = model.quote_amount.replace(/\s/g, '').replace(',', '.');
    if (this.quoteRequested() && amount !== '' && (Number.isNaN(Number(amount)) || Number(amount) < 0)) {
      this.saveError.set('Le montant du devis doit être un nombre positif.');
      return;
    }
    this.saving.set(true);
    this.saveError.set(null);
    this.service
      .answerSubmission(id, s.id, {
        status: model.status,
        response: model.response,
        ...(this.quoteRequested() ? { quote_amount: amount === '' ? '' : Number(amount) } : {}),
      })
      .subscribe({
        next: (updated) => {
          this.saving.set(false);
          this.saved.set(true);
          this.selected.set(updated);
          this.load();
        },
        error: (err: unknown) => {
          this.saving.set(false);
          this.saveError.set(extractErrorMessage(err, "La réponse n'a pas pu être enregistrée."));
        },
      });
  }
}
