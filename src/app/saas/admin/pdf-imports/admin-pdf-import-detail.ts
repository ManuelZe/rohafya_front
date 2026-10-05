import { Component, DestroyRef, PLATFORM_ID, computed, effect, inject, input, signal, untracked } from '@angular/core';
import { DatePipe, isPlatformBrowser } from '@angular/common';
import { DomSanitizer, SafeResourceUrl } from '@angular/platform-browser';
import { HttpErrorResponse } from '@angular/common/http';
import { Router, RouterLink } from '@angular/router';
import { FormField, FormRoot, applyEach, form, pattern, required } from '@angular/forms/signals';
import { PIcon } from '@primeicons/angular/p-icon';
import { Observable } from 'rxjs';
import { extractErrorMessage } from '../../../doctors/shared/api-resource';
import { PageHeader } from '../../../patients/shared/page-header/page-header';
import { PDF_STATUS_LABELS, PdfImport, PdfValue } from '../../saas.models';
import { PDF_IMPORT_ENABLED } from '../../features';
import { TenantAdminService } from '../../tenant-admin.service';
import { TenantContext } from '../tenant-context.service';

interface ValueRow {
  code: string;
  name: string;
  result: string;
  units: string;
  lower_limit: string;
  upper_limit: string;
  remarks: string;
}

interface ReviewModel {
  local_ref: string;
  exam_code: string;
  title: string;
  validation_date: string;
  details: ValueRow[];
}

const NOMBRE = /^\s*-?\d+(?:[.,]\d+)?\s*$/;
const NOMBRE_OU_VIDE = /^\s*(?:-?\d+(?:[.,]\d+)?)?\s*$/;

function texte(valeur: number | null | undefined): string {
  return valeur === null || valeur === undefined ? '' : String(valeur).replace('.', ',');
}

function nombre(valeur: string): number | null {
  const v = valeur.trim().replace(',', '.');
  return v === '' || Number.isNaN(Number(v)) ? null : Number(v);
}

function versLigne(v: PdfValue): ValueRow {
  return {
    code: v.code ?? '',
    name: v.name ?? '',
    result: texte(v.result),
    units: v.units ?? '',
    lower_limit: texte(v.lower_limit),
    upper_limit: texte(v.upper_limit),
    remarks: v.remarks ?? '',
  };
}

function ligneVide(): ValueRow {
  return { code: '', name: '', result: '', units: '', lower_limit: '', upper_limit: '', remarks: '' };
}

/** Relecture d'un compte rendu PDF : le document d'origine à côté des valeurs extraites, modifiables. */
@Component({
  selector: 'app-admin-pdf-import-detail',
  imports: [DatePipe, RouterLink, FormField, FormRoot, PIcon, PageHeader],
  templateUrl: './admin-pdf-import-detail.html',
  styleUrls: ['../../../doctors/shared/doctor-ui.css', '../../shared/console-ui.css', './admin-pdf-import-detail.css'],
})
export class AdminPdfImportDetail {
  private readonly service = inject(TenantAdminService);
  private readonly sanitizer = inject(DomSanitizer);
  private readonly router = inject(Router);
  private readonly platformId = inject(PLATFORM_ID);
  readonly context = inject(TenantContext);

  /** Identifiant du compte rendu (paramètre de route :id). */
  readonly id = input.required<string>();
  readonly importId = computed(() => Number(this.id()));

  /** Faux : fonctionnalité affichée en aperçu, grisée et inactive. */
  readonly pdfEnabled = PDF_IMPORT_ENABLED;
  readonly statusLabels = PDF_STATUS_LABELS;
  readonly item = signal<PdfImport | null>(null);
  readonly loading = signal(false);
  readonly busy = signal<string | null>(null);
  readonly error = signal<string | null>(null);
  readonly notice = signal<string | null>(null);
  readonly pdfUrl = signal<SafeResourceUrl | null>(null);
  readonly pdfRawUrl = signal<string | null>(null);
  readonly warningsToConfirm = signal<string[] | null>(null);
  readonly confirmReject = signal(false);
  readonly confirmDelete = signal(false);

  readonly editable = computed(() => {
    const status = this.item()?.status;
    return status === 'pret' || status === 'a_relire' || status === 'erreur';
  });
  readonly extraction = computed(() => this.item()?.extraction ?? null);
  readonly issues = computed(() => {
    const ex = this.extraction();
    if (!ex) return [];
    return [
      ...ex.anomalies.map((a) => (a.name ? `${a.name} : ${a.probleme}` : a.probleme)),
      ...ex.a_relire.map((ligne) => `Ligne non reconnue : « ${ligne} »`),
    ];
  });

  readonly model = signal<ReviewModel>({ local_ref: '', exam_code: '', title: '', validation_date: '', details: [] });
  readonly reviewForm = form(this.model, (f) => {
    required(f.local_ref, { message: 'Le numéro de dossier est requis' });
    required(f.validation_date, { message: 'La date de validation est requise' });
    applyEach(f.details, (row) => {
      required(row.name, { message: 'Nom requis' });
      required(row.result, { message: 'Valeur requise' });
      pattern(row.result, NOMBRE, { message: 'Nombre attendu' });
      pattern(row.lower_limit, NOMBRE_OU_VIDE, { message: 'Nombre attendu' });
      pattern(row.upper_limit, NOMBRE_OU_VIDE, { message: 'Nombre attendu' });
    });
  });

  private objectUrl: string | null = null;

  constructor() {
    inject(DestroyRef).onDestroy(() => this.revokePdf());
    effect(() => {
      const tenantId = this.context.tenantId();
      const id = this.importId();
      if (!tenantId || !id || !this.pdfEnabled || !isPlatformBrowser(this.platformId)) return;
      untracked(() => {
        this.load(tenantId, id);
        this.loadPdf(tenantId, id);
      });
    });
  }

  /** Aperçu « hors norme » recalculé pendant la saisie. */
  horsNorme(row: ValueRow): boolean {
    const valeur = nombre(row.result);
    const bas = nombre(row.lower_limit);
    const haut = nombre(row.upper_limit);
    if (valeur === null) return false;
    return (bas !== null && valeur < bas) || (haut !== null && valeur > haut);
  }

  addRow(): void {
    this.model.update((m) => ({ ...m, details: [...m.details, ligneVide()] }));
  }

  removeRow(index: number): void {
    this.model.update((m) => ({ ...m, details: m.details.filter((_, i) => i !== index) }));
  }

  save(): void {
    this.run('save', this.saveRequest(), 'Corrections enregistrées.');
  }

  reanalyse(useAi: boolean): void {
    const tenantId = this.context.tenantId();
    if (!tenantId) return;
    this.run(useAi ? 'ai' : 'reanalyse', this.service.reanalysePdf(tenantId, this.importId(), useAi), 'Analyse relancée.');
  }

  publish(confirmWarnings = false): void {
    const tenantId = this.context.tenantId();
    if (!tenantId || this.busy() || this.reviewForm().invalid()) return;
    // Enregistrer des corrections efface les points à vérifier : ils sont donc confirmés avant.
    if (!confirmWarnings && this.issues().length > 0) {
      this.warningsToConfirm.set(this.issues());
      return;
    }
    this.busy.set('publish');
    this.error.set(null);
    this.notice.set(null);
    const publier = () =>
      this.service.publishPdf(tenantId, this.importId(), confirmWarnings).subscribe({
        next: (item) => {
          this.busy.set(null);
          this.warningsToConfirm.set(null);
          this.setItem(item);
          this.notice.set('Compte rendu publié : le patient rattaché voit désormais ces résultats.');
        },
        error: (err: unknown) => {
          this.busy.set(null);
          const body = err instanceof HttpErrorResponse ? (err.error as { warnings?: string[] } | null) : null;
          if (err instanceof HttpErrorResponse && err.status === 409 && body?.warnings?.length) {
            this.warningsToConfirm.set(body.warnings);
          } else {
            this.error.set(extractErrorMessage(err, 'La publication a échoué.'));
          }
        },
      });
    // Les corrections en cours sont enregistrées avant de publier.
    if (this.reviewForm().dirty()) {
      this.saveRequest().subscribe({
        next: (item) => {
          this.setItem(item);
          publier();
        },
        error: (err: unknown) => {
          this.busy.set(null);
          this.error.set(extractErrorMessage(err, "L'enregistrement a échoué."));
        },
      });
    } else {
      publier();
    }
  }

  reject(): void {
    const tenantId = this.context.tenantId();
    if (!tenantId) return;
    this.confirmReject.set(false);
    this.run('reject', this.service.rejectPdf(tenantId, this.importId()), 'Compte rendu rejeté : il ne sera pas publié.');
  }

  remove(): void {
    const tenantId = this.context.tenantId();
    if (!tenantId || this.busy()) return;
    this.busy.set('delete');
    this.service.deletePdf(tenantId, this.importId()).subscribe({
      next: () => void this.router.navigateByUrl('/admin/imports-pdf'),
      error: (err: unknown) => {
        this.busy.set(null);
        this.confirmDelete.set(false);
        this.error.set(extractErrorMessage(err, 'La suppression a échoué.'));
      },
    });
  }

  private saveRequest(): Observable<PdfImport> {
    const tenantId = this.context.tenantId() ?? 0;
    const m = this.model();
    return this.service.correctPdf(tenantId, this.importId(), {
      local_ref: m.local_ref,
      exam_code: m.exam_code,
      title: m.title,
      validation_date: m.validation_date,
      details: m.details.map((row) => ({ ...row, code: row.code || null, warning: this.horsNorme(row) })),
    });
  }

  private run(action: string, request: Observable<PdfImport>, success: string): void {
    if (this.busy()) return;
    this.busy.set(action);
    this.error.set(null);
    this.notice.set(null);
    request.subscribe({
      next: (item) => {
        this.busy.set(null);
        this.setItem(item);
        this.notice.set(success);
      },
      error: (err: unknown) => {
        this.busy.set(null);
        this.error.set(extractErrorMessage(err, "L'opération a échoué."));
      },
    });
  }

  private load(tenantId: number, id: number): void {
    this.loading.set(true);
    this.service.pdfImport(tenantId, id).subscribe({
      next: (item) => {
        this.loading.set(false);
        this.setItem(item);
      },
      error: (err: unknown) => {
        this.loading.set(false);
        this.error.set(extractErrorMessage(err, 'Compte rendu introuvable.'));
      },
    });
  }

  private setItem(item: PdfImport): void {
    // La réponse d'une correction ne précise pas la disponibilité de l'IA : on garde la valeur connue.
    this.item.update((previous) => ({ ...item, ai_available: item.ai_available ?? previous?.ai_available }));
    this.reviewForm().reset({
      local_ref: item.local_ref ?? '',
      exam_code: item.exam_code ?? '',
      title: item.title ?? '',
      validation_date: item.validation_date ?? '',
      details: (item.extraction?.details ?? []).map(versLigne),
    });
  }

  private loadPdf(tenantId: number, id: number): void {
    this.service.pdfFile(tenantId, id).subscribe({
      next: (blob) => {
        this.revokePdf();
        this.objectUrl = URL.createObjectURL(new Blob([blob], { type: 'application/pdf' }));
        this.pdfRawUrl.set(this.objectUrl);
        // URL locale (blob:) créée à partir de la réponse authentifiée de l'API EDEN.
        this.pdfUrl.set(this.sanitizer.bypassSecurityTrustResourceUrl(this.objectUrl));
      },
      error: () => this.pdfUrl.set(null),
    });
  }

  private revokePdf(): void {
    if (this.objectUrl) URL.revokeObjectURL(this.objectUrl);
    this.objectUrl = null;
  }
}
