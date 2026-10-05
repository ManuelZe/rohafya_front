import {
  ApiCommissionsStatement,
  ApiMonthCommissions,
  ApiSoldeDetail,
  ApiYearCommissions,
  normalizeMonth,
  normalizeSoldeDetail,
  normalizeStatement,
  normalizeToday,
  normalizeYear,
  toLines,
} from './commissions.models';
import { formatPoints } from '../shared/points';
import { currentCycle, cycleForMonth, toApiDateTime } from '../shared/commission-cycle';

const calc = (entries: [string, string, number, string][], commission: number) => ({
  data_patients: entries.map(([patient, examen, prix, date]) => ({ [patient]: [examen, prix, date] as [string, number, string] })),
  commission,
});

describe('formatPoints', () => {
  it('formate 25000 F CFA en « 25.000 pts »', () => {
    expect(formatPoints(25000)).toBe('25.000 pts');
  });

  it('arrondit et accepte les chaînes renvoyées par Flask (Decimal)', () => {
    expect(formatPoints('1334.99')).toBe('1.335 pts');
    expect(formatPoints(1234567, false)).toBe('1.234.567');
    expect(formatPoints(null)).toBe('0 pts');
  });
});

describe('cycle de commissions (21 → 20)', () => {
  it('avant le 20 : cycle du 21 du mois précédent au 20 du mois courant', () => {
    const c = currentCycle(new Date(2026, 8, 10)); // 10 sept.
    expect(c.start).toEqual(new Date(2026, 7, 21));
    expect(c.end.getDate()).toBe(20);
    expect(c.month).toBe(9);
  });

  it('à partir du 20 : cycle du 21 du mois courant au 20 du mois suivant', () => {
    const c = currentCycle(new Date(2026, 8, 25)); // 25 sept.
    expect(c.start).toEqual(new Date(2026, 8, 21));
    expect(c.month).toBe(10);
  });

  it('gère le passage d’année', () => {
    expect(currentCycle(new Date(2026, 0, 5)).start).toEqual(new Date(2025, 11, 21));
    const dec = currentCycle(new Date(2026, 11, 28));
    expect(dec.month).toBe(1);
    expect(dec.year).toBe(2027);
    expect(cycleForMonth(2026, 1).start).toEqual(new Date(2025, 11, 21));
  });

  it('produit le format de date attendu par /research', () => {
    expect(toApiDateTime(new Date(2026, 8, 1))).toBe('2026-09-01 00:00:00.000000');
    expect(toApiDateTime(new Date(2026, 8, 1), true)).toBe('2026-09-01 23:59:59.999999');
  });
});

describe('normalisation des réponses API', () => {
  it('aplatit data_patients en lignes', () => {
    const lines = toLines(calc([['Jean Dupont', 'NFS', 890, 'Mon, 07 Sep 2026 10:00:00 GMT']], 890), 'prescription');
    expect(lines).toEqual([{ patient: 'Jean Dupont', examen: 'NFS', points: 890, date: 'Mon, 07 Sep 2026 10:00:00 GMT', kind: 'prescription' }]);
  });

  it('tolère un Solde null (aucune commission)', () => {
    const api: ApiSoldeDetail = {
      Solde: null,
      Factured: 0,
      Not_Factured: 0,
      number_of_registered_patients: 0,
      Patient_nbr_examen: {},
      All_Exam: {},
      Top_3: {},
      Commission_product: {},
    };
    expect(normalizeSoldeDetail(api)).toEqual(expect.objectContaining({ total: 0, lines: [], topExams: [] }));
  });

  it('classe le Top 3 par fréquence décroissante', () => {
    const api = { Solde: calc([], 0), Factured: 0, Not_Factured: 0, number_of_registered_patients: 0, Patient_nbr_examen: {}, All_Exam: {}, Top_3: { A: 1, B: 5, C: 3 }, Commission_product: {} };
    expect(normalizeSoldeDetail(api).topExams.map((e) => e.label)).toEqual(['B', 'C', 'A']);
  });

  it("traite « Aucune Commission générée ce jour » comme une journée vide", () => {
    expect(normalizeToday({ message: 'Aucune Commission générée ce jour.' })).toEqual({ total: 0, count: 0, lines: [] });
  });

  it('gère les mois antérieurs à l’ouverture (element_* = [])', () => {
    const api: ApiMonthCommissions = {
      montant_prescription: 0,
      montant_realisation: 0,
      montant_total: 0,
      nb_total_commission: 0,
      nb_total_patient: 0,
      list_patient_name: [],
      element_prescription: [],
      element_realisation: [],
    };
    expect(normalizeMonth(api).lines).toEqual([]);
  });

  it('extrait les mois de /invoiced_by_year dans l’ordre chronologique', () => {
    const api: ApiYearCommissions = {
      OCTOBRE: { OCTOBRE: 300, elements_prescription: calc([['P', 'E', 100, '']], 100), elements_realisation: calc([['P', 'E', 200, '']], 200) },
      SEPTEMBRE: { SEPTEMBRE: 0, elements_prescription: calc([], 0), elements_realisation: calc([], 0) },
      Total: 300,
    };
    const year = normalizeYear(api);
    expect(year.months.map((m) => m.month)).toEqual([9, 10]);
    expect(year.months[1]).toEqual({ month: 10, prescription: 100, realisation: 200, total: 300, count: 2 });
    expect(year.total).toBe(300);
  });

  it('calcule les montants nets du relevé (retenue de 11 %) et trie par date', () => {
    const api: ApiCommissionsStatement = {
      prescription: {
        data_prescription: [
          { Date: 'Mon, 01 Sep 2026 00:00:00 GMT', Produit: 'CP V01', Montant: '1000.0000', Patient: 'A', Examen: 'NFS', Validé: true, Facturé: 'invoiced' },
        ],
        montant_prescription: 890,
      },
      realisation: {
        data_realisation: [
          { Date: 'Tue, 15 Sep 2026 00:00:00 GMT', Produit: 'CP V02', Montant: 500, Patient: '', Examen: 'ECG', Validé: false, Facturé: '' },
        ],
        montant_realisation: 445,
      },
      montant_total: 1335,
    };
    const s = normalizeStatement(api);
    expect(s.rows.map((r) => r.examen)).toEqual(['ECG', 'NFS']);
    expect(s.rows[1].points).toBe(890);
    expect(s.rows[1].state).toBe('invoiced');
    expect(s.rows[0]).toEqual(expect.objectContaining({ patient: 'Patient inconnu', state: '', kind: 'realisation' }));
    expect(s.total).toBe(1335);
  });
});
