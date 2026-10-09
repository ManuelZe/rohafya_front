import { RenderMode, ServerRoute } from '@angular/ssr';

export const serverRoutes: ServerRoute[] = [
  // Redirection vers /intro : le serveur Express répond par une 301 (server.ts), ceci ne sert qu'en secours.
  { path: '', renderMode: RenderMode.Server },
  { path: 'intro', renderMode: RenderMode.Prerender },
  { path: 'connexion', renderMode: RenderMode.Prerender },
  { path: 'matricule', renderMode: RenderMode.Prerender },
  { path: 'register', renderMode: RenderMode.Prerender },
  { path: 'requests', renderMode: RenderMode.Prerender },
  { path: 'notifications', renderMode: RenderMode.Prerender },
  { path: 'patients/**', renderMode: RenderMode.Client },
  { path: 'doctors/**', renderMode: RenderMode.Client },
  { path: '**', renderMode: RenderMode.Client }
];