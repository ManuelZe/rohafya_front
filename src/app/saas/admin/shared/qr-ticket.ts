import { Component, computed, input, output, signal } from '@angular/core';
import { DatePipe } from '@angular/common';
import { PIcon } from '@primeicons/angular/p-icon';
import { IssuedLinkToken } from '../../saas.models';

/** Fenêtre affichant le QR code à imprimer sur la facture, son code court et son lien. */
@Component({
  selector: 'app-qr-ticket',
  imports: [DatePipe, PIcon],
  host: { '(document:keydown.escape)': 'closed.emit()' },
  template: `
    <div class="overlay" (click)="closed.emit()">
      <div class="dialog ticket" role="dialog" aria-modal="true" aria-labelledby="qr-title" (click)="$event.stopPropagation()">
        <h2 id="qr-title">QR code de rattachement</h2>
        <p class="muted">
          Dossier <strong>{{ token().local_ref }}</strong>{{ token().establishment ? ' · ' + token().establishment : '' }}.
          À imprimer sur la facture ou à remettre au patient. Il ne sert qu’une fois.
        </p>
        @if (imageSrc(); as src) {
          <img class="qr" [src]="src" width="220" height="220" alt="QR code de rattachement du dossier {{ token().local_ref }}" />
        }
        <p class="short-label">Code à saisir si le QR code ne peut pas être scanné</p>
        <p class="short-code">{{ token().short_code }}</p>
        @if (token().expires_at) {
          <p class="muted expires">Valable jusqu’au {{ token().expires_at | date: 'dd/MM/yyyy' }}</p>
        }
        <div class="ticket-actions">
          @if (imageSrc(); as src) {
            <a class="btn btn-ghost" [href]="src" [attr.download]="'qr-' + token().local_ref + '.png'">
              <svg [pIcon]="'download'" [size]="16" aria-hidden="true"></svg>
              <span>Télécharger</span>
            </a>
          }
          <button type="button" class="btn btn-ghost" (click)="copyLink()">
            <svg [pIcon]="'copy'" [size]="16" aria-hidden="true"></svg>
            <span>{{ copied() ? 'Lien copié' : 'Copier le lien' }}</span>
          </button>
          <button type="button" class="btn btn-primary" (click)="closed.emit()">Fermer</button>
        </div>
      </div>
    </div>
  `,
  styleUrls: ['../../../doctors/shared/doctor-ui.css', '../../shared/console-ui.css'],
  styles: `
    .ticket {
      text-align: center;
    }
    .qr {
      display: block;
      width: 220px;
      max-width: 100%;
      height: auto;
      margin: 0.5rem auto 1rem;
      image-rendering: pixelated;
    }
    .short-label {
      margin: 0 !important;
      font-size: 0.8rem !important;
      color: var(--doc-muted);
    }
    .short-code {
      margin: 0.25rem 0 0.5rem !important;
      font-size: 1.6rem !important;
      font-weight: 800;
      letter-spacing: 0.2em;
      color: #15359e;
    }
    .expires {
      font-size: 0.82rem !important;
    }
    .ticket-actions {
      display: flex;
      flex-wrap: wrap;
      justify-content: center;
      gap: 0.75rem;
    }
  `,
})
export class QrTicket {
  readonly token = input.required<IssuedLinkToken>();
  readonly closed = output<void>();
  readonly copied = signal(false);

  /** PNG base64 fourni par l'API (data:image/png est autorisé par l'assainisseur d'URL d'Angular). */
  readonly imageSrc = computed(() => {
    const png = this.token().qr_png;
    return png ? `data:image/png;base64,${png}` : null;
  });

  copyLink(): void {
    const url = this.token().url;
    if (!url) return;
    navigator.clipboard?.writeText(url).then(
      () => this.copied.set(true),
      () => this.copied.set(false)
    );
  }
}
