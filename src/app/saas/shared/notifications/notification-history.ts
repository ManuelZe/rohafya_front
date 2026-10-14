import { Component, input, output } from '@angular/core';
import { DatePipe } from '@angular/common';
import { AUDIENCE_LABELS, NotificationCampaign } from '../../saas.models';
import { Pager } from '../pager';

import { TranslatePipe } from '../../../shared/i18n/t.pipe';
/** Historique des notifications envoyées (consoles d'établissement et super-administrateur). */
@Component({
  selector: 'app-notification-history',
  imports: [TranslatePipe, DatePipe, Pager],
  template: `
    @if (items().length === 0) {
      <div class="state">
        <strong>{{ 'Aucune notification envoyée' | t }}</strong>
        <span>{{ 'Les envois apparaîtront ici, avec le nombre de destinataires et d\\'e-mails.' | t }}</span>
      </div>
    } @else {
      <div class="table-wrap" [class.is-refreshing]="loading()">
        <table class="rtable">
          <caption class="sr-only">{{ 'Notifications envoyées' | t }}</caption>
          <thead>
            <tr>
              <th scope="col">{{ 'Date' | t }}</th>
              @if (showEstablishment()) {
                <th scope="col">{{ 'Établissement' | t }}</th>
              }
              <th scope="col">{{ 'Notification' | t }}</th>
              <th scope="col">{{ 'Destinataires' | t }}</th>
              <th scope="col">{{ 'E-mails' | t }}</th>
              <th scope="col">{{ 'Expéditeur' | t }}</th>
            </tr>
          </thead>
          <tbody>
            @for (c of items(); track c.id) {
              <tr>
                <td [attr.data-label]="'Date' | t">{{ c.created_at | date: 'dd/MM/yyyy HH:mm' }}</td>
                @if (showEstablishment()) {
                  <td [attr.data-label]="'Établissement' | t">{{ c.establishment || '—' }}</td>
                }
                <td [attr.data-label]="'Notification' | t">
                  <details class="history-message">
                    <summary>{{ c.title | t }}</summary>
                    <p>{{ c.message | t }}</p>
                  </details>
                </td>
                <td [attr.data-label]="'Destinataires' | t">
                  {{ c.recipients_count }} · {{ c.selection === 'all' ? 'tous les ' + labels[c.audience].toLowerCase() : labels[c.audience].toLowerCase() + ' choisis' }}
                </td>
                <td [attr.data-label]="'E-mails' | t">
                  @if (c.emails_sent === null) {
                    <span class="pill pill-pending">{{ 'En cours ({0})' | t: [c.emails_count] }}</span>
                  } @else {
                    <span [class]="'pill ' + (c.emails_sent < c.emails_count ? 'pill-danger' : 'pill-active')">{{ c.emails_sent }} / {{ c.emails_count }}</span>
                  }
                </td>
                <td [attr.data-label]="'Expéditeur' | t">{{ (c.sender_role === 'super_admin' ? 'ROHAFYA' : c.sender_name || '—') | t }}</td>
              </tr>
            }
          </tbody>
        </table>
      </div>
      <app-pager [page]="page()" [pageSize]="pageSize()" [total]="total()" (pageChange)="pageChange.emit($event)" />
    }
  `,
  styleUrls: ['../../../doctors/shared/doctor-ui.css', '../console-ui.css', './notifications.css'],
})
export class NotificationHistory {
  readonly items = input.required<NotificationCampaign[]>();
  readonly total = input(0);
  readonly page = input(1);
  readonly pageSize = input(20);
  readonly loading = input(false);
  readonly showEstablishment = input(false);
  readonly pageChange = output<number>();

  protected readonly labels = AUDIENCE_LABELS;
}
