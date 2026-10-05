"""Extraction de résultats de laboratoire indépendante de la mise en page (texte + règles).

Principe : on ne cherche pas « la 3e colonne du tableau » mais, ligne par ligne, un nom
d'analyse connu, puis dans le reste de la ligne : l'intervalle de référence, l'unité et la valeur.
"""
import re
import unicodedata

import pdfplumber

# Dictionnaire des analyses : synonymes rencontrés dans les comptes rendus et unités acceptées,
# avec le facteur de conversion vers l'unité de référence d'EDEN.
ANALYSES = {
    "HB": {"libelle": "Hémoglobine", "synonymes": ["hemoglobine", "hb", "hgb"],
           "unite": "g/dl", "unites": {"g/dl": 1.0, "g/l": 0.1}},
    "VGM": {"libelle": "Volume globulaire moyen", "synonymes": ["volume globulaire moyen", "v.g.m.", "vgm", "mcv"],
            "unite": "fl", "unites": {"fl": 1.0}},
    "GB": {"libelle": "Leucocytes", "synonymes": ["leucocytes", "globules blancs", "wbc"],
           "unite": "G/l", "unites": {"g/l": 1.0, "x10^9/l": 1.0, "/mm3": 0.001}},
    "PLQ": {"libelle": "Plaquettes", "synonymes": ["plaquettes", "plt"],
            "unite": "G/l", "unites": {"g/l": 1.0, "x10^9/l": 1.0}},
    "GLY": {"libelle": "Glycémie à jeun", "synonymes": ["glycemie", "glucose"],
            "unite": "g/l", "unites": {"g/l": 1.0, "mmol/l": 0.18}},
}

NOMBRE = r"\d+(?:\.\d+)?"
INTERVALLE = re.compile(rf"({NOMBRE})\s*(?:-|–|a)\s*({NOMBRE})")
BORNE = re.compile(rf"([<>])\s*({NOMBRE})")
MARQUEUR = re.compile(r"(\*|(?<![a-z0-9])(?:h|l|bas|haut|eleve)(?![a-z0-9])|↑|↓)")


def normaliser(texte):
    """Minuscules, sans accents, virgule décimale -> point."""
    texte = unicodedata.normalize("NFD", texte.lower())
    texte = "".join(c for c in texte if unicodedata.category(c) != "Mn")
    return re.sub(r"(\d),(\d)", r"\1.\2", texte)


def trouver_analyse(ligne):
    """(code, fin du nom) de l'analyse citée en début de ligne, ou (None, None)."""
    meilleur = (None, None, 10**6)
    for code, analyse in ANALYSES.items():
        for synonyme in sorted(analyse["synonymes"], key=len, reverse=True):
            m = re.search(rf"(?<![a-z0-9]){re.escape(synonyme)}(?![a-z0-9])", ligne)
            if m and m.start() < meilleur[2]:
                meilleur = (code, m.end(), m.start())
    return meilleur[0], meilleur[1]


def analyser_ligne(ligne_brute):
    ligne = normaliser(ligne_brute)
    code, fin = trouver_analyse(ligne)
    if code is None:
        return None
    analyse = ANALYSES[code]
    reste = ligne[fin:]

    # 1. L'intervalle de référence, où qu'il soit (avant ou après la valeur).
    bas = haut = None
    m = INTERVALLE.search(reste)
    if m:
        bas, haut = float(m.group(1)), float(m.group(2))
        reste = reste[: m.start()] + " " + reste[m.end():]
    else:
        m = BORNE.search(reste)
        if m:
            if m.group(1) == "<":
                haut = float(m.group(2))
            else:
                bas = float(m.group(2))
            reste = reste[: m.start()] + " " + reste[m.end():]

    # 2. L'unité (retirée avant de chercher la valeur : « x10^9/l » contient des chiffres).
    unite, facteur = None, None
    for candidate in sorted(analyse["unites"], key=len, reverse=True):
        if candidate in reste:
            unite, facteur = candidate, analyse["unites"][candidate]
            reste = reste.replace(candidate, " ", 1)
            break

    # 3. La valeur : le premier nombre restant.
    m = re.search(NOMBRE, reste)
    if not m:
        return None
    valeur = float(m.group())
    marque = bool(MARQUEUR.search(reste))

    # 4. Conversion vers l'unité de référence et contrôle de l'intervalle.
    f = facteur or 1.0
    valeur_ref = round(valeur * f, 3)
    bas_ref = round(bas * f, 3) if bas is not None else None
    haut_ref = round(haut * f, 3) if haut is not None else None
    hors_norme = (bas_ref is not None and valeur_ref < bas_ref) or (haut_ref is not None and valeur_ref > haut_ref)

    confiance = sum([unite is not None, bas is not None or haut is not None]) / 2
    return {
        "code": code,
        "name": analyse["libelle"],
        "result": valeur_ref,
        "units": analyse["unite"],
        "lower_limit": bas_ref,
        "upper_limit": haut_ref,
        "normal_range": f"{bas_ref} – {haut_ref}" if bas_ref is not None and haut_ref is not None else "",
        "warning": bool(hors_norme or marque),
        "remarks": "Hors norme" if hors_norme else "",
        # Traçabilité, pour la relecture humaine :
        "_ligne_source": ligne_brute.strip(),
        "_valeur_source": valeur,  # valeur imprimée, avant conversion d'unité (sert au contrôle d'ancrage)
        "_unite_source": unite,
        "_confiance": confiance,
    }


DOSSIER = re.compile(r"dossier\s*:?\s*([a-z]{2,5}-\d{3,})")
DATE = re.compile(r"valid\w*[^0-9]{0,30}(\d{2}/\d{2}/\d{4}|\d{4}-\d{2}-\d{2})")


def extraire_entete(texte):
    """Numéro de dossier et date de validation, quelle que soit leur place dans le texte."""
    t = normaliser(texte)
    dossier, date = DOSSIER.search(t), DATE.search(t)
    iso = None
    if date:
        valeur = date.group(1)
        iso = valeur if "-" in valeur else "-".join(reversed(valeur.split("/")))
    return {"local_ref": dossier.group(1).upper() if dossier else None, "validation_date": iso}


ENTETE = re.compile(r"dossier|\d{2}/\d{2}/\d{4}|\d{4}-\d{2}-\d{2}")


def ressemble_a_un_resultat(ligne_brute):
    """Une ligne non reconnue mais qui porte des valeurs de référence : probablement une analyse inconnue."""
    ligne = normaliser(ligne_brute)
    return not ENTETE.search(ligne) and bool(INTERVALLE.search(ligne) or BORNE.search(ligne))


def extraire(chemin_pdf):
    resultats, lignes_non_reconnues = [], []
    with pdfplumber.open(chemin_pdf) as pdf:
        texte = "\n".join(page.extract_text() or "" for page in pdf.pages)
    for ligne in texte.splitlines():
        resultat = analyser_ligne(ligne)
        if resultat:
            resultats.append(resultat)
        elif ressemble_a_un_resultat(ligne):
            lignes_non_reconnues.append(ligne)  # à examiner : nouvelle analyse ? nouveau format ?
    return {
        "texte_present": bool(texte.strip()),
        "entete": extraire_entete(texte),
        "details": resultats,
        "lignes_non_reconnues": lignes_non_reconnues,
    }


if __name__ == "__main__":
    import json
    import sys

    for chemin in sys.argv[1:]:
        r = extraire(chemin)
        print("=====", chemin, r["entete"])
        for d in r["details"]:
            print(f"  {d['code']:4} {d['result']:>8} {d['units']:5} [{d['lower_limit']} – {d['upper_limit']}] "
                  f"hors norme={d['warning']!s:5} confiance={d['_confiance']}  <- {d['_unite_source']}")
        print("  lignes non reconnues :", json.dumps(r["lignes_non_reconnues"], ensure_ascii=False))
