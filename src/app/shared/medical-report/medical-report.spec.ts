import { buildReport, flagOf, formatDate, gauge, isOutOfRange, parseRange, toMeasures } from './medical-report';

describe('parseRange', () => {
  it('lit les intervalles usuels des comptes rendus', () => {
    expect(parseRange('12 – 16')).toEqual({ low: 12, high: 16 });
    expect(parseRange('3,8 - 5,2')).toEqual({ low: 3.8, high: 5.2 });
    expect(parseRange('12 à 16')).toEqual({ low: 12, high: 16 });
    expect(parseRange('< 450')).toEqual({ low: null, high: 450 });
    expect(parseRange('≥ 60')).toEqual({ low: 60, high: null });
    expect(parseRange('Négatif')).toEqual({ low: null, high: null });
  });
});

describe('flagOf', () => {
  it('compare aux bornes, puis suit le laboratoire', () => {
    expect(flagOf(11.4, 12, 16, true, 'Bas')).toBe('low');
    expect(flagOf(17, 12, 16, false, '')).toBe('high');
    expect(flagOf(14, 12, 16, false, '')).toBe('normal');
    expect(flagOf(14, 12, 16, true, '')).toBe('abnormal');
    expect(flagOf(null, null, null, false, 'Élevée')).toBe('high');
    expect(flagOf(null, null, null, false, 'H')).toBe('high');
    expect(flagOf(null, null, null, false, 'Contrôle dans 3 h')).toBe('unknown');
    expect(flagOf(null, null, null, false, 'Basophiles')).toBe('unknown');
    expect(flagOf(null, null, null, false, 'Négatif')).toBe('unknown');
  });
});

describe('toMeasures', () => {
  it('normalise une ligne GNU Health et calcule la jauge', () => {
    const [hb] = toMeasures([
      { name: 'Hémoglobine', result: 11.4, units: 'g/dl', lower_limit: 12, upper_limit: 16, normal_range: '12 – 16', remarks: 'Bas', warning: true },
    ]);
    expect(hb).toMatchObject({ name: 'Hémoglobine', value: '11,4', unit: 'g/dl', range: '12 – 16', flag: 'low' });
    expect(isOutOfRange(hb)).toBe(true);
    expect(hb.remarks).toBe(''); // « Bas » répéterait l'interprétation
    const g = gauge(hb)!;
    expect(g.marker).toBeLessThan(g.from);
    expect(g.from).toBeLessThan(g.to);
  });

  it('accepte un résultat textuel sans bornes', () => {
    const [m] = toMeasures([{ name: 'Antigène HBs', result: 'Négatif', units: '', normal_range: 'Négatif', warning: false }]);
    expect(m).toMatchObject({ value: 'Négatif', flag: 'unknown' });
    expect(gauge(m)).toBeNull();
  });
});

describe('buildReport', () => {
  it('construit un compte rendu de biologie, conclusion en tête', () => {
    const report = buildReport(
      'Laboratoire',
      {
        name: 'LAB-1',
        test: 'NFS',
        diagnosis: 'Anémie légère',
        renseignements: 'Fatigue',
        validated_by: 'Dr Owona',
        validation_date: '2026-10-03T09:00:00',
        requestor: 'Dr Ekané',
        patient: 'Aïcha NGONO',
      },
      [{ name: 'Hémoglobine', result: 11.4, units: 'g/dl', normal_range: '12 – 16', warning: true }],
      { identifier: 'DEMO-P-0001', birthDate: '1988-04-12', sex: 'F' }
    );
    expect(report.documentTitle).toBe('Compte rendu de biologie médicale');
    expect(report.conclusion).toEqual({ title: 'Conclusion', text: 'Anémie légère' });
    expect(report.sections.map((s) => s.title)).toEqual(['Renseignements cliniques']);
    expect(report.patient).toMatchObject({ name: 'Aïcha NGONO', identifier: 'DEMO-P-0001', age: '38 ans', sex: 'Féminin' });
    expect(report.people.find((p) => p.label === 'Biologiste')?.value).toBe('Dr Owona');
    expect(report.measures[0].flag).toBe('low');
    expect(report.measuresTitle).toBe('Paramètres analysés');
    expect(buildReport('Exploration', {}).measuresTitle).toBe('Mesures');
  });

  it('reprend les valeurs du compte rendu validé quand le détail manque', () => {
    const report = buildReport('Laboratoire', {
      name: 'LAB-2',
      test: 'Créatinine',
      serializer: JSON.stringify({ Analyte_line: "[['Créatinine', 6.34, 'mg/l', '', '']]" }),
    });
    expect(report.measuresFromReport).toBe(true);
    expect(report.measures[0]).toMatchObject({ name: 'Créatinine', value: '6,34', unit: 'mg/l' });
  });

  it("organise un compte rendu d'imagerie : indication, technique, résultats, conclusion", () => {
    const report = buildReport(
      'Imagerie',
      { number: 'IMG-1', requested_test: 'Échographie', indication: 'Douleurs', technique: 'Sonde 3,5 MHz', resultat: 'Normal', conclusion: 'Examen normal', computed_age: '38 ans' },
      [{ description: 'Échographie — 24 images', link: 'javascript:alert(1)', server_password: 'secret' }]
    );
    expect(report.conclusion?.text).toBe('Examen normal');
    expect(report.sections.map((s) => s.title)).toEqual(['Indication', 'Technique', 'Résultats']);
    expect(report.patient.age).toBe('38 ans');
    expect(report.studies).toEqual([{ description: 'Échographie — 24 images', date: null, institution: '', physician: '', link: null }]);
  });
});

describe('champs du résultat rédigé', () => {
  it('affiche « results » (laboratoire) et « resultat » + « results » (exploration) sous « Résultats »', () => {
    const lab = buildReport('Laboratoire', { name: 'LAB-9', results: 'Hémoglobine abaissée' });
    expect(lab.sections).toEqual([{ title: 'Résultats', text: 'Hémoglobine abaissée' }]);

    const exp = buildReport('Exploration', { name: 'EXP-9', resultat: 'Rythme sinusal', results: 'QTc normal' });
    expect(exp.sections).toEqual([{ title: 'Résultats', text: 'Rythme sinusal\n\nQTc normal' }]);

    const same = buildReport('Exploration', { name: 'EXP-10', resultat: 'Rythme sinusal', results: 'Rythme sinusal' });
    expect(same.sections).toEqual([{ title: 'Résultats', text: 'Rythme sinusal' }]);

    const img = buildReport('Imagerie', { number: 'IMG-9', resultat: 'Foie normal' });
    expect(img.sections).toEqual([{ title: 'Résultats', text: 'Foie normal' }]);
  });
});

describe('formatDate', () => {
  it('affiche l’heure seulement quand elle est connue', () => {
    expect(formatDate('2026-10-03')).toBe('03/10/2026');
    expect(formatDate('2026-10-03T09:05:00')).toBe('03/10/2026 à 09:05');
    expect(formatDate('pas une date')).toBe('pas une date');
  });
});

describe('établissement sur le compte rendu imprimé', () => {
  it('nomme l’établissement dans l’en-tête et le cadre Examen, ou indique qu’il manque', async () => {
    const { reportDocument } = await import('./print-report');
    const named = reportDocument(buildReport('Laboratoire', { name: 'LAB-1', establishment: 'Clinique de Bonanjo' }), 'patient', 'https://rohafya.com');
    expect(named.match(/Clinique de Bonanjo/g)?.length).toBeGreaterThanOrEqual(2);
    const unnamed = reportDocument(buildReport('Laboratoire', { name: 'LAB-2' }), 'doctor', 'https://rohafya.com');
    expect(unnamed).toContain('Établissement non communiqué');
  });
});
