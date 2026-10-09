import { Component, ElementRef, computed, inject, output, signal, viewChildren } from '@angular/core';
import { RouterLink } from '@angular/router';
import { PIcon } from '@primeicons/angular/p-icon';
import { AuthService } from '../../connexion/auth-service';
import { DemoSpace } from '../../demo/demo-token';
import { ROLES } from '../intro.content';

/** Onglets Patients / Médecins / Établissements : fonctionnalités de chaque espace et aperçu de son écran. */
@Component({
  selector: 'app-role-showcase',
  imports: [PIcon, RouterLink],
  templateUrl: './role-showcase.html',
  styleUrls: ['../intro-buttons.css', './role-showcase.css'],
})
export class RoleShowcase {
  readonly roles = ROLES;
  readonly selected = signal(0);
  readonly role = computed(() => this.roles[this.selected()]);

  private readonly auth = inject(AuthService);

  /** Bouton principal de l'onglet : un utilisateur déjà connecté va directement dans son espace. */
  readonly cta = computed(() => {
    const cta = this.role().cta;
    if (cta.link !== '/connexion' || this.auth.loginLink() === '/connexion') return cta;
    return { label: 'Accéder à mon espace', link: this.auth.loginLink() };
  });

  /** Demande l'ouverture de la démo sur l'espace affiché. */
  readonly tryDemo = output<DemoSpace>();

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
