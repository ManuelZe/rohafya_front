import { Component, PLATFORM_ID, computed, effect, inject, signal, untracked } from '@angular/core';
import { DatePipe, DOCUMENT, isPlatformBrowser } from '@angular/common';
import { PIcon } from '@primeicons/angular/p-icon';
import { AuthService } from '../../../connexion/auth-service';
import { PageHeader } from '../../../patients/shared/page-header/page-header';
import { StatusTag } from '../../../patients/shared/status-tag/status-tag';
import { getStatusLabel } from '../../../patients/shared/status-severity';
import { KpiTile } from '../../../shared/kpi-tile/kpi-tile';
import { PointsPipe, formatPoints } from '../../shared/points';
import { CommissionKind, StatementRow } from '../commissions.models';
import { CommissionsService } from '../commissions.service';

type KindFilter = 'all' | CommissionKind;
type StateFilter = 'all' | 'waiting' | 'invoiced';

const PAGE_SIZE = 20;

@Component({
  selector: 'app-releve',
  imports: [DatePipe, PIcon, PageHeader, StatusTag, KpiTile, PointsPipe],
  templateUrl: './releve.html',
  styleUrls: ['../../shared/doctor-ui.css', './releve.css'],
})
export class Releve {
  private readonly authService = inject(AuthService);
  private readonly commissions = inject(CommissionsService);
  private readonly platformId = inject(PLATFORM_ID);
  private readonly document = inject(DOCUMENT);

  readonly statement = this.commissions.statement;

  readonly kindFilter = signal<KindFilter>('all');
  readonly stateFilter = signal<StateFilter>('all');
  readonly search = signal('');
  readonly visibleCount = signal(PAGE_SIZE);

  readonly kindOptions: { value: KindFilter; label: string }[] = [
    { value: 'all', label: 'Toutes' },
    { value: 'prescription', label: 'Prescriptions' },
    { value: 'realisation', label: 'Réalisations' },
  ];

  readonly stateOptions: { value: StateFilter; label: string }[] = [
    { value: 'all', label: 'Tous les statuts' },
    { value: 'waiting', label: 'En attente' },
    { value: 'invoiced', label: 'Facturées' },
  ];

  readonly rows = computed(() => this.statement.data()?.rows ?? []);

  readonly filtered = computed(() => {
    const kind = this.kindFilter();
    const state = this.stateFilter();
    const term = this.search().trim().toLowerCase();

    return this.rows().filter((row) => {
      if (kind !== 'all' && row.kind !== kind) return false;
      if (state === 'waiting' && row.state !== '') return false;
      if (state === 'invoiced' && (row.state === '' || row.state === 'cancelled')) return false;
      if (term && !`${row.patient} ${row.examen} ${row.produit}`.toLowerCase().includes(term)) return false;
      return true;
    });
  });

  readonly visibleRows = computed(() => this.filtered().slice(0, this.visibleCount()));
  readonly remaining = computed(() => Math.max(0, this.filtered().length - this.visibleCount()));
  readonly filteredTotal = computed(() => this.filtered().reduce((sum, row) => sum + row.points, 0));
  readonly hasActiveFilters = computed(() => this.kindFilter() !== 'all' || this.stateFilter() !== 'all' || !!this.search().trim());

  readonly totalValue = computed(() => formatPoints(this.statement.data()?.total ?? 0));
  readonly prescriptionValue = computed(() => formatPoints(this.statement.data()?.totalPrescription ?? 0));
  readonly realisationValue = computed(() => formatPoints(this.statement.data()?.totalRealisation ?? 0));
  readonly waitingValue = computed(() =>
    formatPoints(this.rows().filter((r) => r.state === '').reduce((sum, r) => sum + r.points, 0))
  );
  readonly waitingCount = computed(() => this.rows().filter((r) => r.state === '').length);

  constructor() {
    effect(() => {
      const doctorId = this.authService.currentUser()?.doctor_id;
      if (isPlatformBrowser(this.platformId) && doctorId !== null && doctorId !== undefined) {
        untracked(() => this.commissions.loadStatement(doctorId));
      }
    });
  }

  refresh(): void {
    const doctorId = this.authService.currentUser()?.doctor_id;
    if (doctorId !== null && doctorId !== undefined) {
      this.commissions.loadStatement(doctorId, true);
    }
  }

  setKind(value: KindFilter): void {
    this.kindFilter.set(value);
    this.visibleCount.set(PAGE_SIZE);
  }

  onStateChange(event: Event): void {
    this.stateFilter.set((event.target as HTMLSelectElement).value as StateFilter);
    this.visibleCount.set(PAGE_SIZE);
  }

  onSearch(event: Event): void {
    this.search.set((event.target as HTMLInputElement).value);
    this.visibleCount.set(PAGE_SIZE);
  }

  resetFilters(): void {
    this.kindFilter.set('all');
    this.stateFilter.set('all');
    this.search.set('');
    this.visibleCount.set(PAGE_SIZE);
  }

  showMore(): void {
    this.visibleCount.update((n) => n + PAGE_SIZE);
  }

  /** Export de la sélection courante (séparateur « ; » pour une ouverture directe dans Excel FR). */
  exportCsv(): void {
    const header = ['Date', 'Type', 'Patient', 'Examen', 'Produit', 'Points', 'Validée', 'Statut'];
    const lines = this.filtered().map((row: StatementRow) => [
      row.date ? new Date(row.date).toLocaleDateString('fr-FR') : '',
      row.kind === 'prescription' ? 'Prescription' : 'Réalisation',
      row.patient,
      row.examen,
      row.produit,
      String(Math.round(row.points)),
      row.validated ? 'Oui' : 'Non',
      getStatusLabel('commission', row.state),
    ]);
    const csv = [header, ...lines].map((cols) => cols.map((c) => `"${c.replace(/"/g, '""')}"`).join(';')).join('\r\n');

    const blob = new Blob(['﻿' + csv], { type: 'text/csv;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const link = this.document.createElement('a');
    link.href = url;
    link.download = `releve-commissions-${new Date().toISOString().slice(0, 10)}.csv`;
    link.click();
    URL.revokeObjectURL(url);
  }
}
