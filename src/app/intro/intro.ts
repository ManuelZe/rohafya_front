import { Component, DOCUMENT, DestroyRef, afterNextRender, inject, signal, viewChild } from '@angular/core';
import { RouterLink } from '@angular/router';
import { NgOptimizedImage } from '@angular/common';
import { PIcon } from '@primeicons/angular/p-icon';
import { DemoLauncher } from '../demo/demo-launcher/demo-launcher';
import { DemoSpace } from '../demo/demo-token';
import { RohafyaMark } from '../shared/rohafya-mark/rohafya-mark';
import { BeforeAfter } from './before-after/before-after';
import { HowItWorks } from './how-it-works/how-it-works';
import { RoleShowcase } from './role-showcase/role-showcase';
import { Reveal } from './reveal';
import { SeoService } from '../shared/seo/seo.service';
import { AuthService } from '../connexion/auth-service';
import { FAQ, NAV_LINKS, TRUST_POINTS } from './intro.content';
import { INTRO_SEO } from './intro.seo';

/** Hauteur de défilement à partir de laquelle l'en-tête prend son ombre. */
const SCROLLED_AT = 12;

/** Page d'accueil publique : présentation de ROHAFYA pour les patients, les médecins et les établissements. */
@Component({
  selector: 'app-intro',
  imports: [PIcon, NgOptimizedImage, RouterLink, DemoLauncher, RohafyaMark, BeforeAfter, RoleShowcase, HowItWorks, Reveal],
  templateUrl: './intro.html',
  styleUrls: ['./intro-buttons.css', './intro.css'],
  host: {
    '(window:scroll)': 'onScroll()',
    '(document:keydown.escape)': 'menuOpen.set(false)',
  },
})
export class Intro {
  private readonly document = inject(DOCUMENT);
  private readonly launcher = viewChild.required(DemoLauncher);
  /** Lien « Connexion » : l'espace de l'utilisateur connecté, sinon la page de connexion. */
  protected readonly auth = inject(AuthService);

  readonly navLinks = NAV_LINKS;
  readonly trustPoints = TRUST_POINTS;
  readonly faq = FAQ;
  readonly audiences = [
    { icon: 'filter', label: 'Laboratoires' },
    { icon: 'image', label: 'Centres d’imagerie' },
    { icon: 'building', label: 'Cliniques et hôpitaux' },
    { icon: 'id-card', label: 'Médecins prescripteurs' },
    { icon: 'user', label: 'Patients' },
  ];

  readonly menuOpen = signal(false);
  readonly scrolled = signal(false);
  /** Section affichée à l'écran, mise en avant dans la navigation. */
  readonly activeSection = signal<string | null>(null);

  constructor() {
    const destroyRef = inject(DestroyRef);

    // Balises posées pendant le rendu : elles figurent dans le HTML pré-rendu lu par les moteurs.
    const seo = inject(SeoService);
    seo.apply(INTRO_SEO);
    destroyRef.onDestroy(() => seo.clear());

    afterNextRender(() => {
      this.onScroll();
      const view = this.document.defaultView;
      if (!view || !('IntersectionObserver' in view)) return;

      // Une section est « active » quand elle traverse la bande centrale de l'écran.
      const observer = new IntersectionObserver(
        (entries) => {
          for (const entry of entries) {
            if (entry.isIntersecting) this.activeSection.set(entry.target.id);
          }
        },
        { rootMargin: '-45% 0px -50% 0px' },
      );
      for (const link of this.navLinks) {
        const section = this.document.getElementById(link.id);
        if (section) observer.observe(section);
      }
      destroyRef.onDestroy(() => observer.disconnect());
    });
  }

  onScroll(): void {
    const y = this.document.defaultView?.scrollY ?? 0;
    this.scrolled.set(y > SCROLLED_AT);
    if (y < SCROLLED_AT) this.activeSection.set(null);
  }

  toggleMenu(): void {
    this.menuOpen.update((open) => !open);
  }

  /**
   * Fait défiler jusqu'à la section sans recharger la page (le lien reste valide sans JavaScript),
   * puis place le focus sur son titre pour les lecteurs d'écran et la navigation au clavier.
   */
  goTo(event: Event, id: string): void {
    const target = this.document.getElementById(id);
    if (!target) return;
    event.preventDefault();
    this.menuOpen.set(false);

    const reduce = this.document.defaultView?.matchMedia('(prefers-reduced-motion: reduce)').matches;
    target.scrollIntoView({ behavior: reduce ? 'auto' : 'smooth', block: 'start' });
    const focusable = target.hasAttribute('tabindex') ? target : target.querySelector<HTMLElement>('h2[tabindex]');
    focusable?.focus({ preventScroll: true });
    this.activeSection.set(id);
  }

  openDemo(): void {
    this.menuOpen.set(false);
    this.launcher().open();
  }

  tryDemo(space: DemoSpace): void {
    this.launcher().openFor(space);
  }
}
