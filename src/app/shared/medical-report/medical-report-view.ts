import { Component, afterNextRender, computed, inject, input, signal } from '@angular/core';
import { PIcon } from '@primeicons/angular/p-icon';
import { FLAG_LABELS, FLAG_SYMBOLS, MedicalReport, ReportMeasure, ReportStudy, formatDate, gauge, isOutOfRange } from './medical-report';
import { PATIENT_NOTICE, ReportAudience, printReport } from './print-report';
import { SaasAccountService } from '../../saas/saas-account.service';

let nextId = 0;

/** Compte rendu d'un examen (biologie, imagerie, exploration) à l'écran, avec impression A4. */
@Component({
  selector: 'app-medical-report',
  imports: [PIcon],
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

  constructor() {
    afterNextRender(() => {
      if (this.touchDevice && this.canPrint()) void import('./report-pdf').then((m) => m.preloadPdfEngine());
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
    return `Validé${r.validatedAt ? ` le ${formatDate(r.validatedAt)}` : ''}${r.validatedBy ? ` par ${r.validatedBy}` : ''}`;
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
