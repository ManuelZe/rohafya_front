import { Component, DestroyRef, ElementRef, Injector, afterNextRender, inject, input, signal, viewChild } from '@angular/core';
import type { TDocumentDefinitions } from 'pdfmake/interfaces';
import { PIcon } from '@primeicons/angular/p-icon';
import { TranslatePipe } from '../i18n/t.pipe';
import { downloadPdf, isTouchDevice, pdfBlob } from './pdf-engine';

export type PdfSource = () => Promise<{ definition: TDocumentDefinitions; fileName: string }>;

/**
 * Bouton « Télécharger le PDF ». Sur ordinateur, le fichier est téléchargé directement.
 * Sur téléphone, le premier toucher prépare le fichier, puis un vrai lien « Enregistrer le PDF »
 * le télécharge au second toucher (sinon le navigateur ignore le téléchargement).
 */
@Component({
  selector: 'app-pdf-button',
  imports: [TranslatePipe, PIcon],
  template: `
    @if (link(); as file) {
      <a #fileLink [class]="buttonClass()" [href]="file.url" [attr.download]="file.name" type="application/pdf">
        <svg [pIcon]="'download'" [size]="14" aria-hidden="true"></svg>
        <span>{{ 'Enregistrer le PDF' | t }}</span>
      </a>
    } @else {
      <button type="button" [class]="buttonClass()" (click)="run()" [disabled]="busy()" [attr.aria-busy]="busy()">
        @if (busy()) {
          <span class="spinner" aria-hidden="true"></span>
        } @else {
          <svg [pIcon]="'download'" [size]="14" aria-hidden="true"></svg>
        }
        <span>{{ label() | t }}</span>
        @if (srLabel()) {
          <span class="sr-only"> {{ srLabel() }}</span>
        }
      </button>
    }
    @if (error()) {
      <span class="form-error" role="alert">{{ error() | t }}</span>
    }
  `,
  host: { style: 'display: inline-flex; flex-direction: column; gap: 0.25rem;' },
  styles: `
    .btn {
      display: inline-flex;
      align-items: center;
      gap: 0.35rem;
      white-space: nowrap;
    }
  `,
})
export class PdfButton {
  readonly source = input.required<PdfSource>();
  readonly label = input('Télécharger le PDF');
  /** Complément lu par les lecteurs d'écran (ex. numéro de facture). */
  readonly srLabel = input('');
  readonly buttonClass = input('btn btn-ghost btn-sm');

  readonly busy = signal(false);
  readonly error = signal<string | null>(null);
  readonly link = signal<{ url: string; name: string } | null>(null);
  private readonly fileLink = viewChild<ElementRef<HTMLAnchorElement>>('fileLink');
  private readonly injector = inject(Injector);

  constructor() {
    inject(DestroyRef).onDestroy(() => this.release());
  }

  async run(): Promise<void> {
    if (this.busy()) return;
    this.busy.set(true);
    this.error.set(null);
    try {
      const { definition, fileName } = await this.source()();
      if (isTouchDevice()) {
        this.release();
        this.link.set({ url: URL.createObjectURL(await pdfBlob(definition)), name: fileName });
        afterNextRender(() => this.fileLink()?.nativeElement.focus(), { injector: this.injector });
      } else {
        await downloadPdf(definition, fileName);
      }
    } catch (err) {
      console.error(err);
      this.error.set("Le PDF n'a pas pu être généré. Réessayez.");
    } finally {
      this.busy.set(false);
    }
  }

  private release(): void {
    const current = this.link();
    if (current) URL.revokeObjectURL(current.url);
    this.link.set(null);
  }
}
