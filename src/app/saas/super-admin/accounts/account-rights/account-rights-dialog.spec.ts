import { rightsPayload, toDateTimeLocal } from './account-rights-dialog';

describe('droits d’un compte', () => {
  it('convertit les dates de l’API pour un champ date et heure', () => {
    expect(toDateTimeLocal('2026-10-12T15:30:00')).toBe('2026-10-12T15:30');
    expect(toDateTimeLocal('Mon, 12 Oct 2026 15:30:00 GMT')).toBe('2026-10-12T15:30');
    expect(toDateTimeLocal(null)).toBe('');
  });

  it('n’envoie que ce qui est configuré', () => {
    const base = { printMode: 'none' as const, printFrom: '', printUntil: '', shareMode: 'unlimited' as const, shareLimit: 3, resetCount: true };
    expect(rightsPayload(base)).toEqual({ print_mode: null, print_from: null, print_until: null, share_limit: null, reset_share_count: false });
    expect(rightsPayload({ ...base, printMode: 'window', printUntil: '2026-10-20T18:00', shareMode: 'limited', shareLimit: 5 })).toEqual({
      print_mode: 'window',
      print_from: null,
      print_until: '2026-10-20T18:00',
      share_limit: 5,
      reset_share_count: true,
    });
  });
});
