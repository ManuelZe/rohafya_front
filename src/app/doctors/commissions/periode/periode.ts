import { Component, PLATFORM_ID, computed, effect, inject, input, signal, untracked } from '@angular/core';
import { DatePipe, isPlatformBrowser } from '@angular/common';
import { PIcon } from '@primeicons/angular/p-icon';
import { AuthService } from '../../../connexion/auth-service';
import { PageHeader } from '../../../patients/shared/page-header/page-header';
import { currentCycle, fromDateInput, toDateInput } from '../../shared/commission-cycle';
import { KpiTile } from '../../../shared/kpi-tile/kpi-tile';
import { PointsPipe, formatPoints } from '../../shared/points';
import { sortLinesByDate } from '../commissions.models';
import { CommissionsService } from '../commissions.service';

type PresetId = 'today' | 'week' | 'cycle' | 'month' | 'days30' | 'custom';

interface Preset {
  id: Exclude<PresetId, 'custom'>;
  label: string;
  range: () => { start: Date; end: Date };
}

/** Première date disponible côté API. */
const MIN_DATE = new Date(2025, 9, 21);

function daysAgo(n: number): Date {
  const d = new Date();
  d.setHours(0, 0, 0, 0);
  d.setDate(d.getDate() - n);
  return d;
}

@Component({
  selector: 'app-periode',
  imports: [DatePipe, PIcon, PageHeader, KpiTile, PointsPipe],
  templateUrl: './periode.html',
  styleUrls: ['../../shared/doctor-ui.css', './periode.css'],
})
export class Periode {
  private readonly authService = inject(AuthService);
  private readonly commissions = inject(CommissionsService);
  private readonly platformId = inject(PLATFORM_ID);

  /** ?preset=today (lien « Voir toute la journée » du tableau de bord). */
  readonly preset = input<string>();

  readonly period = this.commissions.period;

  readonly minDate = toDateInput(MIN_DATE);
  readonly maxDate = toDateInput(new Date());

  readonly presets: Preset[] = [
    { id: 'today', label: "Aujourd'hui", range: () => ({ start: daysAgo(0), end: daysAgo(0) }) },
    { id: 'week', label: '7 derniers jours', range: () => ({ start: daysAgo(6), end: daysAgo(0) }) },
    {
      id: 'cycle',
      label: 'Cycle en cours',
      range: () => {
        const c = currentCycle();
        return { start: c.start, end: daysAgo(0) };
      },
    },
    {
      id: 'month',
      label: 'Ce mois-ci',
      range: () => {
        const now = new Date();
        return { start: new Date(now.getFullYear(), now.getMonth(), 1), end: daysAgo(0) };
      },
    },
    { id: 'days30', label: '30 derniers jours', range: () => ({ start: daysAgo(29), end: daysAgo(0) }) },
  ];

  readonly activePreset = signal<PresetId>('cycle');
  readonly startInput = signal('');
  readonly endInput = signal('');
  readonly formError = signal<string | null>(null);
  /** Période effectivement interrogée (affichée au-dessus des résultats). */
  readonly appliedRange = signal<{ start: Date; end: Date } | null>(null);

  readonly lines = computed(() => sortLinesByDate(this.period.data()?.lines ?? []));

  readonly byPatient = computed(() => {
    const map = new Map<string, { patient: string; points: number; count: number }>();
    for (const line of this.lines()) {
      const entry = map.get(line.patient) ?? { patient: line.patient, points: 0, count: 0 };
      entry.points += line.points;
      entry.count += 1;
      map.set(line.patient, entry);
    }
    const list = [...map.values()].sort((a, b) => b.points - a.points);
    const max = Math.max(1, ...list.map((p) => p.points));
    return list.map((p) => ({ ...p, pct: Math.round((p.points / max) * 100) }));
  });

  readonly totalValue = computed(() => formatPoints(this.period.data()?.total ?? 0));
  readonly countValue = computed(() => String(this.lines().length));
  readonly patientsValue = computed(() => String(this.byPatient().length));
  readonly averageValue = computed(() => formatPoints(this.lines().length ? (this.period.data()?.total ?? 0) / this.lines().length : 0));

  constructor() {
    effect(() => {
      const requested = this.preset();
      const doctorId = this.authService.currentUser()?.doctor_id;
      if (!isPlatformBrowser(this.platformId) || doctorId === null || doctorId === undefined) return;
      const preset = this.presets.find((p) => p.id === requested) ?? this.presets.find((p) => p.id === 'cycle')!;
      untracked(() => this.applyPreset(preset));
    });
  }

  applyPreset(preset: Preset): void {
    const { start, end } = preset.range();
    this.activePreset.set(preset.id);
    this.startInput.set(toDateInput(start));
    this.endInput.set(toDateInput(end));
    this.search(start, end);
  }

  onStartInput(event: Event): void {
    this.startInput.set((event.target as HTMLInputElement).value);
    this.activePreset.set('custom');
  }

  onEndInput(event: Event): void {
    this.endInput.set((event.target as HTMLInputElement).value);
    this.activePreset.set('custom');
  }

  submitCustom(event: Event): void {
    event.preventDefault();
    const start = fromDateInput(this.startInput());
    const end = fromDateInput(this.endInput());

    if (!start || !end) {
      this.formError.set('Renseignez une date de début et une date de fin.');
      return;
    }
    if (start > end) {
      this.formError.set('La date de début doit précéder la date de fin.');
      return;
    }
    this.search(start, end);
  }

  private search(start: Date, end: Date): void {
    const doctorId = this.authService.currentUser()?.doctor_id;
    if (doctorId === null || doctorId === undefined) return;
    this.formError.set(null);
    this.appliedRange.set({ start, end });
    this.commissions.loadPeriod(doctorId, start, end);
  }
}
