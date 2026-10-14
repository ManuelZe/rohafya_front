import { PageSeo } from '../shared/seo/seo.service';
import { SITE_NAME, SITE_URL } from '../shared/seo/site';
import { Lang } from '../shared/i18n/i18n';
import { FAQ, SOCIAL_LINKS } from './intro.content';

const ORGANIZATION_ID = `${SITE_URL}/#organization`;

/**
 * Référencement du site de présentation, dans la langue de la page (/intro en français, /en en anglais).
 * Les données structurées reprennent le contenu affiché (questions fréquentes) : Google exige
 * qu'elles correspondent à ce que voit le visiteur.
 */
export function introSeo(lang: Lang, t: (text: string) => string): PageSeo {
  const path = lang === 'en' ? '/en' : '/intro';
  return {
    title: t('ROHAFYA — La remise des résultats en ligne pour les établissements de santé'),
    description: t(
      'Laboratoires, centres d’imagerie, cliniques : vos résultats arrivent à vos patients sans qu’ils reviennent. QR code sur la facture, sans changer de logiciel. Essai de 60 jours.'
    ),
    path,
    locale: lang === 'en' ? 'en_GB' : 'fr_FR',
    alternates: { fr: '/intro', en: '/en' },
    jsonLd: {
      '@context': 'https://schema.org',
      '@graph': [
        {
          '@type': 'Organization',
          '@id': ORGANIZATION_ID,
          name: SITE_NAME,
          url: SITE_URL,
          logo: `${SITE_URL}/rohafya-logo.png?v=2`,
          slogan: t('Votre santé, connectée'),
          areaServed: { '@type': 'Country', name: lang === 'en' ? 'Cameroon' : 'Cameroun' },
          sameAs: SOCIAL_LINKS.map((link) => link.url),
        },
        {
          '@type': 'WebSite',
          '@id': `${SITE_URL}/#website`,
          url: SITE_URL,
          name: SITE_NAME,
          inLanguage: ['fr', 'en'],
          publisher: { '@id': ORGANIZATION_ID },
        },
        {
          '@type': 'FAQPage',
          '@id': `${SITE_URL}${path}#faq`,
          inLanguage: lang,
          mainEntity: FAQ.map((item) => ({
            '@type': 'Question',
            name: t(item.question),
            acceptedAnswer: { '@type': 'Answer', text: t(item.answer) },
          })),
        },
      ],
    },
  };
}
