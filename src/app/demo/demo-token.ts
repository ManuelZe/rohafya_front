/** Profil ouvert par le bouton « Démo » de la page d'introduction. */
export type DemoSpace = 'patient' | 'doctor' | 'admin';

/** Du profil le moins élevé au plus élevé : les informations remontent dans cet ordre. */
export const DEMO_SPACES: readonly DemoSpace[] = ['patient', 'doctor', 'admin'];

/** Espace d'arrivée de chaque profil. */
export const DEMO_HOME: Record<DemoSpace, string> = {
  patient: '/patients',
  doctor: '/doctors',
  admin: '/admin',
};

/**
 * Préfixe du jeton de la session de démonstration. Ce n'est pas un JWT : il ne quitte jamais
 * le navigateur, l'intercepteur démo répondant à la place de l'API Flask.
 */
export const DEMO_TOKEN_PREFIX = 'rohafya-demo.';

export function isDemoToken(token: string | null | undefined): boolean {
  return !!token && token.startsWith(DEMO_TOKEN_PREFIX);
}

/** Profil d'une session démo, d'après son jeton. */
export function demoSpaceOf(token: string | null | undefined): DemoSpace | null {
  if (!isDemoToken(token)) return null;
  const space = token!.slice(DEMO_TOKEN_PREFIX.length) as DemoSpace;
  return DEMO_SPACES.includes(space) ? space : null;
}
