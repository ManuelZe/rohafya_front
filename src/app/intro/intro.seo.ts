import { PageSeo } from '../shared/seo/seo.service';
import { SITE_NAME, SITE_URL } from '../shared/seo/site';
import { FAQ, SOCIAL_LINKS } from './intro.content';

const ORGANIZATION_ID = `${SITE_URL}/#organization`;

/**
 * Référencement de la page d'accueil. Les données structurées reprennent le contenu affiché
 * (questions fréquentes) : Google exige qu'elles correspondent à ce que voit le visiteur.
 */
export const INTRO_SEO: PageSeo = {
  title: 'ROHAFYA — Vos résultats médicaux sur votre téléphone',
  description:
    'Analyses, imagerie et factures sur votre téléphone, sans revenir. ROHAFYA relie patients, médecins et établissements de santé au Cameroun.',
  path: '/intro',
  jsonLd: {
    '@context': 'https://schema.org',
    '@graph': [
      {
        '@type': 'Organization',
        '@id': ORGANIZATION_ID,
        name: SITE_NAME,
        url: SITE_URL,
        logo: `${SITE_URL}/rohafya-logo.png?v=2`,
        slogan: 'Votre santé, connectée',
        areaServed: { '@type': 'Country', name: 'Cameroun' },
        sameAs: SOCIAL_LINKS.map((link) => link.url),
      },
      {
        '@type': 'WebSite',
        '@id': `${SITE_URL}/#website`,
        url: SITE_URL,
        name: SITE_NAME,
        inLanguage: 'fr',
        publisher: { '@id': ORGANIZATION_ID },
      },
      {
        '@type': 'FAQPage',
        '@id': `${SITE_URL}/intro#faq`,
        inLanguage: 'fr',
        mainEntity: FAQ.map((item) => ({
          '@type': 'Question',
          name: item.question,
          acceptedAnswer: { '@type': 'Answer', text: item.answer },
        })),
      },
    ],
  },
};
