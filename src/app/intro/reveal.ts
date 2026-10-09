import { DestroyRef, Directive, ElementRef, afterNextRender, inject, input } from '@angular/core';

/**
 * Fait apparaître l'élément en fondu quand il entre dans l'écran.
 * Rien n'est masqué au rendu serveur ni pour un élément déjà visible au chargement
 * (pas de clignotement à l'hydratation), ni quand l'utilisateur a demandé moins d'animations.
 */
@Directive({
  selector: '[appReveal]',
})
export class Reveal {
  /** Décalage de l'animation en millisecondes, pour enchaîner les éléments d'une grille. */
  readonly appReveal = input<number | ''>('');

  private readonly el = inject<ElementRef<HTMLElement>>(ElementRef);

  constructor() {
    const destroyRef = inject(DestroyRef);

    afterNextRender(() => {
      const node = this.el.nativeElement;
      const view = node.ownerDocument.defaultView;
      if (!view || !('IntersectionObserver' in view)) return;
      if (view.matchMedia('(prefers-reduced-motion: reduce)').matches) return;
      if (node.getBoundingClientRect().top < view.innerHeight) return;

      const delay = this.appReveal();
      if (delay) node.style.setProperty('--reveal-delay', `${delay}ms`);
      node.classList.add('reveal');

      const observer = new IntersectionObserver(
        (entries) => {
          if (!entries.some((e) => e.isIntersecting)) return;
          node.classList.add('reveal--visible');
          observer.disconnect();
        },
        { rootMargin: '0px 0px -10% 0px' },
      );
      observer.observe(node);
      destroyRef.onDestroy(() => observer.disconnect());
    });
  }
}
