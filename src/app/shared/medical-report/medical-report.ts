import { ExamResultDetail, ExamType } from '../../patients/resultats/resultats.models';
import { parsePythonLiteral } from '../../doctors/resultats/result-fields';

/**
 * Compte rendu médical normalisé, commun aux trois types d'examens et aux espaces patient / médecin.
 *
 * Contenu inspiré des recommandations de présentation des résultats :
 * - biologie (ISO 15189, § 7.4.1.6) : identification du patient, de l'examen et de l'établissement,
 *   prescripteur, dates, résultats avec unité et intervalle de référence, signalement des valeurs
 *   anormales, interprétation, validation (nom et date) ;
 * - imagerie : indication, technique, résultats, conclusion ;
 * - exploration fonctionnelle : indication, technique, mesures et normes, interprétation, conclusion,
 *   recommandations.
 * La conclusion est mise en tête : c'est ce que le lecteur cherche en premier.
 */

export type MeasureFlag = 'low' | 'high' | 'abnormal' | 'normal' | 'unknown';

export interface ReportMeasure {
  name: string;
  /** Valeur affichée (numérique ou texte, ex. « Négatif »). */
  value: string;
  numeric: number | null;
  unit: string;
  /** Intervalle de référence tel que fourni (« 12 – 16 », « < 450 »). */
  range: string;
  low: number | null;
  high: number | null;
  flag: MeasureFlag;
  remarks: string;
}

export interface ReportSection {
  title: string;
  text: string;
}

export interface ReportStudy {
  description: string;
  date: string | null;
  institution: string;
  physician: string;
  link: string | null;
}

export interface ReportFact {
  label: string;
  value: string;
  /** Valeur ISO à formater comme une date. */
  date?: boolean;
}

export interface ReportPatient {
  name: string;
  identifier: string;
  birthDate: string | null;
  age: string;
  sex: string;
}

export interface MedicalReport {
  kind: ExamType;
  /** « Biologie médicale », « Imagerie médicale », « Exploration fonctionnelle ». */
  discipline: string;
  /** Titre du document imprimé : « Compte rendu de biologie médicale »… */
  documentTitle: string;
  code: string;
  title: string;
  establishment: string | null;
  patient: ReportPatient;
  validatedAt: string | null;
  validatedBy: string;
  /** Conclusion ou diagnostic, affiché en premier. */
  conclusion: ReportSection | null;
  sections: ReportSection[];
  measures: ReportMeasure[];
  /** Titre du tableau : « Paramètres analysés » (biologie), « Mesures » (exploration). La rubrique « Résultats » porte le résultat rédigé. */
  measuresTitle: string;
  /** Valeurs relues dans le compte rendu (sans valeurs de référence) faute de détail disponible. */
  measuresFromReport: boolean;
  studies: ReportStudy[];
  dates: ReportFact[];
  people: ReportFact[];
}

export interface PatientIdentity {
  name?: string | null;
  identifier?: string | null;
  birthDate?: string | null;
  sex?: string | null;
}

const DISCIPLINES: Record<ExamType, [discipline: string, documentTitle: string]> = {
  Laboratoire: ['Biologie médicale', 'Compte rendu de biologie médicale'],
  Imagerie: ['Imagerie médicale', "Compte rendu d'imagerie médicale"],
  Exploration: ['Exploration fonctionnelle', "Compte rendu d'exploration fonctionnelle"],
};

// =====================================================================
// Lecture des valeurs
// =====================================================================

export function text(value: unknown): string {
  if (value === null || value === undefined) return '';
  if (typeof value === 'boolean') return value ? 'Oui' : 'Non';
  return String(value).trim();
}

/** « 11,4 », « 11.4 », 11.4 → 11.4 ; tout autre texte → null. */
export function toNumber(value: unknown): number | null {
  if (typeof value === 'number') return Number.isFinite(value) ? value : null;
  const raw = text(value).replace(/\s/g, '').replace(',', '.');
  return /^[-+]?\d+(\.\d+)?$/.test(raw) ? Number(raw) : null;
}

/** Bornes d'un intervalle écrit : « 12 – 16 », « 3,8 - 5,2 », « 12 à 16 », « < 450 », « ≥ 60 ». */
export function parseRange(range: string): { low: number | null; high: number | null } {
  const raw = range.replace(/\s/g, '').replace(/,/g, '.');
  const between = /^([-+]?\d+(?:\.\d+)?)(?:-|–|—|à|a)([-+]?\d+(?:\.\d+)?)$/.exec(raw);
  if (between) return { low: Number(between[1]), high: Number(between[2]) };
  const upper = /^(?:<|≤|<=|inf\.?à?)(\d+(?:\.\d+)?)$/i.exec(raw);
  if (upper) return { low: null, high: Number(upper[1]) };
  const lower = /^(?:>|≥|>=|sup\.?à?)(\d+(?:\.\d+)?)$/i.exec(raw);
  if (lower) return { low: Number(lower[1]), high: null };
  return { low: null, high: null };
}

function formatNumber(value: number): string {
  return new Intl.NumberFormat('fr-FR', { maximumFractionDigits: 3 }).format(value);
}

/** Remarque qui se limite à l'interprétation (« Bas », « H »…) : déjà affichée, on ne la répète pas. */
const FLAG_ONLY_REMARK = /^\s*(?:bas|basse|faible|diminuée?|élevée?|haute?|augmentée?|normale?|low|high|[hlb]|↑|↓)\s*$/iu;

/** Remarques du laboratoire : « Bas », « Diminué », « Élevé », « Augmentée », « H », « L », flèches. */
const LOW_REMARK = /(?:^|[^\p{L}])(?:bas|basse|faible|diminu\p{L}*|low)(?![\p{L}])|↓|^\s*[LB]\s*$/iu;
const HIGH_REMARK = /(?:^|[^\p{L}])(?:élev\p{L}*|haut\p{L}*|augment\p{L}*|high)(?![\p{L}])|↑|^\s*H\s*$/iu;

/**
 * Interprétation d'une valeur. La comparaison aux bornes prime ; à défaut, l'indicateur et la
 * remarque du laboratoire. Une valeur signalée par le laboratoire reste signalée même dans les bornes.
 */
export function flagOf(numeric: number | null, low: number | null, high: number | null, warning: boolean, remarks: string): MeasureFlag {
  if (numeric !== null && low !== null && numeric < low) return 'low';
  if (numeric !== null && high !== null && numeric > high) return 'high';
  if (LOW_REMARK.test(remarks)) return 'low';
  if (HIGH_REMARK.test(remarks)) return 'high';
  if (warning) return 'abnormal';
  if (numeric !== null && (low !== null || high !== null)) return 'normal';
  return 'unknown';
}

export function toMeasures(items: ExamResultDetail[]): ReportMeasure[] {
  return items
    .filter((item) => item['name'] !== undefined || item['result'] !== undefined)
    .map((item) => {
      const numeric = toNumber(item['result']);
      const resultText = text(item['result_text']);
      const lowerLimit = toNumber(item['lower_limit']);
      const upperLimit = toNumber(item['upper_limit']);
      const written = text(item['normal_range']);
      const parsed = parseRange(written);
      const low = lowerLimit ?? parsed.low;
      const high = upperLimit ?? parsed.high;
      const range = written || (low !== null || high !== null ? `${low !== null ? formatNumber(low) : '…'} – ${high !== null ? formatNumber(high) : '…'}` : '');
      const remarks = text(item['remarks']);
      const flag = flagOf(numeric, low, high, item['warning'] === true, remarks);
      const shown = numeric !== null ? formatNumber(numeric) : text(item['result']);
      return {
        name: text(item['name']) || text(item['rec_name']) || '—',
        value: [shown, resultText].filter(Boolean).join(' · ') || '—',
        numeric,
        unit: text(item['units']),
        range,
        low,
        high,
        flag,
        remarks: FLAG_ONLY_REMARK.test(remarks) ? '' : remarks,
      };
    });
}

/**
 * Valeurs du compte rendu validé (`serializer` → `Analyte_line`, format GNU Health :
 * [nom, résultat, unité, résultat texte, remarques]) quand le détail n'est pas disponible.
 */
export function measuresFromSerializer(record: ExamResultDetail | undefined): ReportMeasure[] {
  const raw = record?.['serializer_current'] || record?.['serializer'];
  if (typeof raw !== 'string' || !raw) return [];
  let source: unknown;
  try {
    source = (JSON.parse(raw) as Record<string, unknown>)['Analyte_line'];
  } catch {
    return [];
  }
  const lines = typeof source === 'string' ? parsePythonLiteral(source) : null;
  if (!Array.isArray(lines)) return [];
  return lines
    .filter((line): line is unknown[] => Array.isArray(line) && line.length > 0)
    .map((line) => {
      const numeric = toNumber(line[1]);
      const remarks = text(line[4]);
      return {
        name: text(line[0]) || '—',
        value: [numeric !== null ? formatNumber(numeric) : text(line[1]), text(line[3])].filter(Boolean).join(' · ') || '—',
        numeric,
        unit: text(line[2]),
        range: '',
        low: null,
        high: null,
        flag: flagOf(numeric, null, null, false, remarks),
        remarks,
      };
    });
}

export function toStudies(items: ExamResultDetail[]): ReportStudy[] {
  // Les champs de connexion au serveur d'imagerie (identifiants) ne sont jamais repris.
  return items.map((item) => ({
    description: text(item['description']) || text(item['rec_name']) || 'Étude',
    date: text(item['date']) || null,
    institution: text(item['institution']),
    physician: text(item['ref_physician']) || text(item['req_physician']),
    link: /^https?:\/\//i.test(text(item['link'])) ? text(item['link']) : null,
  }));
}

// =====================================================================
// Construction du compte rendu
// =====================================================================

type Field = [key: string, title: string];
/** Rubrique alimentée par un ou plusieurs champs (textes distincts réunis). */
type SectionField = [keys: string | string[], title: string];

interface Layout {
  title: string;
  code: string;
  conclusion: Field[];
  sections: SectionField[];
  dates: Field[];
  people: Field[];
}

/** Ordre de lecture des rubriques, du contexte vers les résultats. */
const LAYOUTS: Record<ExamType, Layout> = {
  Laboratoire: {
    title: 'test',
    code: 'name',
    conclusion: [['diagnosis', 'Conclusion']],
    sections: [
      ['renseignements', 'Renseignements cliniques'],
      ['macroscopie', 'Examen macroscopique'],
      ['microscopie', 'Examen microscopique'],
      ['analytes_summary', 'Synthèse des résultats'],
      // Le résultat rédigé d'un examen de laboratoire est le champ « results ».
      ['results', 'Résultats'],
    ],
    dates: [
      ['date_requested', 'Demandé le'],
      ['date_analysis', 'Analysé le'],
      ['done_date', 'Réalisé le'],
      ['validation_date', 'Validé le'],
    ],
    people: [
      ['requestor', 'Prescripteur'],
      ['done_by', 'Réalisé par'],
      ['validated_by', 'Biologiste'],
    ],
  },
  Imagerie: {
    title: 'requested_test',
    code: 'number',
    conclusion: [['conclusion', 'Conclusion']],
    sections: [
      ['indication', 'Indication'],
      ['technique', 'Technique'],
      ['resultat', 'Résultats'],
    ],
    dates: [
      ['request_date', 'Demandé le'],
      ['date', 'Réalisé le'],
      ['validation_date', 'Validé le'],
    ],
    people: [
      ['requestor', 'Prescripteur'],
      ['realisateur', 'Réalisé par'],
      ['validated_by', 'Radiologue'],
    ],
  },
  Exploration: {
    title: 'test',
    code: 'name',
    conclusion: [['diagnosis', 'Conclusion']],
    sections: [
      ['indication', 'Indication'],
      ['technique', 'Technique'],
      // En exploration fonctionnelle, le résultat est porté par « resultat » et « results ».
      [['resultat', 'results'], 'Résultats'],
      ['commentaire', 'Recommandations'],
      ['traitement', 'Traitement'],
    ],
    dates: [
      ['date_requested', 'Demandé le'],
      ['date_analysis', 'Réalisé le'],
      ['validation_date', 'Validé le'],
    ],
    people: [
      ['requestor', 'Prescripteur'],
      ['realisateur', 'Réalisé par'],
      ['pathologist', 'Interprété par'],
    ],
  },
};

function sexLabel(value: string): string {
  const v = value.trim().toLowerCase();
  if (['f', 'female', 'féminin', 'feminin', 'femme'].includes(v)) return 'Féminin';
  if (['m', 'male', 'masculin', 'homme'].includes(v)) return 'Masculin';
  return value;
}

function ageOn(birthDate: string, reference: string | null): string {
  const birth = new Date(birthDate);
  const at = reference ? new Date(reference) : new Date();
  if (Number.isNaN(birth.getTime()) || Number.isNaN(at.getTime())) return '';
  let age = at.getFullYear() - birth.getFullYear();
  if (at.getMonth() < birth.getMonth() || (at.getMonth() === birth.getMonth() && at.getDate() < birth.getDate())) age--;
  return age >= 0 ? `${age} ans` : '';
}

/**
 * Compte rendu d'un examen à partir de la fiche (liste des résultats ou /result/…) et du détail
 * (/…/more_infos/…). `identity` complète l'identification du patient (profil connu de l'espace).
 */
export function buildReport(
  kind: ExamType,
  record: ExamResultDetail | undefined,
  details: ExamResultDetail[] = [],
  identity: PatientIdentity = {}
): MedicalReport {
  const r = record ?? {};
  const layout = LAYOUTS[kind];
  const [discipline, documentTitle] = DISCIPLINES[kind];
  const section = ([keys, title]: SectionField): ReportSection | null => {
    const texts = (Array.isArray(keys) ? keys : [keys]).map((k) => text(r[k])).filter((t) => t !== '');
    const distinct = texts.filter((t, i) => texts.indexOf(t) === i);
    return distinct.length ? { title, text: distinct.join('\n\n') } : null;
  };
  const fact = ([key, label]: Field, date = false): ReportFact | null => (text(r[key]) ? { label, value: text(r[key]), date } : null);

  let measures: ReportMeasure[] = [];
  let measuresFromReport = false;
  let studies: ReportStudy[] = [];
  if (kind === 'Imagerie') {
    studies = toStudies(details);
  } else {
    measures = toMeasures(details);
    if (measures.length === 0 && kind === 'Laboratoire') {
      measures = measuresFromSerializer(record);
      measuresFromReport = measures.length > 0;
    }
  }

  const validatedAt = text(r['validation_date']) || null;
  const birthDate = identity.birthDate || null;
  return {
    kind,
    discipline,
    documentTitle,
    code: text(r[layout.code]) || text(r['rec_name']),
    title: text(r[layout.title]) || discipline,
    establishment: text(r['establishment']) || null,
    patient: {
      name: identity.name || text(r['patient']) || text(r['header_patient']),
      identifier: identity.identifier || text(r['matricule_patient']),
      birthDate,
      age: birthDate ? ageOn(birthDate, validatedAt) : text(r['computed_age']),
      sex: identity.sex ? sexLabel(identity.sex) : '',
    },
    validatedAt,
    validatedBy: text(r['validated_by']),
    conclusion: layout.conclusion.map(section).find((s) => s !== null) ?? null,
    sections: layout.sections.map(section).filter((s): s is ReportSection => s !== null),
    measures,
    measuresTitle: kind === 'Exploration' ? 'Mesures' : 'Paramètres analysés',
    measuresFromReport,
    studies,
    dates: layout.dates.map((f) => fact(f, true)).filter((f): f is ReportFact => f !== null),
    people: layout.people.map((f) => fact(f)).filter((f): f is ReportFact => f !== null),
  };
}

// =====================================================================
// Présentation des valeurs
// =====================================================================

export const FLAG_LABELS: Record<MeasureFlag, string> = {
  low: 'Bas',
  high: 'Élevé',
  abnormal: 'Anormal',
  normal: 'Normal',
  unknown: '',
};

/** Symbole imprimable, lisible sans couleur. */
export const FLAG_SYMBOLS: Record<MeasureFlag, string> = {
  low: '↓',
  high: '↑',
  abnormal: '!',
  normal: '',
  unknown: '',
};

export function isOutOfRange(m: ReportMeasure): boolean {
  return m.flag === 'low' || m.flag === 'high' || m.flag === 'abnormal';
}

/**
 * Position de la valeur sur une jauge, en % : zone de référence au centre, marges de part et d'autre.
 * null si la valeur ou les bornes manquent.
 */
export function gauge(m: ReportMeasure): { marker: number; from: number; to: number } | null {
  if (m.numeric === null || (m.low === null && m.high === null)) return null;
  let min: number;
  let max: number;
  if (m.low !== null && m.high !== null && m.high > m.low) {
    const span = m.high - m.low;
    min = m.low - span * 0.6;
    max = m.high + span * 0.6;
  } else if (m.high !== null) {
    min = 0;
    max = m.high * 1.6 || 1;
  } else {
    min = 0;
    max = (m.low as number) * 2 || 1;
  }
  const pct = (v: number) => Math.min(100, Math.max(0, ((v - min) / (max - min)) * 100));
  return {
    marker: pct(m.numeric),
    from: m.low !== null ? pct(m.low) : 0,
    to: m.high !== null ? pct(m.high) : 100,
  };
}

const DATE_FORMAT = new Intl.DateTimeFormat('fr-FR', { day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit' });
const DAY_FORMAT = new Intl.DateTimeFormat('fr-FR', { day: '2-digit', month: '2-digit', year: 'numeric' });

/** « 03/10/2026 à 09:00 » ; « 03/10/2026 » à minuit ou sans heure ; texte inchangé s'il n'est pas une date. */
export function formatDate(value: string | null | undefined, withTime = true): string {
  if (!value) return '';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;
  const midnight = date.getHours() === 0 && date.getMinutes() === 0;
  return withTime && !midnight && /T|\d:\d/.test(value) ? DATE_FORMAT.format(date).replace(' ', ' à ') : DAY_FORMAT.format(date);
}
