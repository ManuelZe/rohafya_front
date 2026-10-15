import { Component, DOCUMENT, DestroyRef, afterNextRender, computed, inject, signal, viewChild } from '@angular/core';
import { Router, RouterLink } from '@angular/router';
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
import {
  AUDIENCES,
  FAQ,
  FOUNDERS,
  NAV_LINKS,
  ONBOARDING,
  PLANS,
  PRICING_NOTES,
  SEGMENTS,
  SOCIAL_LINKS,
  TRIAL_ANCHOR,
  TRUST_POINTS,
  WHATSAPP_DISPLAY,
  WHATSAPP_NUMBER,
} from './intro.content';
import { introSeo } from './intro.seo';
import { I18n, Lang } from '../shared/i18n/i18n';
import { InstallApp } from '../shared/pwa/install-app';
import { LangSwitch } from '../shared/i18n/lang-switch';
import { TranslatePipe } from '../shared/i18n/t.pipe';
import { TrialForm } from './trial-form/trial-form';

/** Hauteur de défilement à partir de laquelle l'en-tête prend son ombre. */
const SCROLLED_AT = 12;

/**
 * Site de présentation, écrit pour les établissements de santé (ce sont eux qui achètent) :
 * constat, solution, mise en service à distance, tarifs, questions, demande d'essai.
 * Français sur /intro, anglais sur /en : deux pages pré-rendues, reliées par hreflang.
 */
@Component({
  selector: 'app-intro',
  imports: [InstallApp, PIcon, NgOptimizedImage, RouterLink, DemoLauncher, RohafyaMark, BeforeAfter, RoleShowcase, HowItWorks, Reveal, LangSwitch, TranslatePipe, TrialForm],
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

  private readonly i18n = inject(I18n);
  private readonly router = inject(Router);

  readonly navLinks = NAV_LINKS;
  readonly trustPoints = TRUST_POINTS;
  readonly faq = FAQ;
  readonly socialLinks = SOCIAL_LINKS;
  readonly audiences = AUDIENCES;
  readonly segments = SEGMENTS;
  readonly onboarding = ONBOARDING;
  readonly plans = PLANS;
  readonly pricingNotes = PRICING_NOTES;
  readonly founders = FOUNDERS;
  readonly trialAnchor = TRIAL_ANCHOR;
  readonly whatsappDisplay = WHATSAPP_DISPLAY;

  /** Adresse de la page dans la langue affichée. */
  readonly home = computed(() => (this.i18n.lang() === 'en' ? '/en' : '/intro'));
  /** Conversation WhatsApp, avec un premier message prérempli dans la langue de la page. */
  readonly whatsappLink = computed(
    () =>
      `https://wa.me/${WHATSAPP_NUMBER}?text=${encodeURIComponent(
        this.i18n.t('Bonjour, je souhaite une démonstration de ROHAFYA pour mon établissement.')
      )}`
  );

  readonly menuOpen = signal(false);
  readonly scrolled = signal(false);
  /** Section affichée à l'écran, mise en avant dans la navigation. */
  readonly activeSection = signal<string | null>(null);

  constructor() {
    const destroyRef = inject(DestroyRef);

    // Balises posées pendant le rendu : elles figurent dans le HTML pré-rendu lu par les moteurs.
    const seo = inject(SeoService);
    seo.apply(introSeo(this.i18n.lang(), (text) => this.i18n.t(text)));
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
  goTo(event: Event | null, id: string): void {
    const target = this.document.getElementById(id);
    if (!target) return;
    event?.preventDefault();
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
    this.menuOpen.set(false);
    this.launcher().openFor(space);
  }

  /** Chaque langue a sa page (/intro, /en) : la langue est retenue puis la page correspondante s'ouvre. */
  async switchLang(lang: Lang): Promise<void> {
    if (lang === this.i18n.lang()) return;
    await this.i18n.use(lang);
    await this.router.navigateByUrl(lang === 'en' ? '/en' : '/intro');
  }
}
