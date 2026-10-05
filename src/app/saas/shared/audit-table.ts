import { Component, input } from '@angular/core';
import { DatePipe } from '@angular/common';
import { AuditEntry, auditLabel } from '../saas.models';

/** Tableau du journal d'audit (cartes sur mobile). */
@Component({
  selector: 'app-audit-table',
  imports: [DatePipe],
  styleUrls: ['../../doctors/shared/doctor-ui.css', './console-ui.css'],
  template: `
    <div class="table-wrap">
      <table class="rtable">
        <caption class="sr-only">Journal d'audit</caption>
        <thead>
          <tr>
            <th scope="col">Date</th>
            <th scope="col">Action</th>
            @if (showEstablishment()) {
              <th scope="col">Établissement</th>
            }
            <th scope="col">Objet</th>
            <th scope="col">Par</th>
          </tr>
        </thead>
        <tbody>
          @for (entry of entries(); track entry.id) {
            <tr>
              <td data-label="Date">{{ entry.created_at | date: 'dd/MM/yyyy HH:mm' }}</td>
              <td data-label="Action" class="strong">{{ label(entry.action) }}</td>
              @if (showEstablishment()) {
                <td data-label="Établissement">{{ entry.establishment || '—' }}</td>
              }
              <td data-label="Objet" class="mono">{{ entry.target || '—' }}</td>
              <td data-label="Par">{{ entry.user_name || entry.user_email || (entry.action.startsWith('ingest') ? 'Logiciel de l’établissement' : '—') }}</td>
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
