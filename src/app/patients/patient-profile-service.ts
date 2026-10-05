import { HttpClient } from '@angular/common/http';
import { computed, inject, Injectable, signal } from '@angular/core';
import { Observable, catchError, of, tap, timeout } from 'rxjs';
import { environment } from '../../environments/environment';
import { PatientProfile, PatientUpdatePayload } from './patient-profile.models';

/** Ce service alimente un guard de navigation (patientConfirmedGuard), exécuté à CHAQUE
 *  navigation : si la requête ne répond jamais, c'est la navigation elle-même qui reste
 *  bloquée. On abandonne donc après ce délai plutôt que de geler indéfiniment le routeur.
 *  Volontairement large pour ne pas annuler à tort une requête juste lente sur un backend
 *  de développement mono-thread sollicité par plusieurs pages en même temps. */
const PROFILE_REQUEST_TIMEOUT_MS = 30000;

@Injectable({ providedIn: 'root' })
export class PatientProfileService {
  private readonly http = inject(HttpClient);
  private readonly baseUrl = environment.apiUrl;

  private readonly _profile = signal<PatientProfile | null>(null);
  private readonly _loading = signal(false);

  readonly profile = this._profile.asReadonly();
  readonly loading = this._loading.asReadonly();

  /** Tant que le profil n'a pas encore été chargé, on considère l'accès non bloqué (évite le flash grisé). */
  readonly isConfirmed = computed(() => {
    const profile = this._profile();
    return profile === null ? true : profile.patient_is_confirmed;
  });

  getPatient(patientId: number): Observable<PatientProfile> {
    return this.http.get<PatientProfile>(`${this.baseUrl}patient/${patientId}`).pipe(timeout(PROFILE_REQUEST_TIMEOUT_MS));
  }

  /** Charge le profil si nécessaire (ou le renvoie depuis le cache local si déjà chargé pour ce patient). */
  loadProfile(patientId: number, forceRefresh = false): Observable<PatientProfile | null> {
    const cached = this._profile();
    if (!forceRefresh && cached && cached.id === patientId) {
      return of(cached);
    }

    this._loading.set(true);

    return this.getPatient(patientId).pipe(
      tap((profile) => {
        this._profile.set(profile);
        this._loading.set(false);
      }),
      catchError((err) => {
        this._loading.set(false);
        console.error(err);
        return of(null);
      })
    );
  }

  updatePatient(patientId: number, payload: PatientUpdatePayload): Observable<unknown> {
    return this.http.put(`${this.baseUrl}patient/update/${patientId}`, payload).pipe(
      tap(() => this.loadProfile(patientId, true).subscribe())
    );
  }

  reset(): void {
    this._profile.set(null);
  }
}
