import { Component, ElementRef, computed, output, signal, viewChildren } from '@angular/core';
import { PIcon } from '@primeicons/angular/p-icon';
import { DemoSpace } from '../../demo/demo-token';
import { ROLES } from '../intro.content';

import { TranslatePipe } from '../../shared/i18n/t.pipe';
/**
 * Onglets Votre établissement / Vos patients / Vos médecins prescripteurs : ce que chacun y gagne,
 * et ce que l'établissement en retire, avec un aperçu de l'écran.
 */
@Component({
  selector: 'app-role-showcase',
  imports: [TranslatePipe, PIcon],
  templateUrl: './role-showcase.html',
  styleUrls: ['../intro-buttons.css', './role-showcase.css'],
})
export class RoleShowcase {
  readonly roles = ROLES;
  readonly selected = signal(0);
  readonly role = computed(() => this.roles[this.selected()]);

  /** Demande l'ouverture de la démo sur l'espace affiché. */
  readonly tryDemo = output<DemoSpace>();
  /** Demande d'essai (onglet établissement) : le parent fait défiler jusqu'au formulaire. */
  readonly askTrial = output<void>();

  private readonly tabs = viewChildren<ElementRef<HTMLButtonElement>>('tab');

  select(index: number): void {
    this.selected.set(index);
  }

  /** Navigation au clavier du motif ARIA « tabs » : flèches, Début, Fin. */
  onKeydown(event: KeyboardEvent): void {
    const last = this.roles.length - 1;
    const current = this.selected();
    const next =
      event.key === 'ArrowRight' ? (current === last ? 0 : current + 1)
      : event.key === 'ArrowLeft' ? (current === 0 ? last : current - 1)
      : event.key === 'Home' ? 0
      : event.key === 'End' ? last
      : null;
    if (next === null) return;

    event.preventDefault();
    this.selected.set(next);
    this.tabs()[next]?.nativeElement.focus();
  }
}
