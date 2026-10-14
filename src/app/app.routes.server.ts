import { RenderMode, ServerRoute } from '@angular/ssr';

export const serverRoutes: ServerRoute[] = [
  // Redirection vers /intro : le serveur Express répond par une 301 (server.ts), ceci ne sert qu'en secours.
  { path: '', renderMode: RenderMode.Server },
  { path: 'intro', renderMode: RenderMode.Prerender },
  { path: 'en', renderMode: RenderMode.Prerender },
  { path: 'connexion', renderMode: RenderMode.Prerender },
  { path: 'matricule', renderMode: RenderMode.Prerender },
  { path: 'register', renderMode: RenderMode.Prerender },
  { path: 'requests', renderMode: RenderMode.Prerender },
  // Page protégée (session dans le navigateur) : pré-rendue, elle redirigeait toujours vers /connexion.
  { path: 'notifications', renderMode: RenderMode.Client },
  { path: 'patients/**', renderMode: RenderMode.Client },
  { path: 'doctors/**', renderMode: RenderMode.Client },
  { path: '**', renderMode: RenderMode.Client }
];