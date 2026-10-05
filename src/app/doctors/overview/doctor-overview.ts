import { Component, PLATFORM_ID, computed, effect, inject, untracked } from '@angular/core';
import { DatePipe, isPlatformBrowser } from '@angular/common';
import { RouterLink } from '@angular/router';
import { PIcon } from '@primeicons/angular/p-icon';
import { AuthService } from '../../connexion/auth-service';
import { PageHeader } from '../../patients/shared/page-header/page-header';
import { StatusTag } from '../../patients/shared/status-tag/status-tag';
import { CommissionsService } from '../commissions/commissions.service';
import { dateValue, sortLinesByDate } from '../commissions/commissions.models';
import { DoctorResultatsService } from '../resultats/doctor-resultats.service';
import { SaasAccountService } from '../../saas/saas-account.service';
import { currentCycle, daysUntilCycleEnd, formatCycle } from '../shared/commission-cycle';
import { KpiTile } from '../../shared/kpi-tile/kpi-tile';
import { PointsPipe, formatPoints } from '../shared/points';
import { StackedMeter } from '../shared/stacked-meter/stacked-meter';

@Component({
  selector: 'app-doctor-overview',
  imports: [DatePipe, RouterLink, PIcon, PageHeader, StatusTag, KpiTile, StackedMeter, PointsPipe],
  templateUrl: './doctor-overview.html',
  styleUrls: ['../shared/doctor-ui.css', './doctor-overview.css'],
})
export class DoctorOverview {
  private readonly authService = inject(AuthService);
  private readonly commissions = inject(CommissionsService);
  private readonly resultats = inject(DoctorResultatsService);
  private readonly saasAccount = inject(SaasAccountService);

  /** Module commissions : établissement GNU Health qui l'a activé (visible par défaut si le profil SaaS est indisponible). */
  readonly commissionsEnabled = this.saasAccount.commissionsEnabled;
  private readonly platformId = inject(PLATFORM_ID);

  readonly cycle = currentCycle();
  readonly cycleLabel = formatCycle(this.cycle);
  readonly daysLeft = daysUntilCycleEnd(this.cycle);

  readonly actual = this.commissions.actualSolde;
  readonly detail = this.commissions.cycleDetail;
  readonly general = this.commissions.generalSolde;
  readonly today = this.commissions.today;
  readonly received = this.resultats.received;

  readonly isRefreshing = computed(
    () => this.actual.loading() || this.detail.loading() || this.general.loading() || this.today.loading() || this.received.loading()
  );

  readonly closingLabel = computed(() => {
    if (this.daysLeft === 0) return "Clôture du cycle aujourd'hui";
    return this.daysLeft === 1 ? 'Clôture du cycle demain' : `Clôture dans ${this.daysLeft} jours`;
  });

  readonly todayValue = computed(() => formatPoints(this.today.data()?.total ?? 0));
  readonly todayHint = computed(() => {
    const count = this.today.data()?.count ?? 0;
    return count === 0 ? 'Aucune commission pour le moment' : `${count} commission${count > 1 ? 's' : ''}`;
  });

  readonly generalValue = computed(() => formatPoints(this.general.data()?.total ?? 0));
  readonly patientsValue = computed(() => String(this.actual.data()?.patients ?? 0));
  readonly receivedValue = computed(() => String(this.received.data()?.length ?? 0));

  readonly topExams = computed(() => {
    const items = this.detail.data()?.topExams ?? [];
    const max = Math.max(1, ...items.map((i) => i.count));
    return items.map((item) => ({ ...item, pct: Math.round((item.count / max) * 100) }));
  });

  readonly todayLines = computed(() => sortLinesByDate(this.today.data()?.lines ?? []).slice(0, 5));

  readonly latestResults = computed(() =>
    [...(this.received.data() ?? [])].sort((a, b) => dateValue(b.sended_at) - dateValue(a.sended_at)).slice(0, 4)
  );

  constructor() {
    effect(() => {
      const doctorId = this.authService.currentUser()?.doctor_id;
      const settled = this.saasAccount.settled();
      if (!isPlatformBrowser(this.platformId) || doctorId === null || doctorId === undefined) return;
      if (!settled) {
        untracked(() => this.saasAccount.load().subscribe());
        return;
      }
      untracked(() => this.load(false));
    });
  }

  refresh(): void {
    this.load(true);
  }

  private load(force: boolean): void {
    const doctorId = this.authService.currentUser()?.doctor_id;
    if (doctorId === null || doctorId === undefined) return;

    if (this.commissionsEnabled()) {
      this.commissions.loadActualSolde(doctorId, force);
      this.commissions.loadToday(doctorId, force);
      this.commissions.loadCycleDetail(doctorId, force);
      this.commissions.loadGeneralSolde(doctorId, force);
    }
    this.resultats.loadReceived(doctorId, force);
  }
}
