import { HttpRequest } from '@angular/common/http';
import { CurrentUser } from '../connexion/current-user.model';
import {
  DoctorLinkView,
  LinkStatus,
  RecordKind,
  SubmissionAdminItem,
  SubmissionAnswer,
  TenantSettings,
  TenantStats,
} from '../saas/saas.models';
import { SUBMISSION_STATUS_LABELS, SubmissionKind, SubmissionStatus } from '../shared/submission/submission.models';
import { documentImage } from './demo-images';
import {
  Handler,
  LinkRow,
  SubmittedItem,
  TenantRow,
  TokenRow,
  account,
  adminTenants,
  allSubmissions,
  audit,
  auditView,
  body,
  db,
  displayName,
  establishments,
  fail,
  formatShortCode,
  fullName,
  inDays,
  linkView,
  matches,
  newId,
  normalize,
  notify,
  now,
  paged,
  tenant,
  tenantView,
  tokenStatus,
  tokenView,
} from './demo-store';

/**
 * Routes SaaS de la démonstration : profil (/saas/me), rattachements du patient, console de
 * l'administrateur d'établissement (/saas/admin). La démo ne propose pas de profil super-administrateur.
 * Mêmes réponses que l'API Flask (Rohafya/saas), calculées sur les données partagées de demo-store.
 */

const RECORD_KINDS: RecordKind[] = ['laboratoire', 'imagerie', 'exploration', 'facture'];
const LINK_STATUSES: LinkStatus[] = ['pending', 'active', 'revoked'];
const SUBMISSION_STATUSES: SubmissionStatus[] = ['recue', 'en_cours', 'traitee', 'refusee'];
const TENANT_EDITABLE: (keyof TenantSettings)[] = [
  'display_name',
  'result_access_days',
  'block_unpaid_results',
  'link_token_days',
  'primary_color',
  'contact_email',
  'contact_phone',
];
const SHORT_CODE_ALPHABET = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
const PDF_CLOSED = "L'import de résultats par PDF est disponible prochainement.";

// =====================================================================
// Aides
// =====================================================================

function random(alphabet: string, length: number): string {
  return Array.from({ length }, () => alphabet[Math.floor(Math.random() * alphabet.length)]).join('');
}

function compactCode(value: string): string {
  return value.toUpperCase().replace(/[^A-Z0-9]/g, '');
}

function newApiKey(t: TenantRow): string {
  const key = `rohafya_${random('abcdefghijklmnopqrstuvwxyz0123456789', 40)}`;
  t.api_key_hint = key.slice(-6);
  t.updated_at = now();
  return key;
}

function origin(): string {
  return typeof window !== 'undefined' ? window.location.origin : 'https://rohafya.com';
}

/** Établissement administré par l'utilisateur. */
function adminTenant(user: CurrentUser, id: string): TenantRow {
  const t = tenant(Number(id)) ?? fail(404, 'Établissement introuvable.');
  const member = db().members.some((m) => m.tenant_id === t.id && m.user_id === user.id);
  if (!member) fail(403, "Vous n'administrez pas cet établissement.");
  return t;
}

export function tenantStats(t: TenantRow): TenantStats {
  const s = db();
  const links = s.links.filter((l) => l.tenant_id === t.id);
  const records = s.records.filter((r) => r.tenant_id === t.id);
  const byKind = Object.fromEntries(RECORD_KINDS.map((k) => [k, records.filter((r) => r.kind === k).length])) as Record<RecordKind, number>;
  const last = records.map((r) => r.updated_at ?? r.created_at).sort().at(-1) ?? null;
  return {
    patients_known: s.dossiers.filter((d) => d.tenant_id === t.id).length,
    links_active: links.filter((l) => l.status === 'active').length,
    links_pending: links.filter((l) => l.status === 'pending').length,
    links_revoked: links.filter((l) => l.status === 'revoked').length,
    tokens_active: s.tokens.filter((tok) => tok.tenant_id === t.id && tokenStatus(tok) === 'active').length,
    records: byKind,
    records_total: records.length,
    last_record_at: last,
    doctors: s.practitioners.filter((p) => p.tenant_id === t.id).length,
    admins: s.members.filter((m) => m.tenant_id === t.id).length,
  };
}

function recentAudit(tenantId?: number) {
  return db()
    .audit.filter((a) => tenantId === undefined || a.tenant_id === tenantId)
    .slice()
    .reverse()
    .map(auditView);
}

// --- Patients d'un établissement -------------------------------------

function patientRow(t: TenantRow, localRef: string) {
  const s = db();
  const dossier = s.dossiers.find((d) => d.tenant_id === t.id && d.local_ref === localRef);
  const link = s.links.find((l) => l.tenant_id === t.id && l.local_ref === localRef);
  return {
    local_ref: localRef,
    first_name: dossier?.first_name ?? null,
    last_name: dossier?.last_name ?? null,
    email: dossier?.email ?? null,
    birth_date: dossier?.birth_date ?? null,
    gender: dossier?.gender ?? null,
    link_status: link?.status ?? ('none' as const),
    link_id: link?.id ?? null,
    account: link ? linkView(link) : null,
    records: s.records.filter((r) => r.tenant_id === t.id && r.local_ref === localRef).length,
  };
}

function setLinkStatus(link: LinkRow, status: LinkStatus, actorId: number): void {
  link.status = status;
  link.updated_at = now();
  if (status === 'active') link.verified_at = now();
  audit(`link.${status}`, { tenant_id: link.tenant_id, user_id: actorId, target: link.local_ref });
  const patientAccount = db().accounts.find((a) => link.patient_id !== null && a.patient_id === link.patient_id);
  const t = tenant(link.tenant_id);
  if (status === 'active' && patientAccount && t) {
    notify(patientAccount.id, 'Établissement rattaché', `Votre dossier de ${displayName(t)} est désormais accessible dans ROHAFYA.`);
  }
}

// --- Médecins ------------------------------------------------------------

function doctorView(p: { id: number; doctor_id: number; tenant_id: number; local_ref: string | null; created_at: string }): DoctorLinkView {
  const d = db().doctor.directory.find((doc) => doc.id === p.doctor_id);
  return {
    ...p,
    name: d ? `${d.DoctorName ?? ''} ${d.DoctorLastname ?? ''}`.trim() : null,
    email: d?.DoctorEmail ?? null,
    matricule: d?.DoctorFederationID ?? null,
    speciality: (d as { Speciality?: string } | undefined)?.Speciality ?? null,
    is_confirmed: !!d?.doctor_is_confirmed,
  };
}

// --- Demandes reçues -------------------------------------------------------

type SubmissionEntry = ReturnType<typeof allSubmissions>[number];

function adminView(entry: SubmissionEntry): SubmissionAdminItem {
  const sub = entry.item.submission!;
  const { submission: _submission, ...item } = entry.item as SubmittedItem & Record<string, unknown>;
  const author = account(entry.author_id);
  let name: string;
  let email: string | null = author?.email ?? null;
  if (author) {
    name = (sub.author_role === 'doctor' ? 'Dr ' : '') + fullName(author);
  } else if (entry.kind === 'requete') {
    name = `${item['first_name'] ?? ''} ${item['last_name'] ?? ''}`.trim() || 'Visiteur';
    email = (item['email'] as string | undefined) ?? null;
  } else {
    name = 'Un patient';
  }
  return {
    ...sub,
    author: { id: entry.author_id, name, email, role: sub.author_role },
    item,
    has_image: entry.kind !== 'requete',
  };
}

function tenantSubmission(t: TenantRow, id: string): SubmissionEntry {
  return (
    allSubmissions().find((e) => e.item.submission!.id === Number(id) && e.item.submission!.tenant_id === t.id) ??
    fail(404, 'Demande introuvable.')
  );
}

const KIND_LABELS: Record<SubmissionKind, string> = { prescription: 'prescription', pre_enregistrement: 'pré-enregistrement', requete: 'requête' };

function answer(entry: SubmissionEntry, actorId: number, data: Partial<SubmissionAnswer>): void {
  const sub = entry.item.submission!;
  const item = entry.item as SubmittedItem & Record<string, unknown>;
  if (data.status !== undefined) {
    if (!SUBMISSION_STATUSES.includes(data.status)) fail(400, `Statut inconnu : ${data.status}.`);
    sub.status = data.status;
    sub.status_label = SUBMISSION_STATUS_LABELS[data.status];
  }
  if (data.response !== undefined) sub.response = String(data.response).trim().slice(0, 5000) || null;
  if (data.quote_amount !== undefined) {
    if (data.quote_amount === '') {
      sub.quote_amount = null;
    } else {
      const amount = Number(data.quote_amount);
      if (Number.isNaN(amount) || amount < 0) fail(400, 'Montant du devis invalide.');
      sub.quote_amount = Math.round(amount * 100) / 100;
    }
  }
  sub.responded_at = now();
  // Anciens indicateurs lus par les écrans patient et médecin.
  if (entry.kind === 'requete') {
    item['valide'] = sub.status === 'traitee';
    item['rejected'] = sub.status === 'refusee';
    item['UpdatedAt'] = now();
    item['UpdatedBy'] = actorId;
  } else if (entry.kind === 'pre_enregistrement') {
    const done = sub.status === 'traitee';
    item['validated'] = done;
    item['validated_by'] = done ? actorId : null;
    item['validated_at'] = done ? now() : null;
  }
  audit(`submission.${entry.kind}.${sub.status}`, { tenant_id: sub.tenant_id, user_id: actorId, target: String(sub.id) });
  if (entry.author_id !== null && (sub.status !== 'recue' || sub.response)) {
    const establishment = sub.establishment ?? 'L’établissement';
    const status = sub.status_label.toLowerCase();
    const message =
      entry.kind === 'pre_enregistrement'
        ? `Votre pré-enregistrement envoyé à ${establishment} est ${status}.`
        : `Votre ${KIND_LABELS[entry.kind]} envoyée à ${establishment} est ${status}.`;
    notify(entry.author_id, `Réponse de ${establishment}`, message);
  }
}

function page(req: HttpRequest<unknown>) {
  return <T>(items: T[]) => paged(req, items);
}

// =====================================================================
// Routes
// =====================================================================

const T = 'saas/admin/tenants/:id';

export const SAAS_ROUTES: [string, Handler][] = [
  // --- Profil de l'utilisateur connecté -----------------------------------
  ['GET saas/me', ({ user }) => {
    const profile = db().patient.profile;
    return {
      is_super_admin: false,
      admin_tenants: adminTenants(user.id).map((t) => tenantView(t, false)),
      links: patientLinks(user.patient_id),
      // Démonstration : le module commissions n'est activé pour aucun établissement.
      features: { commissions: false },
      patient_federation_id: user.patient_id !== null && user.patient_id === profile.id ? profile.PatientFederationID : null,
    };
  }],
  ['GET saas/me/links', ({ user }) => patientLinks(user.patient_id)],
  ['POST saas/me/links/redeem', ({ req, user }) => redeem(req, user)],
  ['DELETE saas/me/links/:id', ({ params, user }) => {
    const link = db().links.find((l) => l.id === Number(params[0]) && l.patient_id === user.patient_id) ?? fail(404, 'Rattachement introuvable.');
    link.status = 'revoked';
    link.updated_at = now();
    audit('link.revoked_by_patient', { tenant_id: link.tenant_id, user_id: user.id, target: link.local_ref });
    return { message: `${linkView(link).establishment} a été retiré de votre compte.` };
  }],
  ['GET saas/public/establishments', () => establishments()],
  ['GET saas/public/link-tokens/:token', ({ params }) => {
    const token = db().tokens.find((t) => t.token === params[0]) ?? fail(404, 'Lien inconnu.');
    const t = tenant(token.tenant_id);
    return { establishment: t ? displayName(t) : '', status: tokenStatus(token), expires_at: token.expires_at };
  }],

  // --- Administrateur d'établissement --------------------------------------
  [`GET ${T}`, ({ user, params }) => tenantView(adminTenant(user, params[0]))],
  [`PUT ${T}/settings`, ({ req, user, params }) => {
    const t = adminTenant(user, params[0]);
    const data = body<Record<string, unknown>>(req);
    const changed: Record<string, unknown> = {};
    for (const key of TENANT_EDITABLE) {
      if (!(key in data)) continue;
      let value = data[key];
      if (key === 'result_access_days' || key === 'link_token_days') {
        value = Number(value);
        if (!Number.isInteger(value)) fail(400, `${key} doit être un nombre de jours.`);
        if ((value as number) < 1 || (value as number) > 3650) fail(400, `${key} doit être compris entre 1 et 3650 jours.`);
      } else if (key === 'block_unpaid_results') {
        value = !!value;
      } else {
        value = String(value ?? '').trim().slice(0, 200);
      }
      (t.settings as unknown as Record<string, unknown>)[key] = value;
      changed[key] = value;
    }
    t.updated_at = now();
    audit('tenant.settings_updated', { tenant_id: t.id, user_id: user.id, details: changed });
    return tenantView(t);
  }],
  [`POST ${T}/api-key`, ({ user, params }) => rotateKey(adminTenant(user, params[0]), user)],
  [`GET ${T}/dashboard`, ({ user, params }) => {
    const t = adminTenant(user, params[0]);
    return { ...tenantStats(t), recent_activity: recentAudit(t.id).slice(0, 8), tenant: tenantView(t, false) };
  }],
  [`GET ${T}/patients`, ({ req, user, params }) => {
    const t = adminTenant(user, params[0]);
    const q = req.params.get('q') ?? '';
    const rows = db()
      .dossiers.filter((d) => d.tenant_id === t.id && matches(q, d.first_name, d.last_name, d.email, d.local_ref))
      .sort((a, b) => `${a.last_name} ${a.first_name}`.localeCompare(`${b.last_name} ${b.first_name}`))
      .map((d) => patientRow(t, d.local_ref));
    return page(req)(rows);
  }],
  [`POST ${T}/patients`, ({ req, user, params }) => {
    const t = adminTenant(user, params[0]);
    if (t.source_type === 'gnuhealth') fail(400, 'Les patients de cet établissement proviennent de GNU Health.');
    const data = body<Record<string, string>>(req);
    const localRef = String(data['local_ref'] ?? '').trim();
    if (!localRef) fail(400, 'Le numéro de dossier (local_ref) est obligatoire.');
    let dossier = db().dossiers.find((d) => d.tenant_id === t.id && d.local_ref === localRef);
    const created = !dossier;
    if (!dossier) {
      dossier = { tenant_id: t.id, local_ref: localRef, first_name: null, last_name: null, email: null, phone: null, birth_date: null, gender: null, source: 'admin', created_at: now() };
      db().dossiers.push(dossier);
    }
    for (const key of ['first_name', 'last_name', 'email', 'phone', 'birth_date', 'gender'] as const) {
      if (key in data) dossier[key] = String(data[key] ?? '').trim() || null;
    }
    audit('patient.saved', { tenant_id: t.id, user_id: user.id, target: localRef });
    return { patient: { ...dossier }, created };
  }],
  [`GET ${T}/patients/:ref`, ({ user, params }) => {
    const t = adminTenant(user, params[0]);
    const ref = params[1];
    const dossier = db().dossiers.find((d) => d.tenant_id === t.id && d.local_ref === ref) ?? fail(404, 'Dossier introuvable dans cet établissement.');
    return {
      patient: { ...patientRow(t, ref), phone: dossier.phone, source: dossier.source },
      records: db().records.filter((r) => r.tenant_id === t.id && r.local_ref === ref).sort((a, b) => String(b.validated_at).localeCompare(String(a.validated_at))),
      tokens: db().tokens.filter((tok) => tok.tenant_id === t.id && tok.local_ref === ref).slice().reverse().slice(0, 10).map(tokenView),
    };
  }],
  [`GET ${T}/links`, ({ req, user, params }) => {
    const t = adminTenant(user, params[0]);
    const status = req.params.get('status') as LinkStatus | null;
    const rows = db()
      .links.filter((l) => l.tenant_id === t.id && (!status || !LINK_STATUSES.includes(status) || l.status === status))
      .slice()
      .reverse()
      .map(linkView);
    return page(req)(rows);
  }],
  [`POST ${T}/links/:linkId/approve`, ({ user, params }) => updateLink(user, params, 'active')],
  [`POST ${T}/links/:linkId/revoke`, ({ user, params }) => updateLink(user, params, 'revoked')],
  [`POST ${T}/link-tokens`, ({ req, user, params }) => issueToken(adminTenant(user, params[0]), req, user)],
  [`GET ${T}/link-tokens`, ({ req, user, params }) => {
    const t = adminTenant(user, params[0]);
    return page(req)(db().tokens.filter((tok) => tok.tenant_id === t.id).slice().reverse().map(tokenView));
  }],
  [`DELETE ${T}/link-tokens/:tokenId`, ({ user, params }) => {
    const t = adminTenant(user, params[0]);
    const token = db().tokens.find((tok) => tok.id === Number(params[1]) && tok.tenant_id === t.id) ?? fail(404, 'QR code introuvable.');
    if (tokenStatus(token) === 'active') {
      token.revoked_at = now();
      audit('link_token.revoked', { tenant_id: t.id, user_id: user.id, target: token.local_ref });
    }
    return tokenView(token);
  }],
  [`GET ${T}/doctors`, ({ user, params }) => {
    const t = adminTenant(user, params[0]);
    return db().practitioners.filter((p) => p.tenant_id === t.id).slice().reverse().map(doctorView);
  }],
  [`POST ${T}/doctors`, ({ req, user, params }) => {
    const t = adminTenant(user, params[0]);
    const data = body<{ matricule: string; email: string; local_ref: string }>(req);
    const identifier = normalize(String(data.matricule || data.email || '').trim());
    if (!identifier) fail(400, "Indiquez le matricule ou l'e-mail du médecin.");
    const doctor =
      db().doctor.directory.find((d) => normalize(d.DoctorFederationID) === identifier || normalize(d.DoctorEmail) === identifier) ??
      fail(404, 'Aucun médecin ROHAFYA ne correspond à ce matricule ou à cet e-mail.');
    const existing = db().practitioners.find((p) => p.tenant_id === t.id && p.doctor_id === doctor.id);
    if (existing) return doctorView(existing);
    const link = { id: newId(), doctor_id: doctor.id, tenant_id: t.id, local_ref: data.local_ref || null, created_at: now() };
    db().practitioners.push(link);
    audit('doctor.linked', { tenant_id: t.id, user_id: user.id, target: doctor.DoctorFederationID });
    return doctorView(link);
  }],
  [`DELETE ${T}/doctors/:linkId`, ({ user, params }) => {
    const t = adminTenant(user, params[0]);
    const link = db().practitioners.find((p) => p.id === Number(params[1]) && p.tenant_id === t.id) ?? fail(404, 'Médecin introuvable dans cet établissement.');
    db().practitioners = db().practitioners.filter((p) => p !== link);
    audit('doctor.unlinked', { tenant_id: t.id, user_id: user.id, target: doctorView(link).matricule });
    return { message: "Médecin retiré de l'établissement." };
  }],
  [`GET ${T}/records`, ({ req, user, params }) => {
    const t = adminTenant(user, params[0]);
    const kind = req.params.get('kind') as RecordKind | null;
    const q = req.params.get('q') ?? '';
    const rows = db()
      .records.filter((r) => r.tenant_id === t.id && (!kind || !RECORD_KINDS.includes(kind) || r.kind === kind) && matches(q, r.code, r.local_ref))
      .sort((a, b) => String(b.updated_at ?? b.created_at).localeCompare(String(a.updated_at ?? a.created_at)));
    return page(req)(rows);
  }],
  [`GET ${T}/audit`, ({ req, user, params }) => page(req)(recentAudit(adminTenant(user, params[0]).id))],
  [`GET ${T}/submissions`, ({ req, user, params }) => {
    const t = adminTenant(user, params[0]);
    const kind = req.params.get('kind') as SubmissionKind | null;
    const status = req.params.get('status') as SubmissionStatus | null;
    const q = req.params.get('q') ?? '';
    const ofTenant = allSubmissions().filter((e) => e.item.submission!.tenant_id === t.id);
    const counts: Partial<Record<SubmissionKind, Partial<Record<SubmissionStatus, number>>>> = {};
    for (const e of ofTenant) {
      const byStatus = (counts[e.kind] ??= {});
      byStatus[e.item.submission!.status] = (byStatus[e.item.submission!.status] ?? 0) + 1;
    }
    const rows = ofTenant
      .filter((e) => (!kind || e.kind === kind) && (!status || e.item.submission!.status === status))
      .map(adminView)
      .filter((v) => matches(q, v.author.name, v.author.email, v.patient_name))
      .sort((a, b) => String(b.created_at).localeCompare(String(a.created_at)));
    return { ...page(req)(rows), counts };
  }],
  [`GET ${T}/submissions/:sid/image`, ({ user, params }) => {
    const entry = tenantSubmission(adminTenant(user, params[0]), params[1]);
    if (entry.kind === 'requete') fail(404, 'Aucune image jointe.');
    const key = `${entry.kind === 'prescription' ? 'prescription' : 'save'}-${entry.item.id}`;
    return db().uploads.get(key) ?? documentImage(entry.kind === 'prescription' ? 'Ordonnance' : 'Pièce jointe', adminView(entry).author.name);
  }],
  [`PUT ${T}/submissions/:sid`, ({ req, user, params }) => {
    const entry = tenantSubmission(adminTenant(user, params[0]), params[1]);
    const data = body<SubmissionAnswer>(req);
    if (!('status' in data || 'response' in data || 'quote_amount' in data)) fail(400, 'Indiquez un statut, une réponse ou un montant.');
    answer(entry, user.id, data);
    return adminView(entry);
  }],
  [`GET ${T}/pdf-imports`, () => fail(403, PDF_CLOSED)],
  [`POST ${T}/pdf-imports`, () => fail(403, PDF_CLOSED)],

];

// =====================================================================
// Rattachements
// =====================================================================

function patientLinks(patientId: number | null) {
  if (patientId === null) return [];
  return db()
    .links.filter((l) => l.patient_id === patientId && l.status !== 'revoked')
    .map(linkView);
}

function patientEmail(user: CurrentUser): string {
  const profile = db().patient.profile;
  return normalize(user.patient_id === profile.id ? profile.PatientEmail : user.email);
}

/** Code court (« CHR-7K2P ») ou jeton du lien /l/<jeton>, généré par l'administrateur d'établissement. */
function redeem(req: HttpRequest<unknown>, user: CurrentUser) {
  if (user.patient_id === null) fail(403, 'Seul un compte patient peut rattacher un dossier.');
  const data = body<{ code: string; token: string }>(req);
  const raw = String(data.code || data.token || '').trim();
  if (!raw) fail(400, 'Saisissez le code imprimé sur votre facture.');
  const token: TokenRow =
    db().tokens.find((t) => t.token === raw || t.short_code === compactCode(raw)) ??
    fail(
      404,
      "Code invalide. En démonstration, ouvrez le profil « Administrateur d'établissement », générez un QR code (menu QR codes) puis saisissez ici son code court."
    );
  const status = tokenStatus(token);
  if (status === 'used') fail(410, 'Ce code a déjà été utilisé.');
  if (status === 'expired') fail(410, "Ce code a expiré. Demandez-en un nouveau à l'accueil de l'établissement.");
  if (status === 'revoked') fail(404, "Code invalide. Vérifiez-le ou demandez-en un nouveau à l'accueil.");
  const t = tenant(token.tenant_id) ?? fail(404, 'Établissement introuvable.');
  if (!t.is_active) fail(410, "Cet établissement n'est plus actif sur ROHAFYA.");

  let link = db().links.find((l) => l.tenant_id === t.id && l.local_ref === token.local_ref);
  if (link && link.patient_id !== user.patient_id && link.status !== 'revoked') {
    audit('link.conflict', { tenant_id: t.id, user_id: user.id, target: token.local_ref });
    fail(409, "Ce dossier est déjà rattaché à un autre compte. Contactez l'établissement.");
  }
  const dossier = db().dossiers.find((d) => d.tenant_id === t.id && d.local_ref === token.local_ref);
  const expected = normalize(token.email_hint || dossier?.email || '');
  const status_: LinkStatus = expected && expected === patientEmail(user) ? 'active' : 'pending';
  if (!link) {
    link = { id: newId(), patient_id: user.patient_id, tenant_id: t.id, local_ref: token.local_ref, status: status_, method: null, verified_at: null, created_at: now(), updated_at: null };
    db().links.push(link);
  }
  link.patient_id = user.patient_id;
  link.status = status_;
  link.method = token.token === raw ? 'qr' : 'code';
  link.verified_at = status_ === 'active' ? now() : null;
  link.updated_at = now();
  token.used_at = now();
  audit(`link.${status_}`, { tenant_id: t.id, user_id: user.id, target: token.local_ref });
  const message =
    status_ === 'active'
      ? `${displayName(t)} a été ajouté à votre compte.`
      : `Votre demande de rattachement à ${displayName(t)} est en attente de validation par l'établissement.`;
  return { message, link: linkView(link) };
}

function updateLink(user: CurrentUser, params: string[], status: LinkStatus) {
  const t = adminTenant(user, params[0]);
  const link = db().links.find((l) => l.id === Number(params[1]) && l.tenant_id === t.id) ?? fail(404, 'Rattachement introuvable.');
  setLinkStatus(link, status, user.id);
  return linkView(link);
}

function issueToken(t: TenantRow, req: HttpRequest<unknown>, user: CurrentUser) {
  const data = body<{ local_ref: string; email: string }>(req);
  const localRef = String(data.local_ref ?? '').trim();
  if (!localRef) fail(400, 'Indiquez le numéro de dossier du patient.');
  const active = db().links.find((l) => l.tenant_id === t.id && l.local_ref === localRef && l.status === 'active');
  if (active) return { already_linked: true, local_ref: localRef };
  for (const previous of db().tokens.filter((tok) => tok.tenant_id === t.id && tok.local_ref === localRef && tokenStatus(tok) === 'active')) {
    previous.revoked_at = now();
  }
  const dossier = db().dossiers.find((d) => d.tenant_id === t.id && d.local_ref === localRef);
  const token: TokenRow = {
    id: newId(),
    tenant_id: t.id,
    local_ref: localRef,
    email_hint: normalize(String(data.email ?? '').trim()) || dossier?.email || null,
    token: random('abcdefghijklmnopqrstuvwxyz0123456789', 24),
    short_code: random(SHORT_CODE_ALPHABET, 7),
    expires_at: inDays(t.settings.link_token_days || 30),
    used_at: null,
    revoked_at: null,
    created_at: now(),
  };
  db().tokens.push(token);
  audit('link_token.issued', { tenant_id: t.id, user_id: user.id, target: localRef });
  return {
    already_linked: false,
    token_id: token.id,
    local_ref: localRef,
    url: `${origin()}/l/${token.token}`,
    short_code: formatShortCode(token.short_code),
    expires_at: token.expires_at,
    establishment: displayName(t),
  };
}

function rotateKey(t: TenantRow, user: CurrentUser) {
  if (t.source_type === 'gnuhealth') fail(400, "Cet établissement est relié directement à GNU Health : aucune clé d'API n'est nécessaire.");
  const key = newApiKey(t);
  audit('tenant.api_key_rotated', { tenant_id: t.id, user_id: user.id });
  return { api_key: key, message: 'Copiez cette clé maintenant : elle ne sera plus jamais affichée.' };
}
