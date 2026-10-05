import {
  AngularNodeAppEngine,
  createNodeRequestHandler,
  isMainModule,
  writeResponseToNodeResponse,
} from '@angular/ssr/node';
import express from 'express';
import { join } from 'node:path';

const browserDistFolder = join(import.meta.dirname, '../browser');

const app = express();
const angularApp = new AngularNodeAppEngine();

/** Version déployée : injectée dans l'image Docker au build (ARG APP_VERSION). */
const APP_VERSION = process.env['APP_VERSION'] || 'dev';
const STARTED_AT = new Date().toISOString();

// Derrière un reverse proxy (Nginx Proxy Manager, Traefik…) : IP et protocole réels du client.
app.set('trust proxy', true);
app.disable('x-powered-by');

/** En-têtes de sécurité de base, appliqués à toutes les réponses. */
app.use((_req, res, next) => {
  res.setHeader('X-Content-Type-Options', 'nosniff');
  res.setHeader('X-Frame-Options', 'SAMEORIGIN');
  res.setHeader('Referrer-Policy', 'strict-origin-when-cross-origin');
  res.setHeader('Permissions-Policy', 'camera=(), microphone=(), geolocation=()');
  next();
});

/**
 * Configuration d'exécution lue par l'application dans le navigateur (window.__EDEN_ENV__).
 * Permet de changer l'URL de l'API sans reconstruire l'image : variable API_URL du conteneur.
 */
app.get('/env.js', (_req, res) => {
  const runtimeEnv = {
    apiUrl: process.env['API_URL'] || undefined,
    version: APP_VERSION,
  };
  res.setHeader('Content-Type', 'application/javascript; charset=utf-8');
  res.setHeader('Cache-Control', 'no-store');
  res.send(`window.__EDEN_ENV__ = ${JSON.stringify(runtimeEnv)};`);
});

/** Sonde de santé utilisée par le HEALTHCHECK Docker, Portainer et les scripts de déploiement. */
app.get('/healthz', (_req, res) => {
  res.setHeader('Cache-Control', 'no-store');
  res.json({ status: 'ok', version: APP_VERSION, startedAt: STARTED_AT, uptime: Math.round(process.uptime()) });
});

/**
 * Serve static files from /browser
 */
app.use(
  express.static(browserDistFolder, {
    maxAge: '1y',
    index: false,
    redirect: false,
  }),
);

/**
 * Handle all other requests by rendering the Angular application.
 */
app.use((req, res, next) => {
  angularApp
    .handle(req)
    .then((response) =>
      response ? writeResponseToNodeResponse(response, res) : next(),
    )
    .catch(next);
});

/**
 * Start the server if this module is the main entry point, or it is ran via PM2.
 * The server listens on the port defined by the `PORT` environment variable, or defaults to 4000.
 */
if (isMainModule(import.meta.url) || process.env['pm_id']) {
  const port = process.env['PORT'] || 4000;
  const server = app.listen(port, (error) => {
    if (error) {
      throw error;
    }

    console.log(`EDEN ${APP_VERSION} — serveur Node Express à l'écoute sur http://localhost:${port}`);
  });

  // Arrêt propre (docker stop / redéploiement Portainer) : on termine les requêtes en cours.
  const shutdown = (signal: string) => {
    console.log(`${signal} reçu : arrêt du serveur EDEN…`);
    server.close(() => process.exit(0));
    setTimeout(() => process.exit(1), 10_000).unref();
  };
  process.on('SIGTERM', () => shutdown('SIGTERM'));
  process.on('SIGINT', () => shutdown('SIGINT'));
}

/**
 * Request handler used by the Angular CLI (for dev-server and during build) or Firebase Cloud Functions.
 */
export const reqHandler = createNodeRequestHandler(app);
