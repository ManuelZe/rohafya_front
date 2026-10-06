import { Component, computed, input } from '@angular/core';
import { DatePipe } from '@angular/common';
import { TagModule } from 'primeng/tag';
import { SUBMISSION_STATUS_SEVERITY, SubmissionInfo, formatFcfa } from './submission.models';

/** Suivi d'un élément envoyé à un établissement : destinataire, statut, réponse et devis. */
@Component({
  selector: 'app-submission-info',
  imports: [DatePipe, TagModule],
  template: `
    @if (submission(); as s) {
      <div class="submission-info">
        <div class="submission-head">
          <span class="submission-target">
            <span class="sr-only">Envoyé à </span>
            <svg aria-hidden="true" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
              <path d="M3 21h18M5 21V7l7-4 7 4v14M9 21v-6h6v6" />
            </svg>
            {{ s.establishment || 'Établissement' }}
          </span>
          <p-tag [severity]="severity()" [value]="s.status_label" />
        </div>
        @if (s.quote_amount !== null) {
          <p class="submission-quote">Devis : <strong>{{ quote() }}</strong></p>
        }
        @if (s.response) {
          <blockquote class="submission-response">
            <span class="submission-response-label">Réponse de l'établissement</span>
            {{ s.response }}
            @if (s.responded_at) {
              <time class="submission-response-date">{{ s.responded_at | date: 'dd/MM/yyyy à HH:mm' }}</time>
            }
          </blockquote>
        }
      </div>
    } @else if (showLegacy()) {
      <p class="submission-legacy">Envoyé avant le choix de l'établissement.</p>
    }
  `,
  styles: `
    .submission-info { display: flex; flex-direction: column; gap: 0.5rem; margin-top: 0.5rem; }
    .submission-head { display: flex; align-items: center; justify-content: space-between; gap: 0.5rem; flex-wrap: wrap; }
    .submission-target { display: inline-flex; align-items: center; gap: 0.35rem; font-weight: 600; color: var(--rohafya-navy); font-size: 0.875rem; }
    .submission-quote { margin: 0; font-size: 0.875rem; color: var(--color-text); }
    .submission-response {
      margin: 0; padding: 0.6rem 0.75rem; border-left: 3px solid var(--color-primary);
      background: var(--color-primary-light); border-radius: 6px; font-size: 0.875rem;
      color: var(--color-text); white-space: pre-line;
    }
    .submission-response-label { display: block; font-weight: 700; font-size: 0.75rem; color: var(--rohafya-green-800); margin-bottom: 0.2rem; }
    .submission-response-date { display: block; margin-top: 0.35rem; font-size: 0.75rem; color: #4a5568; }
    .submission-legacy { margin: 0.5rem 0 0; font-size: 0.8rem; color: #4a5568; }
    .sr-only { position: absolute; width: 1px; height: 1px; padding: 0; margin: -1px; overflow: hidden; clip: rect(0, 0, 0, 0); border: 0; }
  `,
})
export class SubmissionInfoView {
  readonly submission = input<SubmissionInfo | null | undefined>(null);
  /** Afficher une mention pour un élément antérieur sans établissement. */
  readonly showLegacy = input(true);

  readonly severity = computed(() => {
    const s = this.submission();
    return s ? SUBMISSION_STATUS_SEVERITY[s.status] : 'info';
  });
  readonly quote = computed(() => {
    const amount = this.submission()?.quote_amount;
    return amount === null || amount === undefined ? '' : formatFcfa(amount);
  });
}
