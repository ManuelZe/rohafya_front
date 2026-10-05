import { ApplicationConfig, provideBrowserGlobalErrorListeners } from '@angular/core';
import { provideRouter, withComponentInputBinding } from '@angular/router';

import { routes } from './app.routes';
import { provideClientHydration } from '@angular/platform-browser';
import { providePrimeNG } from 'primeng/config';
import Aura from '@primeuix/themes/aura';
import { definePreset } from '@primeuix/themes';
import { provideHttpClient, withInterceptors } from '@angular/common/http';
import { authInterceptor } from './connexion/auth-interceptor';
import { demoInterceptor } from './demo/demo-interceptor';

const promptPreset = definePreset(Aura, {
  semantic: {
    primary: {
      50: '{blue.50}',
      100: '{blue.100}',
      200: '{blue.200}',
      300: '{blue.300}',
      400: '{blue.400}',
      500: '{blue.500}',
      600: '{blue.600}',
      700: '{blue.700}',
      800: '{blue.800}',
      900: '{blue.900}',
      950: '{blue.950}'
    }
  }
})


export const appConfig: ApplicationConfig = {
  providers: [
    provideBrowserGlobalErrorListeners(),
    provideHttpClient(withInterceptors([demoInterceptor, authInterceptor])),
    provideRouter(routes, withComponentInputBinding()), provideClientHydration(),
    providePrimeNG({
      license : "eyJpZCI6IjM4NTA2ZTVkLTQ3NmEtNDUwMi04ZDg2LTY0YzA3NzQ3ZGQ5NyIsInByb2R1Y3QiOiJwcmltZXVpIiwidGllciI6ImNvbW11bml0eSIsInR5cGUiOiJkZXYiLCJpYXQiOjE3ODI5MDUzODAsImV4cCI6MTgxNDQ0MTM4MH0.I7n5VbbUT4iokSQ3JuuvSN6HR4-6x00vQzIcumP-OGexo-iydFm-4LMFm-AyNaIGjWeNiWnWQcMQQavr5i3-Cw",
      theme: {
        preset : promptPreset,
        options: {
          // darkModeSelector: 'none',
          darkModeSelector: '.app-dark',
        }
      }
    })
  ]
};