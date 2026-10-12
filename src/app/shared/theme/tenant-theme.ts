/** Couleurs dérivées de la couleur principale d'un établissement, appliquées à sa console. */
export interface TenantPalette {
  /** Fond des boutons et du menu actif : contraste ≥ 4,5:1 avec un texte blanc (WCAG AA). */
  primary: string;
  hover: string;
  /** Fond très clair (pastilles, avatar) sur lequel `primary` reste lisible. */
  soft: string;
}

const HEX = /^#([0-9a-f]{6})$/i;
const MIN_CONTRAST = 4.5;

type Rgb = [number, number, number];

function toRgb(hex: string): Rgb {
  const n = parseInt(hex.slice(1), 16);
  return [(n >> 16) & 255, (n >> 8) & 255, n & 255];
}

function toHex(rgb: Rgb): string {
  return '#' + rgb.map((c) => Math.round(Math.min(255, Math.max(0, c))).toString(16).padStart(2, '0')).join('');
}

function luminance([r, g, b]: Rgb): number {
  const lin = (c: number) => {
    const s = c / 255;
    return s <= 0.03928 ? s / 12.92 : ((s + 0.055) / 1.055) ** 2.4;
  };
  return 0.2126 * lin(r) + 0.7152 * lin(g) + 0.0722 * lin(b);
}

/** Contraste entre une couleur et le blanc. */
export function contrastWithWhite(hex: string): number {
  return 1.05 / (luminance(toRgb(hex)) + 0.05);
}

function mix(rgb: Rgb, target: number, amount: number): Rgb {
  return rgb.map((c) => c + (target - c) * amount) as Rgb;
}

/**
 * Palette d'une couleur saisie (#rrggbb), ou null si elle est invalide.
 * Une couleur trop claire est assombrie jusqu'à rendre un texte blanc lisible.
 */
export function tenantPalette(color: string | null | undefined): TenantPalette | null {
  if (!color || !HEX.test(color.trim())) return null;
  let rgb = toRgb(color.trim());
  for (let i = 0; i < 40 && contrastWithWhite(toHex(rgb)) < MIN_CONTRAST; i++) {
    rgb = mix(rgb, 0, 0.06);
  }
  return {
    primary: toHex(rgb),
    hover: toHex(mix(rgb, 0, 0.18)),
    soft: toHex(mix(rgb, 255, 0.9)),
  };
}
