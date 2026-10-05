import { Component, PLATFORM_ID, computed, effect, inject, signal, untracked } from '@angular/core';
import { DatePipe, isPlatformBrowser } from '@angular/common';
import { PIcon } from '@primeicons/angular/p-icon';
import { AuthService } from '../../../connexion/auth-service';
import { PageHeader } from '../../../patients/shared/page-header/page-header';
import { StatusTag } from '../../../patients/shared/status-tag/status-tag';
import {
  FIRST_COMMISSION_MONTH_2025,
  FIRST_COMMISSION_YEAR,
  MONTH_LABELS,
  MONTH_SHORT_LABELS,
  currentCycle,
  cycleForMonth,
  formatCycle,
} from '../../shared/commission-cycle';
import { KpiTile } from '../../../shared/kpi-tile/kpi-tile';
import { PointsPipe, formatPoints } from '../../shared/points';
import { StackedMeter } from '../../shared/stacked-meter/stacked-meter';
import { InvoiceFilter, sortLinesByDate } from '../commissions.models';
import { CommissionsService } from '../commissions.service';

@Component({
  selector: 'app-mensuel',
  imports: [DatePipe, PIcon, PageHeader, StatusTag, KpiTile, StackedMeter, PointsPipe],
  templateUrl: './mensuel.html',
  styleUrls: ['../../shared/doctor-ui.css', './mensuel.css'],
})
export class Mensuel {
  private readonly authService = inject(AuthService);
  private readonly commissions = inject(CommissionsService);
  private readonly platformId = inject(PLATFORM_ID);

  readonly month = this.commissions.month;

  /** L'API calcule toujours sur l'année civile en cours. */
  private readonly cycle = currentCycle();
  readonly year = new Date().getFullYear();
  private readonly lastMonth = this.cycle.year === this.year ? this.cycle.month : 12;
  private readonly firstMonth = this.year === FIRST_COMMISSION_YEAR ? FIRST_COMMISSION_MONTH_2025 : 1;

  readonly months = Array.from({ length: 12 }, (_, i) => i + 1).map((m) => ({
    value: m,
    short: MONTH_SHORT_LABELS[m - 1],
    label: MONTH_LABELS[m - 1],
    available: m >= this.firstMonth && m <= this.lastMonth,
    current: m === this.cycle.month && this.cycle.year === this.year,
  }));

  readonly selectedMonth = signal(this.lastMonth);
  readonly type = signal<InvoiceFilter>('invoiced');

  readonly monthLabel = computed(() => `${MONTH_LABELS[this.selectedMonth() - 1]} ${this.year}`);
  readonly periodLabel = computed(() => formatCycle(cycleForMonth(this.year, this.selectedMonth())));
  readonly isCurrentCycle = computed(() => this.selectedMonth() === this.cycle.month && this.cycle.year === this.year);

  readonly canPrev = computed(() => this.selectedMonth() > this.firstMonth);
  readonly canNext = computed(() => this.selectedMonth() < this.lastMonth);

  readonly lines = computed(() => sortLinesByDate(this.month.data()?.lines ?? []));

  readonly totalValue = computed(() => formatPoints(this.month.data()?.total ?? 0));
  readonly commissionsValue = computed(() => String(this.month.data()?.commissions ?? 0));
  readonly patientsValue = computed(() => String(this.month.data()?.patients ?? 0));

  constructor() {
    effect(() => {
      const doctorId = this.authService.currentUser()?.doctor_id;
      const month = this.selectedMonth();
      const type = this.type();
      if (isPlatformBrowser(this.platformId) && doctorId !== null && doctorId !== undefined) {
        untracked(() => this.commissions.loadMonth(doctorId, month, type));
      }
    });
  }

  selectMonth(month: number): void {
    this.selectedMonth.set(month);
  }

  shiftMonth(delta: number): void {
    const next = this.selectedMonth() + delta;
    if (next >= this.firstMonth && next <= this.lastMonth) {
      this.selectedMonth.set(next);
    }
  }

  setType(type: InvoiceFilter): void {
    this.type.set(type);
  }

  refresh(): void {
    const doctorId = this.authService.currentUser()?.doctor_id;
    if (doctorId !== null && doctorId !== undefined) {
      this.commissions.loadMonth(doctorId, this.selectedMonth(), this.type(), true);
    }
  }
}
