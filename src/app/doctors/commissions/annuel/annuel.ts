import { Component, PLATFORM_ID, computed, effect, inject, signal, untracked } from '@angular/core';
import { isPlatformBrowser } from '@angular/common';
import { PIcon } from '@primeicons/angular/p-icon';
import { AuthService } from '../../../connexion/auth-service';
import { PageHeader } from '../../../patients/shared/page-header/page-header';
import { FIRST_COMMISSION_YEAR, MONTH_LABELS, currentCycle } from '../../shared/commission-cycle';
import { KpiTile } from '../../../shared/kpi-tile/kpi-tile';
import { PointsPipe, formatPoints } from '../../shared/points';
import { InvoiceFilter } from '../commissions.models';
import { CommissionsService } from '../commissions.service';
import { YearChart } from './year-chart';

type ViewMode = 'chart' | 'table';

@Component({
  selector: 'app-annuel',
  imports: [PIcon, PageHeader, KpiTile, PointsPipe, YearChart],
  templateUrl: './annuel.html',
  styleUrls: ['../../shared/doctor-ui.css', './annuel.css'],
})
export class Annuel {
  private readonly authService = inject(AuthService);
  private readonly commissions = inject(CommissionsService);
  private readonly platformId = inject(PLATFORM_ID);

  readonly yearResource = this.commissions.year;

  private readonly cycle = currentCycle();
  private readonly currentYear = new Date().getFullYear();

  readonly years = Array.from({ length: Math.max(1, this.currentYear - FIRST_COMMISSION_YEAR + 1) }, (_, i) => FIRST_COMMISSION_YEAR + i).reverse();

  readonly selectedYear = signal(this.currentYear);
  readonly type = signal<InvoiceFilter>('invoiced');
  readonly view = signal<ViewMode>('chart');

  /** Les mois futurs de l'année en cours sont masqués (toujours à zéro). */
  readonly months = computed(() => {
    const data = this.yearResource.data()?.months ?? [];
    if (this.selectedYear() !== this.currentYear) return data;
    const last = this.cycle.year === this.currentYear ? this.cycle.month : 12;
    return data.filter((m) => m.month <= last);
  });

  readonly total = computed(() => this.months().reduce((sum, m) => sum + m.prescription + m.realisation, 0));

  readonly best = computed(() => {
    const sorted = [...this.months()].sort((a, b) => b.prescription + b.realisation - (a.prescription + a.realisation));
    const top = sorted[0];
    return top && top.prescription + top.realisation > 0 ? top : null;
  });

  readonly totalValue = computed(() => formatPoints(this.total()));
  readonly averageValue = computed(() => formatPoints(this.months().length ? this.total() / this.months().length : 0));
  readonly bestValue = computed(() => {
    const best = this.best();
    return best ? MONTH_LABELS[best.month - 1] : '—';
  });
  readonly bestHint = computed(() => {
    const best = this.best();
    return best ? formatPoints(best.prescription + best.realisation) : 'Aucune commission';
  });
  readonly countValue = computed(() => String(this.months().reduce((sum, m) => sum + m.count, 0)));

  readonly isEmpty = computed(() => this.total() === 0);

  readonly monthLabel = (month: number) => MONTH_LABELS[month - 1];

  constructor() {
    effect(() => {
      const doctorId = this.authService.currentUser()?.doctor_id;
      const year = this.selectedYear();
      const type = this.type();
      if (isPlatformBrowser(this.platformId) && doctorId !== null && doctorId !== undefined) {
        untracked(() => this.commissions.loadYear(doctorId, year, type));
      }
    });
  }

  onYearChange(event: Event): void {
    this.selectedYear.set(Number((event.target as HTMLSelectElement).value));
  }

  setType(type: InvoiceFilter): void {
    this.type.set(type);
  }

  setView(view: ViewMode): void {
    this.view.set(view);
  }

  refresh(): void {
    const doctorId = this.authService.currentUser()?.doctor_id;
    if (doctorId !== null && doctorId !== undefined) {
      this.commissions.loadYear(doctorId, this.selectedYear(), this.type(), true);
    }
  }
}
