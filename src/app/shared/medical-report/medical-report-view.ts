import { Component, computed, effect, inject, input, signal, untracked } from '@angular/core';
import { PIcon } from '@primeicons/angular/p-icon';
import { FLAG_LABELS, FLAG_SYMBOLS, MedicalReport, ReportMeasure, ReportStudy, formatDate, gauge, isOutOfRange } from './medical-report';
import { PATIENT_NOTICE, ReportAudience, printReport } from './print-report';
import { SaasAccountService } from '../../saas/saas-account.service';

import { TranslatePipe } from '../i18n/t.pipe';
import { I18n, tr } from '../i18n/i18n';
let nextId = 0;

/** Compte rendu d'un examen (biologie, imagerie, exploration) à l'écran, avec impression A4. */
@Component({
  selector: 'app-medical-report',
  imports: [TranslatePipe, PIcon],
  templateUrl: './medical-report-view.html',
  styleUrl: './medical-report-view.css',
})
export class MedicalReportView {
  readonly report = input.required<MedicalReport>();
  readonly audience = input<ReportAudience>('patient');

  private readonly account = inject(SaasAccountService);
  /** Impression et PDF : disponibles sauf configuration contraire du super-administrateur. */
  protected readonly canPrint = this.account.canPrint;
  protected readonly printMessage = computed(() => this.account.printRight()?.message ?? null);
  /** Écran tactile (téléphone, tablette) : l'impression depuis la page n'y produit pas de fichier, seul le PDF est proposé. */
  protected readonly touchDevice = typeof window !== 'undefined' && !!window.matchMedia?.('(pointer: coarse)').matches;
  protected readonly pdfBusy = signal(false);
  protected readonly pdfError = signal<string | null>(null);
  /**
   * Écran tactile : PDF préparé dès l'affichage, puis téléchargé par un vrai lien. Le toucher de
   * l'utilisateur déclenche lui-même le téléchargement, que les téléphones refusent sinon.
   */
  protected readonly pdfLink = signal<{ url: string; name: string } | null>(null);
  protected readonly pdfPreparing = signal(false);

  private readonly i18n = inject(I18n);

  constructor() {
    effect((onCleanup) => {
      const report = this.report();
      const audience = this.audience();
      this.i18n.lang(); // libellés du PDF dans la langue de l'interface
      this.pdfLink.set(null);
      if (!this.touchDevice || !this.canPrint()) return;

      let cancelled = false;
      let url: string | null = null;
      this.pdfPreparing.set(true);
      untracked(() => import('./report-pdf').then((m) => m.prepareReportPdf(report, audience)))
        .then(({ blob, name }) => {
          if (cancelled) return;
          url = URL.createObjectURL(blob);
          this.pdfLink.set({ url, name });
        })
        .catch((err: unknown) => console.error(err)) // repli : le bouton génère le PDF au toucher
        .finally(() => {
          if (!cancelled) this.pdfPreparing.set(false);
        });
      onCleanup(() => {
        cancelled = true;
        if (url) URL.revokeObjectURL(url);
      });
    });
  }

  protected readonly titleId = `medical-report-${nextId++}`;
  protected readonly printNoteId = `${this.titleId}-print-note`;
  protected readonly flagLabels = FLAG_LABELS;
  protected readonly flagSymbols = FLAG_SYMBOLS;
  protected readonly notice = PATIENT_NOTICE;
  protected readonly formatDate = formatDate;
  protected readonly isOutOfRange = isOutOfRange;
  protected readonly gauge = gauge;

  protected readonly outOfRange = computed(() => this.report().measures.filter(isOutOfRange).length);
  protected readonly hasRanges = computed(() => this.report().measures.some((m) => m.range));

  protected readonly identity = computed(() => {
    const p = this.report().patient;
    return [
      { label: 'Patient', value: p.name },
      { label: 'Identifiant', value: p.identifier },
      { label: 'Né(e) le', value: p.birthDate ? formatDate(p.birthDate, false) : '' },
      { label: 'Âge', value: p.age },
      { label: 'Sexe', value: p.sex },
    ].filter((f) => f.value);
  });

  protected readonly validation = computed(() => {
    const r = this.report();
    if (!r.validatedAt && !r.validatedBy) return '';
    if (r.validatedAt && r.validatedBy) return tr('Validé le {date} par {name}', { date: formatDate(r.validatedAt), name: r.validatedBy });
    return r.validatedAt ? tr('Validé le {date}', { date: formatDate(r.validatedAt) }) : tr('Validé par {name}', { name: r.validatedBy });
  });

  protected flagClass(m: ReportMeasure): string {
    return isOutOfRange(m) ? 'is-out' : m.flag === 'normal' ? 'is-normal' : '';
  }

  protected studyMeta(s: ReportStudy): string {
    return [s.date ? formatDate(s.date) : '', s.institution, s.physician].filter((v) => !!v).join(' · ');
  }

  print(): void {
    if (!this.canPrint()) return;
    printReport(this.report(), this.audience());
  }

  async downloadPdf(): Promise<void> {
    if (!this.canPrint() || this.pdfBusy()) return;
    this.pdfBusy.set(true);
    this.pdfError.set(null);
    try {
      const { downloadReportPdf } = await import('./report-pdf');
      await downloadReportPdf(this.report(), this.audience());
    } catch (err) {
      console.error(err);
      this.pdfError.set("Le PDF n'a pas pu être généré. Réessayez.");
    } finally {
      this.pdfBusy.set(false);
    }
  }
}
