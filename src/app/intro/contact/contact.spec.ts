import { contactMailto } from './contact';

describe('contactMailto', () => {
  const to = 'contact@exemple.cm';

  it('préremplit l’objet et le corps, encodés pour une URL', () => {
    const url = contactMailto(to, {
      name: '  Amina Ngo ',
      profile: 'establishment',
      organization: 'Laboratoire du Littoral',
      message: 'Bonjour, nous voulons équiper notre laboratoire & publier nos résultats.',
    });

    expect(url.startsWith(`mailto:${to}?subject=`)).toBe(true);
    const params = new URLSearchParams(url.slice(url.indexOf('?') + 1));
    expect(params.get('subject')).toBe('ROHAFYA · Établissement de santé · Amina Ngo');
    expect(params.get('body')).toBe(
      'Bonjour, nous voulons équiper notre laboratoire & publier nos résultats.\n\n--\nAmina Ngo\nLaboratoire du Littoral\nProfil : Établissement de santé',
    );
  });

  it('omet l’établissement quand il n’est pas renseigné', () => {
    const url = contactMailto(to, { name: 'Paul', profile: 'patient', organization: '   ', message: 'Je ne vois pas mon résultat.' });
    const body = new URLSearchParams(url.slice(url.indexOf('?') + 1)).get('body');
    expect(body).toBe('Je ne vois pas mon résultat.\n\n--\nPaul\nProfil : Patient');
  });
});
