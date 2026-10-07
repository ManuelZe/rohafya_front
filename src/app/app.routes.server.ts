import { RenderMode, ServerRoute } from '@angular/ssr';

export const serverRoutes: ServerRoute[] = [
  // Rendu dans le navigateur : la redirection dépend de la session (localStorage), inconnue du serveur.
  { path: '', renderMode: RenderMode.Client },
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