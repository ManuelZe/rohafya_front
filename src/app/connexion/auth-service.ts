import { HttpClient } from '@angular/common/http';
import { inject, Injectable, computed, signal } from '@angular/core';
import { DOCUMENT } from '@angular/common';
import { environment } from '../../environments/environment';
import { CurrentUser } from './current-user.model';
import { LoginApiResponse, DeconnexionApiResponse } from './login-response.model';
import { catchError, finalize, map, Observable, of, tap } from 'rxjs';
import { SendMatriculeResponse } from './matricule.model';
import { RegistrationFormData, RegistrationRequest } from './register.model';
import { Router } from "@angular/router";
import { SaasAccountService } from '../saas/saas-account.service';

/** Réponse de /saas/auth/otp/verify : une session, ou la demande de compléter nom et prénom. */
export type EmailCodeResult = { kind: 'logged-in'; user: CurrentUser } | { kind: 'needs-registration' };

export type PreferredSpace = 'patient' | 'doctor' | null;

const SUPER_ADMIN_ROLES = ['superadmin', 'admin'];

const STORAGE_KEY = 'currentUser';

@Injectable({ providedIn: 'root' })
export class AuthService {

  private router = inject(Router);
  private httpClient = inject(HttpClient);
  private baseUrl = environment.apiUrl;
  private document = inject(DOCUMENT);
  private saasAccount = inject(SaasAccountService);

  // Initialisation immédiate du signal depuis le stockage local
  currentUser = signal<CurrentUser | undefined>(this.readFromStorage());

  isLoggedIn = computed(() => !!this.currentUser()?.token);
  token = computed(() => this.currentUser()?.token);
  roles = computed(() => this.currentUser()?.roles ?? []);
  isDoctor = computed(() => this.roles().some(role => role.toLowerCase() === 'doctor'));
  isPatient = computed(() => this.roles().some(role => role.toLowerCase() === 'patient'));
  isSuperAdmin = computed(() => this.roles().some(role => SUPER_ADMIN_ROLES.includes(role.toLowerCase())));
  isTenantAdmin = computed(() => this.roles().some(role => role.toLowerCase() === 'establishmentadmin'));
  fullName = computed(() => {
    const user = this.currentUser();
    return user ? `${user.prenom} ${user.nom}` : '';
  });

  login(username: string, password: string, remember_me: boolean = true) {
    return this.httpClient
      .post<LoginApiResponse>(`${this.baseUrl}user/login`, { username, password, remember_me })
      .pipe(
        map((response) => this.mapToCurrentUser(response)),
        tap((currentUser) => this.setCurrentUser(currentUser))
      );
  }

  /** Envoie un code de connexion à usage unique à cette adresse. */
  requestEmailCode(email: string) {
    return this.httpClient.post<{ message: string }>(`${this.baseUrl}saas/auth/otp/request`, { email });
  }

  /** Vérifie le code ; crée le compte patient si `names` est fourni et qu'aucun compte n'existe. */
  verifyEmailCode(email: string, code: string, names?: { first_name: string; last_name: string }): Observable<EmailCodeResult> {
    return this.httpClient
      .post<LoginApiResponse | { needs_registration: true }>(`${this.baseUrl}saas/auth/otp/verify`, { email, code, ...names })
      .pipe(
        map((response): EmailCodeResult => {
          if ('needs_registration' in response) {
            return { kind: 'needs-registration' };
          }
          const user = this.mapToCurrentUser(response);
          this.setCurrentUser(user);
          return { kind: 'logged-in', user };
        })
      );
  }

  /** Espace d'arrivée après connexion : celui choisi s'il est autorisé, sinon le plus élevé des rôles. */
  homeUrl(preferred: PreferredSpace = null): string {
    const user = this.currentUser();
    const canPatient = this.isPatient() && user?.patient_id !== null;
    const canDoctor = this.isDoctor() && user?.doctor_id !== null;
    if (preferred === 'patient' && canPatient) return '/patients';
    if (preferred === 'doctor' && canDoctor) return '/doctors';
    if (this.isSuperAdmin()) return '/super-admin';
    if (this.isTenantAdmin()) return '/admin';
    if (canDoctor) return '/doctors';
    if (canPatient) return '/patients';
    return '/intro';
  }

  private mapToCurrentUser(response: LoginApiResponse): CurrentUser {
    const { data, access_token } = response;
    return {
      id: data.id,
      nom: data.last_name,
      doctor_id: data.doctor_id,
      patient_id: data.patient_id,
      prenom: data.first_name,
      email: data.email,
      token: access_token,
      matricule: data.username,
      roles: data.roles.map((r) => r.name),
    };
  }

  /** Ouvre une session sans passer par user/login (utilisé par le mode démo). */
  openSession(user: CurrentUser): void {
    this.setCurrentUser(user);
  }

  private setCurrentUser(user: CurrentUser): void {
    this.currentUser.set(user);
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(user));
    } catch (e) {
      console.error('Erreur d\'écriture dans le localStorage', e);
    }
  }

  private readFromStorage(): CurrentUser | undefined {
    try {
      if (typeof window !== 'undefined' && window.localStorage) {
        const raw = localStorage.getItem(STORAGE_KEY);
        if (raw) {
          return JSON.parse(raw) as CurrentUser;
        }
      }
    } catch (e) {
      console.error('Erreur de lecture du localStorage', e);
    }
    return undefined;
  }

  sendMatricule(federation_id: string) {
    return this.httpClient.post<SendMatriculeResponse>(`${this.baseUrl}users/send_email/`, {
      federation_id,
    });
  }

  register(formData: RegistrationFormData) {
    const payload = this.buildPayload(formData);
    return this.httpClient.post(`${this.baseUrl}requete/anonym/add`, payload);
  }

  private buildPayload(formData: RegistrationFormData): RegistrationRequest {
    return {
      first_name: formData.first_name,
      last_name: formData.last_name,
      email: formData.email,
      message: formData.message,
      administration: true,
      commission: false,
      connection: true,
      error: false,
      etat_patient: false,
      patient_request_connexion: true,
      patient_request_examen_out: false,
      patient_request_other_administration: false,
      patient_request_prix_examen: false,
      revendication_examen: false,
      suggestion: false,
    };
  }

  logout(): Observable<DeconnexionApiResponse | null> {
    return this.httpClient.post<DeconnexionApiResponse>(`${this.baseUrl}user/logout`, {}).pipe(
      catchError(() => of(null)),
      finalize(() => this.clearSession())
    );
  }

  private clearSession(): void {
    this.currentUser.set(undefined);
    this.saasAccount.reset();
    try {
      if (typeof window !== 'undefined' && window.localStorage) {
        localStorage.removeItem(STORAGE_KEY);
      }
    } catch (e) {
      console.error('Erreur de suppression du localStorage', e);
    }
  }
}