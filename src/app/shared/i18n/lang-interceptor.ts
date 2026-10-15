import { HttpInterceptorFn } from '@angular/common/http';
import { inject } from '@angular/core';
import { environment } from '../../../environments/environment';
import { I18n } from './i18n';

/**
 * Langue de l'interface transmise à l'API (Accept-Language : fr ou en). L'API s'en sert pour les
 * e-mails d'un destinataire sans préférence enregistrée (code de connexion, demande d'essai…).
 */
export const langInterceptor: HttpInterceptorFn = (req, next) => {
  if (!req.url.startsWith(environment.apiUrl) || req.headers.has('Accept-Language')) return next(req);
  return next(req.clone({ setHeaders: { 'Accept-Language': inject(I18n).lang() } }));
};
