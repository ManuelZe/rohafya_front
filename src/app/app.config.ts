import { ApplicationConfig, inject, provideAppInitializer, provideBrowserGlobalErrorListeners } from '@angular/core';
import { TitleStrategy, provideRouter, withComponentInputBinding, withInMemoryScrolling } from '@angular/router';
import { I18n } from './shared/i18n/i18n';
import { I18nTitleStrategy } from './shared/i18n/i18n-title';

import { routes } from './app.routes';
import { provideClientHydration } from '@angular/platform-browser';
import { providePrimeNG } from 'primeng/config';
import Aura from '@primeuix/themes/aura';
import { definePreset } from '@primeuix/themes';
import { provideHttpClient, withInterceptors } from '@angular/common/http';
import { authInterceptor } from './connexion/auth-interceptor';
import { demoInterceptor } from './demo/demo-interceptor';
import { langInterceptor } from './shared/i18n/lang-interceptor';
import { PwaService } from './shared/pwa/pwa.service';
import { DemoSession } from './demo/demo-session';

/** Thème aux couleurs du logo : vert (primary, foncé en 700 pour le contraste AA) et marine. */
const rohafyaPreset = definePreset(Aura, {
  semantic: {
    primary: {
      50: '{emerald.50}',
      100: '{emerald.100}',
      200: '{emerald.200}',
      300: '{emerald.300}',
      400: '{emerald.400}',
      500: '{emerald.500}',
      600: '{emerald.600}',
      700: '{emerald.700}',
      800: '{emerald.800}',
      900: '{emerald.900}',
      950: '{emerald.950}'
    },
    colorScheme: {
      light: {
        primary: {
          color: '{primary.700}',
          contrastColor: '#ffffff',
          hoverColor: '{primary.800}',
          activeColor: '{primary.900}'
        },
        highlight: {
          background: '{primary.50}',
          focusBackground: '{primary.100}',
          color: '{primary.800}',
          focusColor: '{primary.900}'
        }
      }
    }
  }
})


export const appConfig: ApplicationConfig = {
  providers: [
    provideBrowserGlobalErrorListeners(),
    provideAppInitializer(() => inject(DemoSession).closeObsoleteSession()),
    // Langue retenue sur l'appareil : dictionnaire chargé avant le premier affichage (pas de texte qui change de langue).
    provideAppInitializer(() => inject(I18n).init()),
    // Application installable : service worker (production) et invitation d'installation.
    provideAppInitializer(() => inject(PwaService).init()),
    { provide: TitleStrategy, useClass: I18nTitleStrategy },
    provideHttpClient(withInterceptors([demoInterceptor, langInterceptor, authInterceptor])),
    // Sur mobile la page elle-même défile : chaque nouvelle page s'ouvre en haut, le retour arrière restaure la position.
    provideRouter(routes, withComponentInputBinding(), withInMemoryScrolling({ scrollPositionRestoration: 'enabled' })), provideClientHydration(),
    providePrimeNG({
      license : "eyJpZCI6IjM4NTA2ZTVkLTQ3NmEtNDUwMi04ZDg2LTY0YzA3NzQ3ZGQ5NyIsInByb2R1Y3QiOiJwcmltZXVpIiwidGllciI6ImNvbW11bml0eSIsInR5cGUiOiJkZXYiLCJpYXQiOjE3ODI5MDUzODAsImV4cCI6MTgxNDQ0MTM4MH0.I7n5VbbUT4iokSQ3JuuvSN6HR4-6x00vQzIcumP-OGexo-iydFm-4LMFm-AyNaIGjWeNiWnWQcMQQavr5i3-Cw",
      theme: {
        preset : rohafyaPreset,
        options: {
          // darkModeSelector: 'none',
          darkModeSelector: '.app-dark',
        }
      }
    })
  ]
};