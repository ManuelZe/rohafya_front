import { HttpErrorResponse } from '@angular/common/http';
import { TimeoutError } from 'rxjs';

/** L'API renvoie parfois un statut 200 avec { message: "..." } au lieu d'une erreur HTTP. */
export class ApiSoftError extends Error {}

/**
 * Clés sous lesquelles l'API Flask place son message, par ordre de préférence :
 * `message` / `Message` (avec ou sans espace finale) pour ses propres messages,
 * `msg` pour flask-jwt-extended, `error` pour les refus de permission.
 */
const MESSAGE_KEYS = ['message', 'Message', 'Message ', 'msg', 'detail', 'error'] as const;

/** Messages anglais renvoyés par l'API ou ses bibliothèques, traduits pour l'utilisateur. */
const TRANSLATIONS: [RegExp, string][] = [
  [/token has expired|signature has expired/i, 'Votre session a expiré. Reconnectez-vous.'],
  [/missing authorization header|missing jwt|token has been revoked|error loading the user/i, 'Vous n’êtes pas connecté. Reconnectez-vous.'],
  [/signature verification failed|not enough segments|invalid (header|token|crypto)|bad authorization header/i, 'Session invalide. Reconnectez-vous.'],
  [/^permission denied\.?$/i, "Vous n'avez pas les droits nécessaires pour cette action."],
  [/^user not found\.?$/i, 'Utilisateur introuvable.'],
  [/^not found\.?$/i, 'Élément introuvable.'],
  [/^image not found\.?$/i, 'Image introuvable.'],
  [/^no selected file\.?$/i, 'Aucun fichier sélectionné.'],
];

/** Message par défaut selon le statut, quand l'API n'en donne pas d'exploitable. */
const STATUS_MESSAGES: Record<number, string> = {
  401: 'Votre session a expiré. Reconnectez-vous.',
  403: "Vous n'avez pas les droits nécessaires pour cette action.",
  405: "Cette action n'est pas disponible sur le serveur. Réessayez plus tard ou contactez l'assistance.",
  409: 'Ces informations sont déjà utilisées par un autre compte.',
  413: 'Le fichier envoyé est trop volumineux.',
  429: 'Trop de tentatives. Patientez un instant puis réessayez.',
};

export const SERVER_ERROR_MESSAGE = 'Le serveur a rencontré une erreur. Réessayez plus tard.';

function translate(message: string): string {
  const text = message.trim();
  return TRANSLATIONS.find(([pattern]) => pattern.test(text))?.[1] ?? text;
}

/** Message lisible contenu dans le corps d'une réponse de l'API, ou null. */
export function apiMessage(body: unknown, keys: readonly string[] = MESSAGE_KEYS): string | null {
  if (typeof body === 'string') {
    const text = body.trim();
    // Une page HTML (erreur 500 de Flask, proxy…) n'est pas un message pour l'utilisateur.
    return text && !text.startsWith('<') && text.length <= 300 ? translate(text) : null;
  }
  if (!body || typeof body !== 'object' || Array.isArray(body)) return null;
  const record = body as Record<string, unknown>;
  for (const key of keys) {
    const value = record[key];
    if (typeof value === 'string' && value.trim()) return translate(value);
  }
  return null;
}

/** Message à afficher pour une erreur d'appel à l'API. */
export function extractErrorMessage(err: unknown, fallback = 'Impossible de récupérer les éléments. Réessayez plus tard.'): string {
  if (err instanceof TimeoutError) {
    return 'Le serveur met trop de temps à répondre. Réessayez plus tard.';
  }
  if (err instanceof ApiSoftError) {
    return err.message;
  }
  if (err instanceof HttpErrorResponse) {
    if (err.status === 0) {
      return 'Serveur injoignable. Vérifiez votre connexion internet.';
    }
    if (err.status >= 500) {
      // En 500, `error` / `detail` contiennent souvent l'exception brute : seul un message rédigé est montré.
      return apiMessage(err.error, ['message', 'Message', 'Message ']) ?? SERVER_ERROR_MESSAGE;
    }
    return apiMessage(err.error) ?? STATUS_MESSAGES[err.status] ?? fallback;
  }
  return fallback;
}
