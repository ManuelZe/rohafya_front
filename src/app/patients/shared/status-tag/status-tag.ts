import { Component, computed, input } from '@angular/core';
import { TagModule } from 'primeng/tag';
import { getStatusLabel, getStatusSeverity, StatusKind } from '../status-severity';

@Component({
  selector: 'app-status-tag',
  imports: [TagModule],
  template: `<p-tag [severity]="severity()" [value]="label()" />`,
})
export class StatusTag {
  readonly kind = input.required<StatusKind>();
  readonly status = input.required<string>();

  readonly severity = computed(() => getStatusSeverity(this.kind(), this.status()));
  readonly label = computed(() => getStatusLabel(this.kind(), this.status()));
}
