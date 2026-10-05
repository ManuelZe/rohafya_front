import { HttpErrorResponse, HttpParams, HttpRequest } from '@angular/common/http';
import { firstValueFrom } from 'rxjs';
import { environment } from '../../environments/environment';
import { normalizeActualSolde, normalizeMonth, normalizeSoldeDetail, normalizeStatement, normalizeYear } from '../doctors/commissions/commissions.models';
import { currentCycle } from '../doctors/shared/commission-cycle';
import { demoUser, handleDemoRequest } from './demo-backend';
import { isDemoToken } from './demo-token';

const api = environment.apiUrl;
const patient = demoUser('patient');
const doctor = demoUser('doctor');

function call(method: string, path: string, user = patient, body: unknown = null, params?: HttpParams) {
  const req = new HttpRequest(method, `${api}${path}`, body, { params });
  return firstValueFrom(handleDemoRequest(req, user)).then((res) => res.body);
}

describe('demoUser', () => {
  it('ouvre une session patient ou médecin avec un jeton de démo', () => {
    expect(isDemoToken(patient.token)).toBe(true);
    expect(patient.roles).toEqual(['Patient']);
    expect(patient.patient_id).not.toBeNull();
    expect(doctor.roles).toEqual(['Doctor']);
    expect(doctor.doctor_id).not.toBeNull();
  });
});

describe('handleDemoRequest', () => {
  it('répond à toutes les lectures de l’espace patient', async () => {
    const paths = [
      `patient/${patient.patient_id}`,
      `/patient/factures/${patient.patient_id}`,
      '/patient/factures/products/FAC-DEMO-0105',
      '/laboratoire/all_results/',
      'laboratoire/more_infos/LAB-DEMO-0412/result/',
      'imagerie/all_results/',
      'imagerie/more_infos/IMG-DEMO-0077/result/',
      'exploration/all_results/',
      'exploration/more_infos/EXP-DEMO-0055/result/',
      '/prescription/all_prescriptions/',
      '/prescription/devis/99401',
      `requete/get_requests/${patient.id}`,
      `save_patient/get_patient_saves/${patient.patient_id}/`,
      `send_result/patient/${patient.patient_id}`,
      'suggestions/for_user/',
      'devis/liste_prix/',
      `notifications/user/${patient.id}/`,
      'doctors/informations/matricule/DEMO-D-0001',
    ];
    const bodies = await Promise.all(paths.map((p) => call('GET', p)));
    bodies.forEach((body, i) => {
      expect(body, paths[i]).toBeTruthy();
      if (Array.isArray(body)) expect(body.length, paths[i]).toBeGreaterThan(0);
    });
  });

  it('bloque les détails d’un résultat expiré comme l’API', async () => {
    expect(await call('GET', 'laboratoire/more_infos/LAB-DEMO-0107/result/')).toEqual({
      Message: "La période d'accès aux détails de ce résultat est expirée.",
    });
  });

  it('renvoie des images pour les documents', async () => {
    const blob = await call('GET', 'blog/image/99901', doctor, null);
    expect(blob).toBeInstanceOf(Blob);
    expect((blob as Blob).type).toBe('image/svg+xml');
  });

  it('calcule des commissions cohérentes pour le médecin', async () => {
    const id = doctor.doctor_id;
    const { month, year } = currentCycle();
    const [actual, solde, statement, monthly, yearly] = await Promise.all([
      call('GET', `doctor_com/actual_solde/${id}`, doctor),
      call('GET', `doctor_com/solde/${id}`, doctor),
      call('GET', `gnu_doctor/${id}/commissions/`, doctor),
      call('GET', `doctor_com/invoiced_by_mounth/${id}/${month}/not_invoiced`, doctor),
      call('GET', `doctor_com/invoiced_by_year/${id}/${year}/not_invoiced`, doctor),
    ]);

    const snapshot = normalizeActualSolde(actual as never);
    expect(snapshot.total).toBeGreaterThan(0);
    expect(normalizeSoldeDetail(solde as never).total).toBe(snapshot.total);
    expect(normalizeMonth(monthly as never).total).toBe(snapshot.total);
    expect(normalizeYear(yearly as never).total).toBe(snapshot.total);
    expect(normalizeStatement(statement as never).rows.length).toBeGreaterThan(snapshot.commissions);
  });

  it('partage un résultat du patient, visible ensuite par le médecin', async () => {
    await call('POST', 'send_result/', patient, { doctor_id: doctor.doctor_id, exam_type: 'Laboratoire', exam_code: 'LAB-DEMO-0290' });
    const received = (await call('GET', `send_result/doctor/${doctor.doctor_id}`, doctor)) as { exam_code: string }[];
    expect(received.some((r) => r.exam_code === 'LAB-DEMO-0290')).toBe(true);

    const summary = (await call('GET', `result/Laboratoire/LAB-DEMO-0290/${patient.matricule}`, doctor)) as { test: string }[];
    expect(summary[0].test).toContain('ECBU');
  });

  it('conserve les ajouts et suppressions en mémoire', async () => {
    const form = new FormData();
    form.append('NameDoctor', 'Dr Test');
    form.append('OrdreDoctor', 'ONMC-TEST');
    const created = (await call('POST', '/prescription/add/', patient, form)) as { id: number };
    let list = (await call('GET', '/prescription/all_prescriptions/')) as { id: number }[];
    expect(list.some((p) => p.id === created.id)).toBe(true);

    await call('DELETE', `/prescription/del/${created.id}`);
    list = (await call('GET', '/prescription/all_prescriptions/')) as { id: number }[];
    expect(list.some((p) => p.id === created.id)).toBe(false);
  });

  it('refuse proprement une route inconnue', async () => {
    const error = await call('GET', 'route/inconnue').catch((err: unknown) => err);
    expect(error).toBeInstanceOf(HttpErrorResponse);
    expect((error as HttpErrorResponse).status).toBe(404);
  });

  it('filtre la recherche de produits du devis', async () => {
    const results = (await call('GET', 'devis/produits/recherche/', patient, null, new HttpParams().set('q', 'echo').set('limit', 20))) as {
      code: string;
    }[];
    expect(results.map((r) => r.code)).toEqual(['ECHO-AP']);
  });
});
