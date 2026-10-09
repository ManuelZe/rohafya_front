/**
 * Adresse publique du site : base des URL canoniques, du sitemap et des données structurées.
 * Toujours l'adresse de production, y compris en préproduction (la préproduction n'est pas indexée : voir server.ts).
 */
export const SITE_URL = 'https://rohafya.com';

export const SITE_NAME = 'ROHAFYA';

/** Image de partage sur les réseaux sociaux (1200 × 630). */
export const SOCIAL_IMAGE = { path: '/og-rohafya.png', width: 1200, height: 630, alt: 'ROHAFYA — Votre santé, connectée' };

/** Pages publiques à indexer, reprises dans le sitemap. */
export const INDEXABLE_PATHS = ['/intro', '/register', '/connexion'];

/**
 * Espaces privés fermés aux robots (robots.txt). Ils exigent une connexion ;
 * les lister évite que les moteurs perdent du temps sur des pages vides.
 */
export const PRIVATE_PATHS = ['/patients', '/doctors', '/admin', '/super-admin', '/notifications', '/requests', '/matricule', '/l/'];
