import { Component, computed, input } from '@angular/core';
import { TagModule } from 'primeng/tag';
import { TranslatePipe } from '../../../shared/i18n/t.pipe';
import { getStatusLabel, getStatusSeverity, StatusKind } from '../status-severity';

@Component({
  selector: 'app-status-tag',
  imports: [TagModule, TranslatePipe],
  template: `<p-tag [severity]="severity()" [value]="label() | t" />`,
})
export class StatusTag {
  readonly kind = input.required<StatusKind>();
  readonly status = input.required<string>();

  readonly severity = computed(() => getStatusSeverity(this.kind(), this.status()));
  readonly label = computed(() => getStatusLabel(this.kind(), this.status()));
}
