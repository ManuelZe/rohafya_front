import { DOCUMENT } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { SeoService } from './seo.service';
import { SITE_URL } from './site';

describe('SeoService', () => {
  let seo: SeoService;
  let doc: Document;

  const page = {
    title: 'Titre de test',
    description: 'Description de test',
    path: '/intro',
    jsonLd: { '@context': 'https://schema.org', '@type': 'Organization', name: 'A </script> B' },
  };

  beforeEach(() => {
    seo = TestBed.inject(SeoService);
    doc = TestBed.inject(DOCUMENT);
    seo.clear();
  });

  it('pose le titre, la description, l’URL canonique et les balises de partage', () => {
    seo.apply(page);

    expect(doc.title).toBe('Titre de test');
    expect(doc.querySelector('meta[name="description"]')?.getAttribute('content')).toBe('Description de test');
    expect(doc.querySelector('link[rel="canonical"]')?.getAttribute('href')).toBe(`${SITE_URL}/intro`);
    expect(doc.querySelector('meta[property="og:url"]')?.getAttribute('content')).toBe(`${SITE_URL}/intro`);
    expect(doc.querySelector('meta[property="og:image"]')?.getAttribute('content')).toMatch(/^https:\/\//);
    expect(doc.querySelector('meta[name="twitter:card"]')?.getAttribute('content')).toBe('summary_large_image');
  });

  it('insère un seul script JSON-LD, sans pouvoir refermer la balise', () => {
    seo.apply(page);
    seo.apply(page);

    const scripts = doc.querySelectorAll('script[type="application/ld+json"]');
    expect(scripts.length).toBe(1);
    expect(scripts[0].textContent).not.toContain('</script>');
    expect(JSON.parse(scripts[0].textContent ?? '{}').name).toBe('A </script> B');
  });

  it('retire l’URL canonique et le JSON-LD en quittant la page', () => {
    seo.apply(page);
    seo.clear();

    expect(doc.querySelector('link[rel="canonical"]')).toBeNull();
    expect(doc.querySelector('script[type="application/ld+json"]')).toBeNull();
  });
});
