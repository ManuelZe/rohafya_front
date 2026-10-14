import { Component, input } from '@angular/core';
import { DatePipe } from '@angular/common';
import { AuditEntry, auditLabel } from '../saas.models';

import { TranslatePipe } from '../../shared/i18n/t.pipe';
/** Tableau du journal d'audit (cartes sur mobile). */
@Component({
  selector: 'app-audit-table',
  imports: [TranslatePipe, DatePipe],
  styleUrls: ['../../doctors/shared/doctor-ui.css', './console-ui.css'],
  template: `
    <div class="table-wrap">
      <table class="rtable">
        <caption class="sr-only">{{ 'Journal d\\'audit' | t }}</caption>
        <thead>
          <tr>
            <th scope="col">{{ 'Date' | t }}</th>
            <th scope="col">{{ 'Action' | t }}</th>
            @if (showEstablishment()) {
              <th scope="col">{{ 'Établissement' | t }}</th>
            }
            <th scope="col">{{ 'Objet' | t }}</th>
            <th scope="col">{{ 'Par' | t }}</th>
          </tr>
        </thead>
        <tbody>
          @for (entry of entries(); track entry.id) {
            <tr>
              <td [attr.data-label]="'Date' | t">{{ entry.created_at | date: 'dd/MM/yyyy HH:mm' }}</td>
              <td [attr.data-label]="'Action' | t" class="strong">{{ label(entry.action) | t }}</td>
              @if (showEstablishment()) {
                <td [attr.data-label]="'Établissement' | t">{{ entry.establishment || '—' }}</td>
              }
              <td [attr.data-label]="'Objet' | t" class="mono">{{ entry.target || '—' }}</td>
              <td [attr.data-label]="'Par' | t">{{ (entry.user_name || entry.user_email || (entry.action.startsWith('ingest') ? 'Logiciel de l’établissement' : '—')) | t }}</td>
            </tr>
          }
        </tbody>
      </table>
    </div>
  `,
})
export class AuditTable {
  readonly entries = input.required<AuditEntry[]>();
  readonly showEstablishment = input(false);
  readonly label = auditLabel;
}
