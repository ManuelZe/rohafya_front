import { DOCUMENT, Service, inject } from '@angular/core';
import { Meta, Title } from '@angular/platform-browser';
import { SITE_NAME, SITE_URL, SOCIAL_IMAGE } from './site';

export interface PageSeo {
  /** Titre complet de l'onglet et des résultats de recherche (60 caractères environ). */
  title: string;
  /** Résumé affiché sous le titre dans les résultats de recherche (155 caractères environ). */
  description: string;
  /** Chemin de la page, sans le domaine : sert à l'URL canonique et au partage. */
  path: string;
  /** Données structurées schema.org, insérées en JSON-LD. */
  jsonLd?: object;
}

const JSON_LD_ID = 'seo-json-ld';

/**
 * Balises de référencement d'une page : titre, description, URL canonique, Open Graph, Twitter et JSON-LD.
 * Appelé pendant le rendu : les balises figurent donc dans le HTML pré-rendu que lisent les moteurs.
 */
@Service()
export class SeoService {
  private readonly document = inject(DOCUMENT);
  private readonly title = inject(Title);
  private readonly meta = inject(Meta);

  apply(page: PageSeo): void {
    const url = SITE_URL + page.path;
    const image = SITE_URL + SOCIAL_IMAGE.path;

    this.title.setTitle(page.title);
    this.setName('description', page.description);
    this.setName('robots', 'index, follow, max-image-preview:large');

    this.setProperty('og:type', 'website');
    this.setProperty('og:site_name', SITE_NAME);
    this.setProperty('og:locale', 'fr_FR');
    this.setProperty('og:title', page.title);
    this.setProperty('og:description', page.description);
    this.setProperty('og:url', url);
    this.setProperty('og:image', image);
    this.setProperty('og:image:width', String(SOCIAL_IMAGE.width));
    this.setProperty('og:image:height', String(SOCIAL_IMAGE.height));
    this.setProperty('og:image:alt', SOCIAL_IMAGE.alt);

    this.setName('twitter:card', 'summary_large_image');
    this.setName('twitter:title', page.title);
    this.setName('twitter:description', page.description);
    this.setName('twitter:image', image);
    this.setName('twitter:image:alt', SOCIAL_IMAGE.alt);

    this.setCanonical(url);
    this.setJsonLd(page.jsonLd);
  }

  /** Retire ce qui ne vaut que pour la page quittée (URL canonique, données structurées). */
  clear(): void {
    this.document.head.querySelector('link[rel="canonical"]')?.remove();
    this.document.getElementById(JSON_LD_ID)?.remove();
  }

  private setName(name: string, content: string): void {
    this.meta.updateTag({ name, content });
  }

  private setProperty(property: string, content: string): void {
    this.meta.updateTag({ property, content });
  }

  private setCanonical(url: string): void {
    let link = this.document.head.querySelector<HTMLLinkElement>('link[rel="canonical"]');
    if (!link) {
      link = this.document.createElement('link');
      link.setAttribute('rel', 'canonical');
      this.document.head.appendChild(link);
    }
    link.setAttribute('href', url);
  }

  /** Le script pré-rendu est réutilisé à l'hydratation : jamais de doublon dans <head>. */
  private setJsonLd(data: object | undefined): void {
    const existing = this.document.getElementById(JSON_LD_ID);
    if (!data) {
      existing?.remove();
      return;
    }
    const script = existing ?? this.document.createElement('script');
    script.id = JSON_LD_ID;
    script.setAttribute('type', 'application/ld+json');
    // « < » échappé : le contenu ne peut pas refermer la balise <script>.
    script.textContent = JSON.stringify(data).replace(/</g, '\\u003c');
    if (!existing) this.document.head.appendChild(script);
  }
}
