import { Component, computed, input, model, signal } from '@angular/core';
import { FilterOption, SortOrder } from './list-filters';

import { TranslatePipe } from '../i18n/t.pipe';
let nextId = 0;

/**
 * Barre de recherche et de filtres commune aux listes (examens, requêtes, prescriptions, pré-enregistrements).
 * Sur téléphone, seuls la recherche et le bouton « Filtres » restent visibles ; les filtres se déplient au besoin.
 */
@Component({
  imports: [TranslatePipe],
  selector: 'app-list-toolbar',
  templateUrl: './list-toolbar.html',
  styleUrl: './list-toolbar.css',
})
export class ListToolbar {
  readonly search = model('');
  readonly searchPlaceholder = input('Rechercher…');
  readonly searchLabel = input('Rechercher');

  /** Filtre principal (disponibilité, statut) : boutons à bascule. Vide = filtre absent. */
  readonly statusOptions = input<FilterOption[]>([]);
  readonly status = model('');
  readonly statusLabel = input('Statut');

  /** Établissements présents dans la liste : le filtre n'apparaît qu'à partir de deux. */
  readonly establishments = input<string[]>([]);
  readonly establishment = model('');

  readonly showDates = input(false);
  readonly dateFrom = model('');
  readonly dateTo = model('');

  readonly sort = model<SortOrder>('recent');

  /** Nombre d'éléments après filtres, et nom des éléments au pluriel. */
  readonly count = input(0);
  readonly noun = input('éléments');

  protected readonly id = `list-toolbar-${nextId++}`;
  protected readonly filtersOpen = signal(false);

  protected readonly defaultStatus = computed(() => this.statusOptions()[0]?.value ?? '');
  protected readonly activeFilters = computed(
    () =>
      (this.statusOptions().length && this.status() !== this.defaultStatus() ? 1 : 0) +
      (this.establishment() ? 1 : 0) +
      (this.dateFrom() ? 1 : 0) +
      (this.dateTo() ? 1 : 0) +
      (this.sort() !== 'recent' ? 1 : 0)
  );
  protected readonly hasActive = computed(() => this.activeFilters() > 0 || !!this.search().trim());

  protected value(event: Event): string {
    return (event.target as HTMLInputElement | HTMLSelectElement).value;
  }

  reset(): void {
    this.search.set('');
    this.status.set(this.defaultStatus());
    this.establishment.set('');
    this.dateFrom.set('');
    this.dateTo.set('');
    this.sort.set('recent');
  }
}
