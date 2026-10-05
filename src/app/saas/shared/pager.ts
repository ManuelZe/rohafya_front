import { Component, computed, input, output } from '@angular/core';
import { PIcon } from '@primeicons/angular/p-icon';

/** Pagination simple « précédent / suivant » avec le rang des éléments affichés. */
@Component({
  selector: 'app-pager',
  imports: [PIcon],
  template: `
    @if (total() > pageSize()) {
      <nav class="pager" aria-label="Pagination">
        <button type="button" class="pager-btn" (click)="pageChange.emit(page() - 1)" [disabled]="page() <= 1">
          <svg [pIcon]="'chevron-left'" [size]="14" aria-hidden="true"></svg>
          <span>Précédent</span>
        </button>
        <span class="pager-info" aria-live="polite">{{ from() }}–{{ to() }} sur {{ total() }}</span>
        <button type="button" class="pager-btn" (click)="pageChange.emit(page() + 1)" [disabled]="page() >= pages()">
          <span>Suivant</span>
          <svg [pIcon]="'chevron-right'" [size]="14" aria-hidden="true"></svg>
        </button>
      </nav>
    }
  `,
  styles: `
    .pager {
      display: flex;
      flex-wrap: wrap;
      align-items: center;
      justify-content: space-between;
      gap: 0.75rem;
      padding-top: 1rem;
    }
    .pager-btn {
      display: inline-flex;
      align-items: center;
      gap: 0.4rem;
      min-height: 36px;
      padding: 0.4rem 0.85rem;
      border: 1px solid #e2e8f0;
      border-radius: 8px;
      background: #fff;
      font: inherit;
      font-size: 0.82rem;
      font-weight: 600;
      color: #1f2937;
      cursor: pointer;
    }
    .pager-btn:hover:not(:disabled) {
      background: #f4f6fa;
    }
    .pager-btn:disabled {
      opacity: 0.5;
      cursor: not-allowed;
    }
    .pager-btn:focus-visible {
      outline: 3px solid #93b4f0;
      outline-offset: 2px;
    }
    .pager-info {
      font-size: 0.82rem;
      color: #545d6b;
    }
  `,
})
export class Pager {
  readonly page = input.required<number>();
  readonly pageSize = input.required<number>();
  readonly total = input.required<number>();
  readonly pageChange = output<number>();

  readonly pages = computed(() => Math.max(1, Math.ceil(this.total() / this.pageSize())));
  readonly from = computed(() => (this.page() - 1) * this.pageSize() + 1);
  readonly to = computed(() => Math.min(this.total(), this.page() * this.pageSize()));
}
