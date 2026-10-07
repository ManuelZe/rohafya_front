import { HttpErrorResponse, HttpRequest, HttpResponse } from '@angular/common/http';
import { Observable, delay, of, switchMap, throwError, timer } from 'rxjs';
import { environment } from '../../environments/environment';
import { CurrentUser } from '../connexion/current-user.model';
import { DoctorProfile } from '../doctors/doctor.models';
import { AppNotification } from '../notifications/notifications.models';
import { DevisLine, ProductSearchResult } from '../patients/devis/devis.models';
import { SavePatient } from '../patients/enregistrement/enregistrement.models';
import { Prescription } from '../patients/prescriptions/prescriptions.models';
import { UserRequest } from '../patients/requests/requests.models';
import { ExamResultDetail, ExamType, SendResult } from '../patients/resultats/resultats.models';
import { Suggestion } from '../patients/suggestion-box/suggestion-box.models';
import { SubmissionKind } from '../shared/submission/submission.models';
import { articleImage, documentImage, signatureImage } from './demo-images';
import { SAAS_ROUTES } from './demo-saas';
import {
  DemoHttpError,
  Handler,
  audit,
  db,
  establishments,
  fail,
  find,
  makeSubmission,
  newId,
  normalize,
  notify,
  now,
  persist,
  remove,
} from './demo-store';

export { demoUser, resetDemoData } from './demo-store';

/**
 * « API » de démonstration : répond aux mêmes URL que l'API Flask à partir des fichiers de ./data.
 * Chargé à la demande (import dynamique) uniquement lorsqu'une session démo est ouverte : il
 * n'alourdit pas l'application pour les vrais comptes.
 *
 * Les trois profils (patient, médecin, administrateur d'établissement) partagent les mêmes
 * données (demo-store.ts) : une demande envoyée par le patient arrive chez l'établissement, qui
 * répond ; tout est inscrit au journal de l'établissement.
 *
 * Les dates des JSON sont relatives au jour courant (« @J-3 », « @J+87T09:00 ») afin que la
 * démo reste crédible quel que soit le jour de la présentation.
 *
 * Rien n'est jamais envoyé au serveur : les modifications restent dans l'onglet (sessionStorage).
 */

const LATENCY_MS = 350;
const EXPIRED_MESSAGE = "La période d'accès aux détails de ce résultat est expirée.";
const UNAVAILABLE_MESSAGE = "Cette fonctionnalité n'est pas disponible en mode démo.";
/** Établissement d'où proviennent les résultats du patient démo. */
const RESULTS_TENANT_ID = 1;

// =====================================================================
// Routage
// =====================================================================

/** Gabarit « GET laboratoire/more_infos/:name/result » : un « : » capture un segment. */
const ROUTES: [string, Handler][] = [
  // --- Session -------------------------------------------------------
  ['POST user/logout', () => ({ 'Message ': 'Déconnexion de la session démo.' })],

  // --- Profil patient -----------------------------------------------
  ['GET patient/factures/products/:ref', ({ params }) => db().patient.facture_products[params[0]] ?? fail(404, 'Aucune facture trouvée pour cette référence.')],
  ['GET patient/factures/:id', () => db().patient.factures],
  ['GET patient/:id', () => db().patient.profile],
  ['PUT patient/update/:id', ({ req }) => {
    Object.assign(db().patient.profile, req.body, { patient_is_confirmed: true, ModifiedAt: now() });
    return { message: 'Informations mises à jour.' };
  }],

  // --- Examens --------------------------------------------------------
  ['GET laboratoire/all_results', () => db().patient.laboratoire],
  ['GET laboratoire/more_infos/:name/result', ({ params }) =>
    examDetails(db().patient.laboratoire.find((r) => r.name === params[0]), db().patient.laboratoire_details[params[0]])],
  ['GET imagerie/all_results', () => db().patient.imagerie],
  ['GET imagerie/more_infos/:number/result', ({ params }) =>
    examDetails(db().patient.imagerie.find((r) => r.number === params[0]), db().patient.imagerie_details[params[0]])],
  ['GET exploration/all_results', () => db().patient.exploration],
  ['GET exploration/more_infos/:name/result', ({ params }) =>
    examDetails(db().patient.exploration.find((r) => r.name === params[0]), db().patient.exploration_details[params[0]])],

  // --- Prescriptions --------------------------------------------------
  ['GET prescription/all_prescriptions', ({ req }) =>
    isDoctorSpace(req) ? db().doctorPrescriptions : db().patient.prescriptions],
  ['POST prescription/add', ({ req, user }) => {
    const form = formData(req);
    const id = newId();
    const doctor = form.get('audience') === 'doctor';
    const prescription: Prescription = {
      id,
      NameDoctor: doctor ? `Dr ${user.prenom} ${user.nom}` : form.get('NameDoctor')?.toString() ?? '',
      OrdreDoctor: doctor ? 'ONMC-DEMO' : form.get('OrdreDoctor')?.toString() ?? '',
      Description: form.get('Description')?.toString() ?? '',
      demande_devis: form.get('demande_devis') === 'true',
      Sequence: `PRES-DEMO-${String(id).slice(-4)}`,
      Create_date: now(),
      patient_id: doctor ? null : user.patient_id ?? 0,
      submission: submit('prescription', tenantOf(form), doctor, user, doctor ? form.get('patient_name')?.toString() : undefined),
    };
    keepUpload(`prescription-${id}`, form.get('file'));
    (doctor ? db().doctorPrescriptions : db().patient.prescriptions).unshift(prescription);
    return prescription;
  }],
  ['GET prescription/image/:id', ({ params }) =>
    db().uploads.get(`prescription-${params[0]}`) ?? documentImage('Ordonnance', prescriptionLabel(Number(params[0])))],
  ['DELETE prescription/del/:id', ({ params }) => {
    remove(db().patient.prescriptions, Number(params[0]));
    remove(db().doctorPrescriptions, Number(params[0]));
    return { message: 'Prescription supprimée.' };
  }],
  ['GET prescription/devis/:id', ({ params }) =>
    db().patient.prescription_devis[params[0]] ?? {
      prescription_id: Number(params[0]),
      details: "Votre demande de devis a bien été reçue. L'administration vous répondra sous 24 h.",
    }],

  // --- Pré-enregistrements -------------------------------------------
  ['GET save_patient/all_save_patients', ({ req }) => (isDoctorSpace(req) ? db().doctorSaves : db().patient.saves)],
  ['GET save_patient/get_patient_saves/:id', () => db().patient.saves],
  ['GET save_patient/get/:id', ({ params }) => find(db().patient.saves, Number(params[0]))],
  ['POST save_patient/add', ({ req, user }) => {
    const form = formData(req);
    const doctor = form.get('audience') === 'doctor';
    const save: SavePatient = {
      id: newId(),
      nom: form.get('nom')?.toString() ?? '',
      prenom: form.get('prenom')?.toString() ?? '',
      description: form.get('description')?.toString() ?? '',
      patient_id: doctor ? null : user.patient_id ?? 0,
      Create_date: now(),
      validated: false,
      validated_by: null,
      validated_at: null,
      submission: submit('pre_enregistrement', tenantOf(form), doctor, user),
    };
    keepUpload(`save-${save.id}`, form.get('file'));
    (doctor ? db().doctorSaves : db().patient.saves).unshift(save);
    return save;
  }],
  ['GET save_patient/get_image/:id', ({ params }) =>
    db().uploads.get(`save-${params[0]}`) ?? documentImage('Pièce jointe', 'Document de pré-enregistrement')],
  ['DELETE save_patient/delete/:id', ({ params }) => {
    remove(db().patient.saves, Number(params[0]));
    remove(db().doctorSaves, Number(params[0]));
    return { message: 'Pré-enregistrement supprimé.' };
  }],

  // --- Résultats partagés --------------------------------------------
  ['POST send_result', ({ req, user }) => {
    const body = req.body as Pick<SendResult, 'doctor_id' | 'exam_type' | 'exam_code' | 'envoi_email'>;
    const result: SendResult = {
      id: newId(),
      doctor_id: body.doctor_id,
      patient_id: user.patient_id ?? 0,
      exam_type: body.exam_type,
      exam_code: body.exam_code,
      patient_federation_id: user.matricule,
      envoi_email: !!body.envoi_email,
      sended_at: now(),
    };
    db().sendResults.unshift(result);
    const recipient = db().accounts.find((a) => a.doctor_id === result.doctor_id);
    if (recipient) {
      notify(recipient.id, 'Nouveau résultat partagé', `${user.prenom} ${user.nom} vous a partagé son résultat ${result.exam_type} ${result.exam_code}.`);
    }
    return { message: 'Résultat partagé avec succès.', data: result };
  }],
  ['GET send_result/patient/:id', ({ params }) => db().sendResults.filter((r) => r.patient_id === Number(params[0]))],
  ['GET send_result/doctor/:id', ({ params }) => db().sendResults.filter((r) => r.doctor_id === Number(params[0]))],
  ['PUT send_result/modify/:id', ({ req, params }) => Object.assign(find(db().sendResults, Number(params[0])), req.body)],
  ['DELETE send_result/del/:id', ({ params }) => {
    remove(db().sendResults, Number(params[0]));
    return { message: 'Partage supprimé.' };
  }],
  ['GET result/:type/:code/:fed', ({ params, user }) => {
    const exam = sharedExam(params[0] as ExamType, params[1], params[2]);
    if (user.doctor_id !== null && params[2] === db().patient.profile.PatientFederationID && Array.isArray(exam.summary)) {
      audit('result.viewed', { tenant_id: RESULTS_TENANT_ID, user_id: user.id, target: params[1], details: { exam_type: params[0] } });
    }
    return exam.summary;
  }],
  ['GET result/more_infos/:type/:code/:fed', ({ params }) => sharedExam(params[0] as ExamType, params[1], params[2]).details],

  // --- Annuaire des médecins -----------------------------------------
  ['GET doctors/informations/matricule/:matricule', ({ params }) =>
    db().doctor.directory.find((d) => d.DoctorFederationID?.toUpperCase() === params[0].trim().toUpperCase()) ??
    fail(404, 'Aucun médecin trouvé pour ce matricule.')],
  ['GET doctors/informations/:id', ({ params }) => doctorProfile(Number(params[0]))],
  ['PUT doctors/update/:id', ({ req, params }) => ({
    Doctor: Object.assign(doctorProfile(Number(params[0])), req.body, { ModifiedAt: now() }),
  })],
  ['PUT doctors/confirm/:id', ({ params }) => ({
    Doctor: Object.assign(doctorProfile(Number(params[0])), { doctor_is_confirmed: true }),
  })],
  ['GET doctors/signature/matricule/:matricule', () => signatureImage()],

  // --- Requêtes -------------------------------------------------------
  ['GET requete', () => db().requests],
  ['GET requete/get_requests/:userId', ({ params }) => db().requests.filter((r) => Number(r.CreatedBy) === Number(params[0]))],
  ['POST requete/add', ({ req, user }) => {
    const body = req.body as UserRequest;
    const request: UserRequest = {
      ...body,
      id: newId(),
      CreatedAt: now(),
      CreatedBy: String(user.id),
      UpdatedAt: null,
      UpdatedBy: null,
      valide: false,
      submission: submit('requete', Number(body.tenant_id) || establishments()[0]?.id, body.audience === 'doctor' && user.doctor_id !== null, user),
    };
    db().requests.unshift(request);
    return request;
  }],
  ['DELETE requete/del/:id', ({ params }) => {
    remove(db().requests, Number(params[0]));
    return { message: 'Requête supprimée.' };
  }],

  // --- Boîte à suggestions -------------------------------------------
  ['GET suggestions/for_user', () => db().patient.suggestions],
  ['POST suggestions/add', ({ req, user }) => {
    const body = req.body as { content: string; note?: number | null };
    const suggestion: Suggestion = {
      id: newId(),
      content: body.content,
      Note: body.note ?? null,
      CreatedAt: now(),
      UpdatedAt: null,
      CreatedBy: user.id,
      UpdatedBy: null,
    };
    db().patient.suggestions.unshift(suggestion);
    return { message: 'Merci pour votre suggestion !', suggestion };
  }],
  ['PUT suggestions/update/:id', ({ req, params, user }) => {
    const body = req.body as { content?: string; note?: number | null };
    const suggestion = find(db().patient.suggestions, Number(params[0]));
    if (body.content !== undefined) suggestion.content = body.content;
    if (body.note !== undefined) suggestion.Note = body.note;
    suggestion.UpdatedAt = now();
    suggestion.UpdatedBy = user.id;
    return suggestion;
  }],
  ['DELETE suggestions/delete/:id', ({ params }) => {
    remove(db().patient.suggestions, Number(params[0]));
    return { message: 'Suggestion supprimée.' };
  }],

  // --- Devis ----------------------------------------------------------
  ['GET devis/liste_prix', () => db().patient.price_lists],
  ['GET devis/liste_prix/moi', () => db().patient.price_lists.find((l) => l.id === db().patient.my_price_list_id) ?? { Message: 'Aucune liste de prix.' }],
  ['GET devis/produits/recherche', ({ req }) => searchProducts(req.params.get('q') ?? '', Number(req.params.get('limit') ?? 20))],
  ['POST devis/calculer/:id', ({ req, params }) => computeDevis(Number(params[0]), (req.body as { produits: { product_id: number; quantity: number }[] }).produits)],

  // --- Notifications --------------------------------------------------
  ['GET notifications/user/:userId', ({ params }) => notificationsOf(Number(params[0]))],
  ['GET notifications/type/:typeId', ({ params, user }) => notificationsOf(user.id).filter((n) => n.types === Number(params[0]))],
  ['GET notifications/etiquette/:id', () => []],
  ['PUT notifications/mark_read/:id', ({ params }) => {
    Object.assign(find(db().notifications, Number(params[0])), { is_read: true, read_at: now() });
    return { message: 'Notification lue.' };
  }],
  ['DELETE notifications/user/del/:id', ({ params }) => {
    remove(db().notifications, Number(params[0]));
    return { message: 'Notification supprimée.' };
  }],
  ['DELETE notifications/user/:userId/del_all', ({ params }) => {
    const userId = Number(params[0]);
    db().notifications = db().notifications.filter((n) => n.user_id !== userId && !n.all_users);
    return { message: 'Notifications supprimées.' };
  }],
  ['DELETE notifications/user/:userId/del/:id', ({ params }) => {
    remove(db().notifications, Number(params[1]));
    return { message: 'Notification supprimée.' };
  }],

  // --- Actualités -----------------------------------------------------
  ['GET blog', () => db().doctor.articles],
  ['GET blog/image/:id', ({ params }) => {
    const index = Math.max(0, db().doctor.articles.findIndex((a) => a.id === Number(params[0])));
    return articleImage(db().doctor.articles[index]?.titre ?? 'Actualité', index);
  }],

];

function segments(path: string): string[] {
  return path.split('/').filter(Boolean);
}

const COMPILED_ROUTES = [...ROUTES, ...SAAS_ROUTES].map(([pattern, handler]) => {
  const [method, path] = pattern.split(' ');
  return { method, parts: segments(path), handler };
});

function match(method: string, path: string): { handler: Handler; params: string[] } | null {
  const parts = segments(path);
  for (const route of COMPILED_ROUTES) {
    if (route.method !== method || route.parts.length !== parts.length) continue;
    const params: string[] = [];
    const ok = route.parts.every((part, i) => {
      if (part.startsWith(':')) {
        params.push(decodeURIComponent(parts[i]));
        return true;
      }
      return part === parts[i];
    });
    if (ok) return { handler: route.handler, params };
  }
  return null;
}

/** Point d'entrée appelé par demoInterceptor. */
export function handleDemoRequest(req: HttpRequest<unknown>, user: CurrentUser): Observable<HttpResponse<unknown>> {
  const path = req.url.slice(environment.apiUrl.length);
  const route = match(req.method, path);

  try {
    if (!route) throw new DemoHttpError(404, UNAVAILABLE_MESSAGE);
    const body = route.handler({ req, user, params: route.params });
    if (req.method !== 'GET') persist();
    // Copie : un composant qui modifierait sa réponse ne doit pas altérer les données de démo.
    const payload = body instanceof Blob ? body : structuredClone(body);
    return of(new HttpResponse({ status: 200, url: req.url, body: payload })).pipe(delay(LATENCY_MS));
  } catch (err) {
    const status = err instanceof DemoHttpError ? err.status : 500;
    const message = err instanceof DemoHttpError ? err.message : 'Erreur inattendue du mode démo.';
    if (!(err instanceof DemoHttpError)) console.error(err);
    const error = new HttpErrorResponse({ status, statusText: message, url: req.url, error: { message } });
    return timer(LATENCY_MS).pipe(switchMap(() => throwError(() => error)));
  }
}

// =====================================================================
// Aides
// =====================================================================

/** Appel fait depuis l'espace médecin (?audience=doctor). */
function isDoctorSpace(req: HttpRequest<unknown>): boolean {
  return req.params.get('audience') === 'doctor';
}

/** Établissement choisi dans un formulaire multipart (premier établissement actif à défaut). */
function tenantOf(form: FormData): number {
  return Number(form.get('tenant_id')) || establishments()[0]?.id;
}

/** Adresse une demande à un établissement actif et l'inscrit à son journal (vu par l'administrateur). */
function submit(kind: SubmissionKind, tenantId: number, fromDoctor: boolean, user: CurrentUser, patientName?: string) {
  if (!establishments().some((e) => e.id === tenantId)) fail(400, 'Choisissez un établissement actif.');
  const submission = makeSubmission(kind, tenantId, fromDoctor ? 'doctor' : 'patient', 'recue', { patient_name: patientName });
  audit(`submission.${kind}.created`, { tenant_id: tenantId, user_id: user.id, target: String(submission.id) });
  return submission;
}

function formData(req: HttpRequest<unknown>): FormData {
  return req.body instanceof FormData ? req.body : new FormData();
}

function keepUpload(key: string, value: FormDataEntryValue | null): void {
  if (value instanceof Blob) db().uploads.set(key, value);
}

function examDetails(exam: { statut_expiration: boolean } | undefined, details: ExamResultDetail[] | undefined): unknown {
  if (!exam) return [];
  return exam.statut_expiration ? { Message: EXPIRED_MESSAGE } : (details ?? []);
}

/** Résultat d'examen consulté par un médecin (partagé par le patient démo ou par un autre patient fictif). */
function sharedExam(type: ExamType, code: string, federationId: string): { summary: unknown; details: unknown } {
  const foreign = db().doctor.other_patient_results.find(
    (r) => r.send_result.exam_code === code && r.send_result.patient_federation_id === federationId
  );
  if (foreign) return { summary: [foreign.summary], details: foreign.details };

  const patient = db().patient;
  if (federationId !== patient.profile.PatientFederationID) {
    return { summary: { message: 'Résultat introuvable.' }, details: { message: 'Résultat introuvable.' } };
  }
  const sources = {
    Laboratoire: [patient.laboratoire.find((r) => r.name === code), patient.laboratoire_details[code]],
    Imagerie: [patient.imagerie.find((r) => r.number === code), patient.imagerie_details[code]],
    Exploration: [patient.exploration.find((r) => r.name === code), patient.exploration_details[code]],
  } as const;
  const [exam, details] = sources[type] ?? [undefined, undefined];
  if (!exam) return { summary: { message: 'Résultat introuvable.' }, details: { message: 'Résultat introuvable.' } };
  return { summary: [exam], details: examDetails(exam, details as ExamResultDetail[] | undefined) };
}

function doctorProfile(id: number): DoctorProfile {
  return db().doctor.directory.find((d) => d.id === id) ?? fail(404, 'Aucun Docteur trouvé avec cet ID.');
}

function notificationsOf(userId: number): AppNotification[] {
  return db().notifications.filter((n) => n.user_id === userId || n.all_users);
}

function prescriptionLabel(id: number): string {
  const prescription = db().patient.prescriptions.find((p) => p.id === id);
  return prescription ? `${prescription.Sequence} — ${prescription.NameDoctor}` : 'Ordonnance';
}

// --- Devis ------------------------------------------------------------

function searchProducts(query: string, limit: number): ProductSearchResult[] {
  const q = normalize(query.trim());
  return db()
    .patient.products.filter((p) => !q || normalize(p.name).includes(q) || normalize(p.code).includes(q))
    .slice(0, limit);
}

function computeDevis(priceListId: number, produits: { product_id: number; quantity: number }[]): unknown {
  const patient = db().patient;
  const priceList = patient.price_lists.find((l) => l.id === priceListId) ?? fail(404, 'Liste de prix introuvable.');
  const discount = priceList.id === patient.my_price_list_id ? 0 : patient.insured_discount;
  const lignes: DevisLine[] = produits.map(({ product_id, quantity }) => {
    const product = patient.products.find((p) => p.id === product_id);
    if (!product) return { product_id, Message: 'Produit introuvable.' };
    const unit_price = Math.round(product.list_price * (1 - discount));
    return { product_id, code: product.code, name: product.name, list_price: product.list_price, unit_price, quantity, amount: unit_price * quantity };
  });
  return {
    price_list: { id: priceList.id, name: priceList.name },
    lignes,
    montant_total: lignes.reduce((sum, l) => sum + (l.amount ?? 0), 0),
  };
}
