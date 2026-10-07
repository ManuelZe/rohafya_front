import { HttpErrorResponse, HttpParams, HttpRequest } from '@angular/common/http';
import { firstValueFrom } from 'rxjs';
import { environment } from '../../environments/environment';
import { demoUser, handleDemoRequest, resetDemoData } from './demo-backend';
import { isDemoToken } from './demo-token';

const api = environment.apiUrl;
const patient = demoUser('patient');
const doctor = demoUser('doctor');
const admin = demoUser('admin');

function call(method: string, path: string, user = patient, body: unknown = null, params?: HttpParams) {
  const req = new HttpRequest(method, `${api}${path}`, body, { params });
  return firstValueFrom(handleDemoRequest(req, user)).then((res) => res.body);
}

describe('demoUser', () => {
  it('ouvre une session pour chacun des trois profils avec un jeton de démo', () => {
    expect(isDemoToken(patient.token)).toBe(true);
    expect(patient.roles).toEqual(['Patient']);
    expect(patient.patient_id).not.toBeNull();
    expect(doctor.roles).toEqual(['Doctor']);
    expect(doctor.doctor_id).not.toBeNull();
    expect(admin.roles).toEqual(['EstablishmentAdmin']);
    expect(new Set([patient, doctor, admin].map((u) => u.token)).size).toBe(3);
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

  it('ne propose aucune commission dans l’espace médecin', async () => {
    const me = (await call('GET', 'saas/me', doctor)) as { features: { commissions: boolean } };
    expect(me.features.commissions).toBe(false);
    const status = await call('GET', `doctor_com/actual_solde/${doctor.doctor_id}`, doctor).catch((err: HttpErrorResponse) => err.status);
    expect(status).toBe(404);
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

  it('adresse les envois à un établissement, séparément pour le patient et le médecin', async () => {
    const establishments = (await call('GET', 'saas/public/establishments')) as { id: number; name: string }[];
    expect(establishments.length).toBeGreaterThan(1);

    const form = new FormData();
    form.append('tenant_id', String(establishments[1].id));
    form.append('audience', 'doctor');
    form.append('patient_name', 'Jean Essomba');
    const created = (await call('POST', 'prescription/add/', doctor, form)) as {
      id: number;
      patient_id: number | null;
      submission: { establishment: string; status: string; patient_name: string };
    };
    expect(created.patient_id).toBeNull();
    expect(created.submission).toMatchObject({ establishment: establishments[1].name, status: 'recue', patient_name: 'Jean Essomba' });

    const doctorList = (await call('GET', 'prescription/all_prescriptions/', doctor, null, new HttpParams().set('audience', 'doctor'))) as { id: number }[];
    const patientList = (await call('GET', 'prescription/all_prescriptions/', patient, null, new HttpParams().set('audience', 'patient'))) as {
      id: number;
      submission: { status: string } | null;
    }[];
    expect(doctorList.map((p) => p.id)).toEqual([created.id]);
    expect(patientList.some((p) => p.id === created.id)).toBe(false);
    expect(patientList.every((p) => p.submission !== null)).toBe(true);
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

interface SubmissionView {
  id: number;
  kind: string;
  status: string;
  response: string | null;
  author: { name: string; role: string };
  item: Record<string, unknown>;
}
interface AuditView {
  action: string;
  target: string | null;
  tenant_id: number | null;
  user_name: string | null;
}

describe('interconnexions entre les profils de démo', () => {
  beforeEach(() => resetDemoData());

  it('donne à chaque profil son espace, sans console super-administrateur', async () => {
    const meAdmin = (await call('GET', 'saas/me', admin)) as { is_super_admin: boolean; admin_tenants: { id: number }[] };
    expect(meAdmin.is_super_admin).toBe(false);
    expect(meAdmin.admin_tenants.map((t) => t.id)).toEqual([1, 2]);

    const status = (user: typeof patient, path: string) => call('GET', path, user).catch((err: HttpErrorResponse) => err.status);
    expect(await status(patient, 'saas/admin/tenants/1/dashboard')).toBe(403);
    expect(await status(admin, 'saas/admin/tenants/3/dashboard')).toBe(403);
    expect(await status(admin, 'saas/super/stats')).toBe(404);
  });

  it('fait remonter une requête du patient à l’établissement, puis la réponse au patient, avec trace au journal', async () => {
    const sent = (await call('POST', 'requete/add', patient, { tenant_id: 1, message: 'Les résultats sont-ils disponibles le samedi ?' })) as {
      id: number;
      submission: { id: number };
    };

    const list = (await call('GET', 'saas/admin/tenants/1/submissions', admin, null, new HttpParams().set('status', 'recue'))) as {
      items: SubmissionView[];
      counts: Record<string, Record<string, number>>;
    };
    const received = list.items.find((s) => s.id === sent.submission.id)!;
    expect(received.kind).toBe('requete');
    expect(received.author).toMatchObject({ role: 'patient' });
    expect(received.author.name).toContain('Aïcha');
    expect(received.item['message']).toBe('Les résultats sont-ils disponibles le samedi ?');
    expect(list.counts['requete']['recue']).toBeGreaterThan(0);

    await call('PUT', `saas/admin/tenants/1/submissions/${sent.submission.id}`, admin, { status: 'traitee', response: 'Oui, de 8 h à 12 h.' });

    const mine = (await call('GET', `requete/get_requests/${patient.id}`, patient)) as { id: number; valide: boolean; submission: { status: string; response: string } }[];
    const answered = mine.find((r) => r.id === sent.id)!;
    expect(answered.valide).toBe(true);
    expect(answered.submission).toMatchObject({ status: 'traitee', response: 'Oui, de 8 h à 12 h.' });
    const notifications = (await call('GET', `notifications/user/${patient.id}/`, patient)) as { title: string }[];
    expect(notifications[0].title).toBe('Réponse de Centre de démonstration ROHAFYA');

    const journal = (await call('GET', 'saas/admin/tenants/1/audit', admin)) as { items: AuditView[] };
    const actions = journal.items.filter((a) => a.target === String(sent.submission.id)).map((a) => a.action);
    expect(actions).toEqual(['submission.requete.traitee', 'submission.requete.created']);
  });

  it('transmet au bon établissement les envois du médecin', async () => {
    const form = new FormData();
    form.append('tenant_id', '2');
    form.append('audience', 'doctor');
    form.append('nom', 'EBODE');
    form.append('prenom', 'Rose');
    const save = (await call('POST', 'save_patient/add/', doctor, form)) as { submission: { id: number } };
    const horizon = (await call('GET', 'saas/admin/tenants/2/submissions', admin)) as { items: SubmissionView[] };
    expect(horizon.items.find((s) => s.id === save.submission.id)?.author).toMatchObject({ role: 'doctor', name: 'Dr Paul EKANÉ (Démo)' });
    const centre = (await call('GET', 'saas/admin/tenants/1/submissions', admin)) as { items: SubmissionView[] };
    expect(centre.items.some((s) => s.id === save.submission.id)).toBe(false);
  });

  it('rattache un dossier avec le code d’un QR code généré par l’administrateur', async () => {
    const before = (await call('GET', 'saas/admin/tenants/2/dashboard', admin)) as { links_active: number };
    const issued = (await call('POST', 'saas/admin/tenants/2/link-tokens', admin, { local_ref: 'HZ-DEMO-0001' })) as { short_code: string; url: string };
    expect(issued.short_code).toMatch(/^[A-Z0-9]{3}-[A-Z0-9]{4}$/);
    expect(issued.url).toContain('/l/');

    const redeemed = (await call('POST', 'saas/me/links/redeem', patient, { code: issued.short_code.toLowerCase() })) as { link: { status: string; establishment: string } };
    expect(redeemed.link).toMatchObject({ status: 'active', establishment: 'Laboratoire Horizon (démo)' });

    const links = (await call('GET', 'saas/me/links', patient)) as { tenant_id: number }[];
    expect(links.map((l) => l.tenant_id).sort()).toEqual([1, 2]);
    const patients = (await call('GET', 'saas/admin/tenants/2/patients', admin)) as { items: { local_ref: string; link_status: string }[] };
    expect(patients.items.find((p) => p.local_ref === 'HZ-DEMO-0001')?.link_status).toBe('active');
    const after = (await call('GET', 'saas/admin/tenants/2/dashboard', admin)) as { links_active: number };
    expect(after.links_active).toBe(before.links_active + 1);

    const reused = await call('POST', 'saas/me/links/redeem', patient, { code: issued.short_code }).catch((err: HttpErrorResponse) => err.status);
    expect(reused).toBe(410);
  });

  it('inscrit au journal de l’établissement la consultation d’un résultat partagé par le médecin', async () => {
    await call('GET', `result/Laboratoire/LAB-DEMO-0412/${patient.matricule}`, doctor);
    const journal = (await call('GET', 'saas/admin/tenants/1/audit', admin)) as { items: AuditView[] };
    expect(journal.items[0]).toMatchObject({ action: 'result.viewed', target: 'LAB-DEMO-0412', user_name: 'Paul EKANÉ (Démo)' });
  });

  it('conserve les données dans l’onglet et les remet à zéro sur demande', async () => {
    await call('POST', 'saas/admin/tenants/1/patients', admin, { local_ref: 'PAT-DEMO-0099', first_name: 'Clarisse', last_name: 'MVONDO' });
    expect(sessionStorage.getItem('rohafya-demo-data')).toContain('PAT-DEMO-0099');
    resetDemoData();
    const patients = (await call('GET', 'saas/admin/tenants/1/patients', admin)) as { items: { local_ref: string }[] };
    expect(patients.items.some((p) => p.local_ref === 'PAT-DEMO-0099')).toBe(false);
  });
});
