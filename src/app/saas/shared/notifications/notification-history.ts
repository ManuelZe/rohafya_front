import { Component, input, output } from '@angular/core';
import { DatePipe } from '@angular/common';
import { AUDIENCE_LABELS, NotificationCampaign } from '../../saas.models';
import { Pager } from '../pager';

/** Historique des notifications envoyées (consoles d'établissement et super-administrateur). */
@Component({
  selector: 'app-notification-history',
  imports: [DatePipe, Pager],
  template: `
    @if (items().length === 0) {
      <div class="state">
        <strong>Aucune notification envoyée</strong>
        <span>Les envois apparaîtront ici, avec le nombre de destinataires et d'e-mails.</span>
      </div>
    } @else {
      <div class="table-wrap" [class.is-refreshing]="loading()">
        <table class="rtable">
          <caption class="sr-only">Notifications envoyées</caption>
          <thead>
            <tr>
              <th scope="col">Date</th>
              @if (showEstablishment()) {
                <th scope="col">Établissement</th>
              }
              <th scope="col">Notification</th>
              <th scope="col">Destinataires</th>
              <th scope="col">E-mails</th>
              <th scope="col">Expéditeur</th>
            </tr>
          </thead>
          <tbody>
            @for (c of items(); track c.id) {
              <tr>
                <td data-label="Date">{{ c.created_at | date: 'dd/MM/yyyy HH:mm' }}</td>
                @if (showEstablishment()) {
                  <td data-label="Établissement">{{ c.establishment || '—' }}</td>
                }
                <td data-label="Notification">
                  <details class="history-message">
                    <summary>{{ c.title }}</summary>
                    <p>{{ c.message }}</p>
                  </details>
                </td>
                <td data-label="Destinataires">
                  {{ c.recipients_count }} · {{ c.selection === 'all' ? 'tous les ' + labels[c.audience].toLowerCase() : labels[c.audience].toLowerCase() + ' choisis' }}
                </td>
                <td data-label="E-mails">
                  @if (c.emails_sent === null) {
                    <span class="pill pill-pending">En cours ({{ c.emails_count }})</span>
                  } @else {
                    <span [class]="'pill ' + (c.emails_sent < c.emails_count ? 'pill-danger' : 'pill-active')">{{ c.emails_sent }} / {{ c.emails_count }}</span>
                  }
                </td>
                <td data-label="Expéditeur">{{ c.sender_role === 'super_admin' ? 'ROHAFYA' : c.sender_name || '—' }}</td>
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
