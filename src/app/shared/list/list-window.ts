import { Signal, computed, linkedSignal } from '@angular/core';

/**
 * Affichage progressif d'une longue liste : `pageSize` éléments, puis « Afficher plus ».
 * Le nombre affiché revient à `pageSize` quand `resetOn` change (filtres, recherche, tri) ;
 * sans `resetOn`, à chaque changement de la liste source.
 */
export class ListWindow<T> {
  private readonly limit;
  readonly visible: Signal<T[]>;
  readonly total: Signal<number>;
  readonly shown: Signal<number>;
  readonly remaining: Signal<number>;

  constructor(
    private readonly source: Signal<T[]>,
    readonly pageSize = 10,
    resetOn?: () => unknown
  ) {
    this.limit = linkedSignal<unknown, number>({ source: resetOn ?? this.source, computation: () => this.pageSize });
    this.visible = computed(() => this.source().slice(0, this.limit()));
    this.total = computed(() => this.source().length);
    this.shown = computed(() => Math.min(this.limit(), this.total()));
    this.remaining = computed(() => this.total() - this.shown());
  }

  showMore(): void {
    this.limit.update((n) => n + this.pageSize);
  }

  showAll(): void {
    this.limit.set(Number.MAX_SAFE_INTEGER);
  }
}
