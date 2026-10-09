import { TestBed } from '@angular/core/testing';
import { provideHttpClient } from '@angular/common/http';
import { provideRouter } from '@angular/router';
import { AuthService } from './auth-service';
import { CurrentUser } from './current-user.model';

describe('AuthService.loginLink', () => {
  let auth: AuthService;

  const user = (roles: string[], ids: Partial<CurrentUser> = {}): CurrentUser => ({
    id: 1,
    nom: 'Ngo',
    prenom: 'Amina',
    doctor_id: null,
    patient_id: null,
    email: 'amina@exemple.cm',
    token: 'jeton',
    matricule: 'P-001',
    roles,
    ...ids,
  });

  beforeEach(() => {
    TestBed.configureTestingModule({ providers: [provideHttpClient(), provideRouter([])] });
    auth = TestBed.inject(AuthService);
    auth.currentUser.set(undefined);
  });

  it('mène à la page de connexion quand personne n’est connecté', () => {
    expect(auth.loginLink()).toBe('/connexion');
    expect(auth.loginLabel()).toBe('Connexion');
  });

  it('mène au tableau de bord du patient connecté', () => {
    auth.currentUser.set(user(['Patient'], { patient_id: 7 }));
    expect(auth.loginLink()).toBe('/patients');
    expect(auth.loginLabel()).toBe('Mon espace');
  });

  it('mène à l’espace docteur du médecin connecté', () => {
    auth.currentUser.set(user(['Doctor'], { doctor_id: 3 }));
    expect(auth.loginLink()).toBe('/doctors');
  });

  it('reste sur la page de connexion quand aucun espace n’est ouvert à l’utilisateur', () => {
    auth.currentUser.set(user(['Patient']));
    expect(auth.loginLink()).toBe('/connexion');
    expect(auth.loginLabel()).toBe('Connexion');
  });
});
