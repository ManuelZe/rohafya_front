import { ExamResultDetail, ExamType } from '../../patients/resultats/resultats.models';

export interface DetailField {
  label: string;
  value: string;
  /** Texte long (compte rendu, conclusion…) affiché en pleine largeur. */
  long: boolean;
}

export interface Criterion {
  name: string;
  result: string;
  units: string;
  range: string;
  remarks: string;
  warning: boolean;
}

export interface Study {
  description: string;
  date: string | null;
  institution: string;
  physician: string;
  link: string | null;
}

/** Champs mis en avant, dans l'ordre de lecture d'un compte rendu. */
const SUMMARY_FIELDS: Record<ExamType, [key: string, label: string, long?: boolean][]> = {
  Laboratoire: [
    ['test', 'Examen'],
    ['patient', 'Patient'],
    ['date_requested', 'Demandé le'],
    ['date_analysis', 'Analysé le'],
    ['done_date', 'Réalisé le'],
    ['requestor', 'Prescripteur'],
    ['done_by', 'Réalisé par'],
    ['validated_by', 'Validé par'],
    ['validation_date', 'Validé le'],
    ['renseignements', 'Renseignements cliniques', true],
    ['macroscopie', 'Macroscopie', true],
    ['microscopie', 'Microscopie', true],
    ['analytes_summary', 'Synthèse', true],
    ['results', 'Résultats', true],
    ['diagnosis', 'Diagnostic', true],
  ],
  Imagerie: [
    ['requested_test', 'Examen'],
    ['patient', 'Patient'],
    ['request_date', 'Demandé le'],
    ['date', 'Réalisé le'],
    ['requestor', 'Prescripteur'],
    ['realisateur', 'Réalisateur'],
    ['doctor', 'Médecin'],
    ['validated_by', 'Validé par'],
    ['validation_date', 'Validé le'],
    ['indication', 'Indication', true],
    ['technique', 'Technique', true],
    ['resultat', 'Résultat', true],
    ['conclusion', 'Conclusion', true],
  ],
  Exploration: [
    ['test', 'Examen'],
    ['patient', 'Patient'],
    ['date_requested', 'Demandé le'],
    ['date_analysis', 'Analysé le'],
    ['requestor', 'Prescripteur'],
    ['realisateur', 'Réalisateur'],
    ['pathologist', 'Interprété par'],
    ['validated_by', 'Validé par'],
    ['validation_date', 'Validé le'],
    ['indication', 'Indication', true],
    ['technique', 'Technique', true],
    ['resultat', 'Résultat', true],
    ['results', 'Résultats', true],
    ['diagnosis', 'Diagnostic', true],
    ['commentaire', 'Commentaire', true],
    ['traitement', 'Traitement', true],
  ],
};

const DATE_KEYS = new Set(['date_requested', 'date_analysis', 'done_date', 'validation_date', 'request_date', 'date']);
const DATE_FORMAT = new Intl.DateTimeFormat('fr-FR', { day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit' });

function text(value: unknown): string {
  if (value === null || value === undefined) return '';
  if (typeof value === 'boolean') return value ? 'Oui' : 'Non';
  return String(value).trim();
}

function formatValue(key: string, value: unknown): string {
  const raw = text(value);
  if (!raw || !DATE_KEYS.has(key)) return raw;
  const date = new Date(raw);
  return Number.isNaN(date.getTime()) ? raw : DATE_FORMAT.format(date);
}

export function summaryFields(type: ExamType, record: ExamResultDetail | undefined): DetailField[] {
  if (!record) return [];
  return (SUMMARY_FIELDS[type] ?? [])
    .map(([key, label, long]) => ({ label, value: formatValue(key, record[key]), long: !!long }))
    .filter((f) => f.value !== '');
}

export function patientName(record: ExamResultDetail | undefined): string {
  return text(record?.['patient'] ?? record?.['header_patient']);
}

export function toCriteria(items: ExamResultDetail[]): Criterion[] {
  return items
    .filter((item) => item['name'] !== undefined || item['result'] !== undefined)
    .map((item) => {
      const lower = text(item['lower_limit']);
      const upper = text(item['upper_limit']);
      const normal = text(item['normal_range']);
      const range = normal || (lower || upper ? `${lower || '…'} – ${upper || '…'}` : '');
      const result = text(item['result']);
      const resultText = text(item['result_text']);
      return {
        name: text(item['name']) || text(item['rec_name']) || '—',
        result: [result, resultText].filter(Boolean).join(' · ') || '—',
        units: text(item['units']),
        range,
        remarks: text(item['remarks']),
        warning: item['warning'] === true,
      };
    });
}

export function toStudies(items: ExamResultDetail[]): Study[] {
  // Les champs de connexion au serveur d'imagerie (identifiants) ne sont jamais affichés.
  return items.map((item) => ({
    description: text(item['description']) || text(item['rec_name']) || 'Étude',
    date: text(item['date']) || null,
    institution: text(item['institution']),
    physician: text(item['ref_physician']) || text(item['req_physician']),
    link: /^https?:\/\//i.test(text(item['link'])) ? text(item['link']) : null,
  }));
}

/**
 * Lit un littéral Python simple (listes, chaînes, nombres, None/True/False), comme
 * "[['CREATINEMIE', 6.34, 'mg/l', '', '']]" dans le champ `serializer.Analyte_line`.
 * Renvoie null si le texte n'est pas conforme : aucune évaluation de code n'est faite.
 */
export function parsePythonLiteral(source: string): unknown {
  let i = 0;
  const skip = () => {
    while (i < source.length && /\s/.test(source[i])) i++;
  };

  const value = (): unknown => {
    skip();
    const ch = source[i];
    if (ch === '[' || ch === '(') {
      const close = ch === '[' ? ']' : ')';
      i++;
      const list: unknown[] = [];
      skip();
      while (source[i] !== close) {
        list.push(value());
        skip();
        if (source[i] === ',') {
          i++;
          skip();
        } else if (source[i] !== close) {
          throw new Error('liste invalide');
        }
      }
      i++;
      return list;
    }
    if (ch === "'" || ch === '"') {
      i++;
      let out = '';
      while (i < source.length && source[i] !== ch) {
        if (source[i] === '\\' && i + 1 < source.length) {
          const next = source[i + 1];
          out += next === 'n' ? '\n' : next === 't' ? '\t' : next;
          i += 2;
        } else {
          out += source[i++];
        }
      }
      if (source[i] !== ch) throw new Error('chaîne non terminée');
      i++;
      return out;
    }
    const token = /^(None|True|False|-?\d+(?:\.\d+)?(?:[eE][-+]?\d+)?)/.exec(source.slice(i));
    if (!token) throw new Error('jeton inattendu');
    i += token[0].length;
    if (token[0] === 'None') return null;
    if (token[0] === 'True') return true;
    if (token[0] === 'False') return false;
    return Number(token[0]);
  };

  try {
    const result = value();
    skip();
    return i === source.length ? result : null;
  } catch {
    return null;
  }
}

/**
 * Valeurs analysées extraites du compte rendu (`serializer` → `Analyte_line`),
 * utilisées quand /result/more_infos n'est pas accessible au docteur.
 * Format GNU Health : [nom, résultat, unité, résultat texte, remarques].
 */
export function criteriaFromSerializer(record: ExamResultDetail | undefined): Criterion[] {
  const raw = record?.['serializer_current'] ?? record?.['serializer'];
  if (typeof raw !== 'string') return [];

  let lineSource: unknown;
  try {
    lineSource = (JSON.parse(raw) as Record<string, unknown>)['Analyte_line'];
  } catch {
    return [];
  }
  if (typeof lineSource !== 'string') return [];

  const lines = parsePythonLiteral(lineSource);
  if (!Array.isArray(lines)) return [];

  return lines
    .filter((line): line is unknown[] => Array.isArray(line) && line.length > 0)
    .map((line) => ({
      name: text(line[0]) || '—',
      result: [text(line[1]), text(line[3])].filter(Boolean).join(' · ') || '—',
      units: text(line[2]),
      range: '',
      remarks: text(line[4]),
      warning: false,
    }));
}
