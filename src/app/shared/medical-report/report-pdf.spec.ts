import { buildReport } from './medical-report';
import { reportFileName, reportPdfDefinition } from './report-pdf';

describe('compte rendu PDF', () => {
  const report = buildReport(
    'Laboratoire',
    { name: 'LAB-1', test: 'NFS', establishment: 'Clinique de Bonanjo', diagnosis: 'Anémie légère' },
    [{ name: 'Hémoglobine', result: 11.4, units: 'g/dl', normal_range: '12 – 16', warning: true }]
  );

  it('nomme le fichier d’après le code et la date', () => {
    expect(reportFileName(report, new Date('2026-10-12T10:00:00Z'))).toBe('compte-rendu-LAB-1-2026-10-12.pdf');
    expect(reportFileName(buildReport('Laboratoire', { name: 'FAC/2026 01' }), new Date('2026-10-12T10:00:00Z'))).toBe(
      'compte-rendu-FAC-2026-01-2026-10-12.pdf'
    );
  });

  it('reprend l’établissement, la conclusion et les valeurs hors normes', () => {
    const text = JSON.stringify(reportPdfDefinition(report, 'patient').content);
    expect(text).toContain('Clinique de Bonanjo');
    expect(text).toContain('Anémie légère');
    expect(text).toContain('Bas');
    expect(text).toContain('seul votre médecin');
  });

  it('n’ajoute la mention au patient que sur sa propre version', () => {
    expect(JSON.stringify(reportPdfDefinition(report, 'doctor').content)).not.toContain('seul votre médecin');
  });
});
