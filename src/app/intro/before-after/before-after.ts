import { Component, signal } from '@angular/core';
import { PIcon } from '@primeicons/angular/p-icon';
import { COMPARE_ROWS } from '../intro.content';
import { Reveal } from '../reveal';

type Mode = 'before' | 'after';

/** Comparatif « Avant / Avec ROHAFYA » : un sélecteur bascule les mêmes lignes d'un état à l'autre. */
@Component({
  selector: 'app-before-after',
  imports: [PIcon, Reveal],
  template: `
    <fieldset class="switch">
      <legend class="sr-only">Afficher la situation</legend>
      <label class="switch__option" [class.switch__option--on]="mode() === 'before'">
        <input type="radio" name="compare-mode" value="before" [checked]="mode() === 'before'" (change)="mode.set('before')" />
        Sans ROHAFYA
      </label>
      <label class="switch__option" [class.switch__option--on]="mode() === 'after'">
        <input type="radio" name="compare-mode" value="after" [checked]="mode() === 'after'" (change)="mode.set('after')" />
        Avec ROHAFYA
      </label>
      <span class="switch__thumb" [class.switch__thumb--after]="mode() === 'after'" aria-hidden="true"></span>
    </fieldset>

    <ul class="rows" [class.rows--after]="mode() === 'after'">
      @for (row of rows; track row.icon; let i = $index) {
        <li class="row" [appReveal]="i * 80">
          <span class="row__icon" aria-hidden="true">
            <svg [pIcon]="mode() === 'after' ? 'check-circle' : row.icon" [size]="20"></svg>
          </span>
          <p class="row__text">{{ mode() === 'after' ? row.after : row.before }}</p>
        </li>
      }
    </ul>
  `,
  styles: `
    :host {
      display: block;
    }

    .sr-only {
      position: absolute;
      width: 1px;
      height: 1px;
      overflow: hidden;
      clip: rect(0 0 0 0);
      white-space: nowrap;
    }

    .switch {
      position: relative;
      display: inline-grid;
      grid-template-columns: 1fr 1fr;
      margin: 0 0 1.75rem;
      padding: 4px;
      border: 1px solid var(--rohafya-navy-200);
      border-radius: 999px;
      background: var(--color-surface);
      box-shadow: var(--shadow-sm);
    }

    .switch__option {
      position: relative;
      z-index: 1;
      padding: 0.6rem 1.4rem;
      border-radius: 999px;
      font-weight: 600;
      font-size: 0.95rem;
      text-align: center;
      color: var(--rohafya-navy);
      cursor: pointer;
      transition: color 0.25s;
    }

    .switch__option input {
      position: absolute;
      opacity: 0;
      inset: 0;
      margin: 0;
      cursor: pointer;
    }

    .switch__option--on {
      color: #fff;
    }

    .switch__option:has(input:focus-visible) {
      outline: 2px solid var(--color-primary);
      outline-offset: 3px;
    }

    .switch__thumb {
      position: absolute;
      top: 4px;
      bottom: 4px;
      left: 4px;
      width: calc(50% - 4px);
      border-radius: 999px;
      background: var(--rohafya-navy);
      transition:
        transform 0.35s cubic-bezier(0.22, 1, 0.36, 1),
        background 0.35s;
    }

    .switch__thumb--after {
      transform: translateX(100%);
      background: var(--color-primary);
    }

    .rows {
      list-style: none;
      margin: 0;
      padding: 0;
      display: grid;
      grid-template-columns: repeat(2, minmax(0, 1fr));
      gap: 1rem;
    }

    .row {
      display: flex;
      gap: 0.9rem;
      align-items: flex-start;
      padding: 1.15rem 1.25rem;
      border-radius: var(--radius-lg);
      background: var(--color-surface);
      border: 1px solid #f1d6d6;
      box-shadow: var(--shadow-sm);
      transition:
        border-color 0.35s,
        background 0.35s;
    }

    .row__icon {
      flex: none;
      display: grid;
      place-items: center;
      width: 2.5rem;
      height: 2.5rem;
      border-radius: 12px;
      color: #b42318;
      background: #fef3f2;
      transition:
        color 0.35s,
        background 0.35s;
    }

    .row__text {
      margin: 0;
      line-height: 1.5;
      color: var(--color-text);
    }

    .rows--after .row {
      border-color: var(--rohafya-green-200);
      background: linear-gradient(180deg, #fff 0%, var(--rohafya-green-50) 100%);
    }

    .rows--after .row__icon {
      color: var(--color-primary);
      background: var(--rohafya-green-100);
    }

    @media (max-width: 720px) {
      .rows {
        grid-template-columns: 1fr;
      }

      .switch {
        display: grid;
        width: 100%;
      }

      .switch__option {
        padding: 0.6rem 0.75rem;
      }
    }

    @media (prefers-reduced-motion: reduce) {
      .switch__thumb,
      .row,
      .row__icon {
        transition: none;
      }
    }
  `,
})
export class BeforeAfter {
  readonly rows = COMPARE_ROWS;
  readonly mode = signal<Mode>('before');
}
