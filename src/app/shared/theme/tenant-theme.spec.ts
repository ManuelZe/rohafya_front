import { contrastWithWhite, tenantPalette } from './tenant-theme';

describe('tenantPalette', () => {
  it('garde une couleur déjà lisible sous un texte blanc', () => {
    expect(tenantPalette('#0c4562')?.primary).toBe('#0c4562');
  });

  it('assombrit une couleur trop claire jusqu’au contraste AA', () => {
    const palette = tenantPalette('#fde047')!;
    expect(contrastWithWhite(palette.primary)).toBeGreaterThanOrEqual(4.5);
    expect(contrastWithWhite(palette.soft)).toBeLessThan(1.3);
  });

  it('ignore une valeur invalide', () => {
    expect(tenantPalette('bleu')).toBeNull();
    expect(tenantPalette(null)).toBeNull();
  });
});
