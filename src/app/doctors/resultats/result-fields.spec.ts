import { criteriaFromSerializer, parsePythonLiteral, summaryFields } from './result-fields';

// Extrait réel de GET /result/Laboratoire/{code}/{matricule}
const LAB_RECORD = {
  test: 'CREATINEMIE',
  patient: 'TOUKOULOU NGUIMBOUS LEON JAMES FRANCOIS',
  date_requested: 'Fri, 04 Sep 2026 10:52:12 GMT',
  requestor: 'Dr. KOUNOU MESSI HENRI',
  analytes_summary: 'CREATINEMIE  6.34 (mg/l)  \n',
  diagnosis: null,
  serializer:
    '{"Lab_test": "TEST27735", "Test": "CREATINEMIE", "Analyte_line": "[[\'CREATINEMIE\', 6.34, \'mg/l\', \'\', \'\'], [\'UREE\', None, \'g/l\', \'Normal\', \'A contr\\\\u00f4ler\']]"}',
};

describe('parsePythonLiteral', () => {
  it('lit listes, chaînes, nombres et None', () => {
    expect(parsePythonLiteral("[['A', 1.5, None, True], ('b', -2)]")).toEqual([['A', 1.5, null, true], ['b', -2]]);
  });

  it("refuse tout ce qui n'est pas un littéral simple", () => {
    expect(parsePythonLiteral("__import__('os')")).toBeNull();
    expect(parsePythonLiteral("['non terminé")).toBeNull();
  });
});

describe('résultats reçus', () => {
  it('extrait les valeurs analysées du serializer quand more_infos est refusé', () => {
    const criteria = criteriaFromSerializer(LAB_RECORD);
    expect(criteria.length).toBe(2);
    expect(criteria[0]).toEqual({ name: 'CREATINEMIE', result: '6.34', units: 'mg/l', range: '', remarks: '', warning: false });
    expect(criteria[1].result).toBe('Normal');
  });

  it('ne garde que les champs renseignés du compte rendu', () => {
    const labels = summaryFields('Laboratoire', LAB_RECORD).map((f) => f.label);
    expect(labels).toContain('Prescripteur');
    expect(labels).toContain('Synthèse');
    expect(labels).not.toContain('Diagnostic');
  });
});
