/**
 * Configuration de PRODUCTION.
 *
 * L'URL de l'API n'est pas figée dans le build : elle est lue au démarrage du conteneur.
 *  - Navigateur : `window.__EDEN_ENV__`, injecté par le serveur Node via /env.js
 *    (valeurs issues des variables d'environnement API_URL / APP_VERSION du conteneur).
 *  - Rendu serveur (SSR) : directement `process.env.API_URL`.
 * Une même image Docker peut ainsi servir la préproduction et la production.
 */
interface RuntimeEnv {
  apiUrl?: string;
  version?: string;
}

const DEFAULT_API_URL = 'https://site.pdmdsante.com/';

const runtime: RuntimeEnv = (globalThis as { __EDEN_ENV__?: RuntimeEnv }).__EDEN_ENV__ ?? {};
const serverEnv = (globalThis as { process?: { env?: Record<string, string | undefined> } }).process?.env ?? {};

/** Garantit la barre oblique finale attendue par les services (`${apiUrl}patient/...`). */
function withTrailingSlash(url: string): string {
  return url.endsWith('/') ? url : `${url}/`;
}

export const environment = {
  production: true,
  apiUrl: withTrailingSlash(runtime.apiUrl || serverEnv['API_URL'] || DEFAULT_API_URL),
  version: runtime.version || serverEnv['APP_VERSION'] || 'dev',
};
