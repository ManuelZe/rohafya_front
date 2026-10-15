import { Component, PLATFORM_ID, inject, signal } from '@angular/core';
import { isPlatformBrowser } from '@angular/common';
import { CdkTrapFocus } from '@angular/cdk/a11y';
import { FormField, FormRoot, form, maxLength } from '@angular/forms/signals';
import { PIcon } from '@primeicons/angular/p-icon';
import { extractErrorMessage } from '../../../doctors/shared/api-resource';
import { PageHeader } from '../../../patients/shared/page-header/page-header';
import { LocalDatePipe } from '../../../shared/i18n/ldate.pipe';
import { TranslatePipe } from '../../../shared/i18n/t.pipe';
import type { DeletionRequestView } from '../../../shared/security/security.service';
import { Paged } from '../../saas.models';
import { Pager } from '../../shared/pager';
import { SuperAdminService } from '../../super-admin.service';

type Filter = 'demandee' | 'traitee' | 'refusee' | 'annulee' | '';
const STATUS_LABELS: Record<DeletionRequestView['status'], string> = {
  demandee: 'À traiter',
  traitee: 'Compte anonymisé',
  refusee: 'Refusée',
  annulee: 'Annulée par l’utilisateur',
};

/** Données personnelles : demandes de suppression de compte (loi n° 2024/017), traitées sous 30 jours. */
@Component({
  selector: 'app-super-privacy',
  imports: [TranslatePipe, LocalDatePipe, CdkTrapFocus, FormRoot, FormField, PIcon, PageHeader, Pager],
  template: `
    <div class="page">
      <app-page-header
        [title]="'Données personnelles' | t"
        [subtitle]="'Demandes de suppression de compte, à traiter sous 30 jours (loi n° 2024/017 du 23 décembre 2024).' | t"
      />
      <section class="card">
        <div class="toolbar">
          <div class="segmented" role="group" [attr.aria-label]="'Filtrer par statut' | t">
            @for (f of filters; track f) {
              <button type="button" [attr.aria-pressed]="filter() === f" (click)="setFilter(f)">{{ (f ? labels[f] : 'Toutes') | t }}</button>
            }
          </div>
          <span class="muted total" aria-live="polite">{{ '{0} demande(s)' | t: [list()?.total ?? 0] }}</span>
        </div>
        @if (error()) {
          <div class="banner banner-error notice" role="alert">
            <svg [pIcon]="'exclamation-circle'" [size]="16" aria-hidden="true"></svg>
            <span>{{ error() | t }}</span>
          </div>
        }
        @if (list(); as l) {
          @if (l.items.length === 0) {
            <div class="state"><span>{{ 'Aucune demande.' | t }}</span></div>
          } @else {
            <div class="table-wrap">
              <table class="rtable">
                <caption class="sr-only">{{ 'Demandes de suppression de compte' | t }}</caption>
                <thead>
                  <tr>
                    <th scope="col">{{ 'Date' | t }}</th>
                    <th scope="col">{{ 'Compte' | t }}</th>
                    <th scope="col">{{ 'Motif' | t }}</th>
                    <th scope="col">{{ 'Statut' | t }}</th>
                    <th scope="col"><span class="sr-only">{{ 'Actions' | t }}</span></th>
                  </tr>
                </thead>
                <tbody>
                  @for (r of l.items; track r.id) {
                    <tr>
                      <td [attr.data-label]="'Date' | t">{{ r.created_at | ldate: 'datetime' }}</td>
                      <td [attr.data-label]="'Compte' | t"><span class="strong">{{ r.name || '—' }}</span><br /><span class="muted">{{ r.email }}</span></td>
                      <td [attr.data-label]="'Motif' | t">{{ r.reason || '—' }}</td>
                      <td [attr.data-label]="'Statut' | t">
                        {{ labels[r.status] | t }}
                        @if (r.note) {
                          <br /><span class="muted">{{ r.note }}</span>
                        }
                      </td>
                      <td class="actions-cell">
                        @if (r.status === 'demandee') {
                          <span class="cell-actions">
                            <button type="button" class="btn btn-danger-ghost btn-sm" (click)="open(r, 'anonymize')">
                              {{ 'Anonymiser le compte' | t }}<span class="sr-only"> {{ r.email }}</span>
                            </button>
                            <button type="button" class="btn btn-ghost btn-sm" (click)="open(r, 'refuse')">
                              {{ 'Refuser' | t }}<span class="sr-only"> {{ r.email }}</span>
                            </button>
                          </span>
                        }
                      </td>
                    </tr>
                  }
                </tbody>
              </table>
            </div>
            <app-pager [page]="page()" [pageSize]="25" [total]="l.total" (pageChange)="goTo($event)" />
          }
        }
      </section>

      @if (target(); as t) {
        <div class="overlay" (click)="close()">
          <div class="dialog" role="alertdialog" aria-modal="true" aria-labelledby="privacy-dialog-title" cdkTrapFocus [cdkTrapFocusAutoCapture]="true" (click)="$event.stopPropagation()">
            <h2 id="privacy-dialog-title">{{ (decision() === 'anonymize' ? 'Anonymiser le compte {0} ?' : 'Refuser la suppression de {0} ?') | t: [t.email] }}</h2>
            @if (decision() === 'anonymize') {
              <p>{{ 'Le compte est désactivé, ses informations personnelles effacées, ses rattachements retirés et ses partages supprimés. Les résultats et factures restent chez les établissements. Action irréversible.' | t }}</p>
            } @else {
              <p>{{ 'Le motif est communiqué à l’utilisateur (ex. obligation légale de conservation, compte administrateur à transférer).' | t }}</p>
            }
            <form [formRoot]="noteForm" (submit)="confirm()">
              <div class="form-row">
                <label for="privacy-note">{{ (decision() === 'refuse' ? 'Motif du refus *' : 'Note (facultative)') | t }}</label>
                <textarea id="privacy-note" class="field" rows="3" [formField]="noteForm.note"></textarea>
              </div>
              <div class="form-actions">
                <button type="button" class="btn btn-ghost" (click)="close()">{{ 'Fermer' | t }}</button>
                <button type="submit" [class]="'btn ' + (decision() === 'anonymize' ? 'btn-danger' : 'btn-primary')"
                  [disabled]="busy() || (decision() === 'refuse' && !noteModel().note.trim())">
                  {{ (decision() === 'anonymize' ? 'Anonymiser' : 'Refuser') | t }}
                </button>
              </div>
            </form>
          </div>
        </div>
      }
    </div>
  `,
  styleUrls: ['../../../doctors/shared/doctor-ui.css', '../../shared/console-ui.css'],
  host: { '(document:keydown.escape)': 'close()' },
})
export class SuperPrivacy {
  private readonly service = inject(SuperAdminService);

  readonly labels = STATUS_LABELS;
  readonly filters: Filter[] = ['demandee', 'traitee', 'refusee', 'annulee', ''];
  readonly filter = signal<Filter>('demandee');
  readonly page = signal(1);
  readonly list = signal<Paged<DeletionRequestView> | null>(null);
  readonly error = signal<string | null>(null);
  readonly busy = signal(false);
  readonly target = signal<DeletionRequestView | null>(null);
  readonly decision = signal<'anonymize' | 'refuse'>('anonymize');
  readonly noteModel = signal({ note: '' });
  readonly noteForm = form(this.noteModel, (f) => {
    maxLength(f.note, 2000, { message: '2000 caractères au plus.' });
  });

  constructor() {
    if (isPlatformBrowser(inject(PLATFORM_ID))) this.load();
  }

  load(): void {
    this.service.deletionRequests({ status: this.filter(), page: this.page() }).subscribe({
      next: (list) => this.list.set(list),
      error: (err: unknown) => this.error.set(extractErrorMessage(err, 'Impossible de charger les demandes.')),
    });
  }

  setFilter(filter: Filter): void {
    this.filter.set(filter);
    this.page.set(1);
    this.load();
  }

  goTo(page: number): void {
    this.page.set(page);
    this.load();
  }

  open(request: DeletionRequestView, decision: 'anonymize' | 'refuse'): void {
    this.target.set(request);
    this.decision.set(decision);
    this.noteModel.set({ note: '' });
  }

  close(): void {
    this.target.set(null);
  }

  confirm(): void {
    const request = this.target();
    if (!request || this.busy()) return;
    this.busy.set(true);
    this.service.processDeletion(request.id, this.decision(), this.noteModel().note.trim()).subscribe({
      next: () => {
        this.busy.set(false);
        this.target.set(null);
        this.load();
      },
      error: (err: unknown) => {
        this.busy.set(false);
        this.target.set(null);
        this.error.set(extractErrorMessage(err, 'La demande n’a pas pu être traitée.'));
      },
    });
  }
}
