import { HttpErrorResponse } from '@angular/common/http';
import { TimeoutError } from 'rxjs';
import { ApiSoftError, apiMessage, extractErrorMessage } from './api-error';

const http = (status: number, error: unknown) => new HttpErrorResponse({ status, error });

describe('apiMessage', () => {
  it('lit toutes les clés employées par l’API', () => {
    expect(apiMessage({ message: 'Un' })).toBe('Un');
    expect(apiMessage({ Message: 'Deux' })).toBe('Deux');
    expect(apiMessage({ 'Message ': 'Trois' })).toBe('Trois');
    expect(apiMessage({ msg: 'Accès refusé.' })).toBe('Accès refusé.');
    expect(apiMessage({ error: 'Docteur introuvable' })).toBe('Docteur introuvable');
    expect(apiMessage({ message: 'Préféré', error: 'détail technique' })).toBe('Préféré');
    expect(apiMessage('Texte brut')).toBe('Texte brut');
    expect(apiMessage('<!doctype html><title>500</title>')).toBeNull();
    expect(apiMessage([])).toBeNull();
  });

  it('traduit les messages anglais de l’API et de flask-jwt', () => {
    expect(apiMessage({ msg: 'Token has expired' })).toBe('Votre session a expiré. Reconnectez-vous.');
    expect(apiMessage({ msg: 'Missing Authorization Header' })).toBe('Vous n’êtes pas connecté. Reconnectez-vous.');
    expect(apiMessage({ msg: 'Signature verification failed' })).toBe('Session invalide. Reconnectez-vous.');
    expect(apiMessage({ error: 'Permission denied' })).toBe("Vous n'avez pas les droits nécessaires pour cette action.");
    expect(apiMessage({ message: 'User not found.' })).toBe('Utilisateur introuvable.');
  });
});

describe('extractErrorMessage', () => {
  it('affiche le message de l’API, y compris pour un numéro déjà utilisé (409) ou un refus (403)', () => {
    const phone = 'Le numéro 695995842 est déjà utilisé par un autre compte.';
    expect(extractErrorMessage(http(409, { message: phone }), 'repli')).toBe(phone);
    expect(extractErrorMessage(http(403, { message: 'Vérifiez vos accès.' }), 'repli')).toBe('Vérifiez vos accès.');
  });

  it('se rabat sur un message adapté au statut, puis sur le message fourni', () => {
    expect(extractErrorMessage(http(0, null))).toContain('Serveur injoignable');
    expect(extractErrorMessage(http(409, null), 'repli')).toBe('Ces informations sont déjà utilisées par un autre compte.');
    expect(extractErrorMessage(http(404, null), 'repli')).toBe('repli');
    expect(extractErrorMessage(new TimeoutError())).toContain('trop de temps');
    expect(extractErrorMessage(new ApiSoftError('Doux'))).toBe('Doux');
  });

  it('ne montre jamais une exception brute en erreur serveur', () => {
    expect(extractErrorMessage(http(500, { error: 'IntegrityError: duplicate key value' }))).toBe('Le serveur a rencontré une erreur. Réessayez plus tard.');
    expect(extractErrorMessage(http(500, { message: 'Erreur lors de la mise à jour des informations.' }))).toBe('Erreur lors de la mise à jour des informations.');
  });
});
