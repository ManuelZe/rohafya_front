import { HttpClient } from '@angular/common/http';
import { Service, computed, inject, signal } from '@angular/core';
import { Observable, catchError, map, of, switchMap, tap, timeout } from 'rxjs';
import { environment } from '../../environments/environment';
import { DoctorProfile, DoctorUpdatePayload } from './doctor.models';
import { stripDoctorTitle } from './shared/doctor-name';

/** Alimente un guard de navigation : on n'attend jamais indéfiniment (cf. PatientProfileService). */
const PROFILE_REQUEST_TIMEOUT_MS = 30000;

@Service()
export class DoctorProfileService {
  private readonly http = inject(HttpClient);
  private readonly baseUrl = environment.apiUrl;

  private readonly _profile = signal<DoctorProfile | null>(null);
  private readonly _loading = signal(false);

  readonly profile = this._profile.asReadonly();
  readonly loading = this._loading.asReadonly();

  /** Tant que le profil n'est pas chargé, on ne bloque pas l'accès (évite un flash grisé). */
  readonly isConfirmed = computed(() => {
    const profile = this._profile();
    return profile === null ? true : !!profile.doctor_is_confirmed;
  });

  readonly displayName = computed(() => {
    const p = this._profile();
    return p ? `${stripDoctorTitle(p.DoctorName)} ${p.DoctorLastname ?? ''}`.trim() : '';
  });

  /** GET /doctors/informations/{id} — cache local par docteur. */
  loadProfile(doctorId: number, forceRefresh = false): Observable<DoctorProfile | null> {
    const cached = this._profile();
    if (!forceRefresh && cached && cached.id === doctorId) {
      return of(cached);
    }

    this._loading.set(true);

    return this.http.get<DoctorProfile>(`${this.baseUrl}doctors/informations/${doctorId}`).pipe(
      timeout(PROFILE_REQUEST_TIMEOUT_MS),
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

  /**
   * PUT /doctors/update/{id} puis, si le compte n'est pas encore confirmé,
   * PUT /doctors/confirm/{id} : la mise à jour des coordonnées vaut confirmation du profil.
   */
  updateAndConfirm(doctorId: number, payload: DoctorUpdatePayload): Observable<DoctorProfile> {
    return this.http.put<{ Doctor: DoctorProfile }>(`${this.baseUrl}doctors/update/${doctorId}`, payload).pipe(
      switchMap((res) =>
        res.Doctor?.doctor_is_confirmed
          ? of(res.Doctor)
          : this.http
              .put<{ Doctor: DoctorProfile }>(`${this.baseUrl}doctors/confirm/${doctorId}`, {})
              .pipe(map((confirmed) => confirmed.Doctor))
      ),
      tap((profile) => this._profile.set(profile))
    );
  }

  /** GET /doctors/signature/matricule/{matricule} — image binaire (PNG/JPEG). */
  getSignature(matricule: string): Observable<Blob> {
    return this.http.get(`${this.baseUrl}doctors/signature/matricule/${encodeURIComponent(matricule)}`, { responseType: 'blob' });
  }

  reset(): void {
    this._profile.set(null);
  }
}
