import { Component, DestroyRef, ElementRef, afterNextRender, inject, signal } from '@angular/core';
import { PIcon } from '@primeicons/angular/p-icon';
import { STEPS } from '../intro.content';

/** Durée d'affichage de chaque étape en lecture automatique. */
const STEP_MS = 4500;

/**
 * Parcours du patient en quatre étapes, illustré par un téléphone.
 * La lecture automatique ne tourne que si la section est à l'écran ; elle s'arrête dès que
 * l'utilisateur choisit une étape et peut être mise en pause (WCAG 2.2.2).
 */
@Component({
  selector: 'app-how-it-works',
  imports: [PIcon],
  templateUrl: './how-it-works.html',
  styleUrl: './how-it-works.css',
  host: { '[style.--step-ms]': 'stepMs' },
})
export class HowItWorks {
  readonly steps = STEPS;
  readonly current = signal(0);
  /** Faux tant que la page n'est pas affichée dans un navigateur qui accepte les animations. */
  readonly canPlay = signal(false);
  readonly playing = signal(false);
  readonly code = ['4', '8', '2', '9', '1', '7'];
  /** Durée de la barre de progression de l'étape, alignée sur la minuterie. */
  readonly stepMs = `${STEP_MS}ms`;

  private visible = false;

  constructor() {
    const host = inject<ElementRef<HTMLElement>>(ElementRef).nativeElement;
    const destroyRef = inject(DestroyRef);

    afterNextRender(() => {
      const view = host.ownerDocument.defaultView;
      if (!view || !('IntersectionObserver' in view)) return;
      if (view.matchMedia('(prefers-reduced-motion: reduce)').matches) return;

      this.canPlay.set(true);
      this.playing.set(true);

      const observer = new IntersectionObserver(([entry]) => (this.visible = entry.isIntersecting), { threshold: 0.35 });
      observer.observe(host);
      const timer = view.setInterval(() => {
        if (this.playing() && this.visible) this.current.update((i) => (i + 1) % this.steps.length);
      }, STEP_MS);

      destroyRef.onDestroy(() => {
        observer.disconnect();
        view.clearInterval(timer);
      });
    });
  }

  choose(index: number): void {
    this.playing.set(false);
    this.current.set(index);
  }

  togglePlay(): void {
    this.playing.update((p) => !p);
  }
}
