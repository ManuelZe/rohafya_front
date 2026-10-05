/** Espace ouvert par le bouton « Démo » de la page d'introduction. */
export type DemoSpace = 'patient' | 'doctor';

/**
 * Préfixe du jeton de la session de démonstration. Ce n'est pas un JWT : il ne quitte jamais
 * le navigateur, l'intercepteur démo répondant à la place de l'API Flask.
 */
export const DEMO_TOKEN_PREFIX = 'eden-demo.';

export function isDemoToken(token: string | null | undefined): boolean {
  return !!token && token.startsWith(DEMO_TOKEN_PREFIX);
}
