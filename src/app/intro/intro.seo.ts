import { PageSeo } from '../shared/seo/seo.service';
import { SITE_NAME, SITE_URL } from '../shared/seo/site';
import { CONTACT, FAQ } from './intro.content';

const ORGANIZATION_ID = `${SITE_URL}/#organization`;

/**
 * Référencement de la page d'accueil. Les données structurées reprennent le contenu affiché
 * (coordonnées, questions fréquentes) : Google exige qu'elles correspondent à ce que voit le visiteur.
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
        logo: `${SITE_URL}/rohafya-logo.png`,
        slogan: 'Votre santé, connectée',
        email: CONTACT.email,
        telephone: CONTACT.phone,
        areaServed: { '@type': 'Country', name: 'Cameroun' },
        contactPoint: {
          '@type': 'ContactPoint',
          contactType: 'customer support',
          telephone: CONTACT.phone,
          email: CONTACT.email,
          areaServed: CONTACT.country,
          availableLanguage: ['French'],
        },
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
