"""La sortie « recopiée » du modèle passe par le même analyseur que l'approche par règles."""
from extraire_regles import analyser_ligne, normaliser


def ia_vers_eden(sortie_ia):
    details, inconnues = [], []
    for ligne in sortie_ia["analyses"]:
        texte = f'{ligne["libelle_imprime"]} {ligne["valeur_imprimee"]} {ligne["unite_imprimee"]} {ligne["normes_imprimees"]}'
        resultat = analyser_ligne(texte)
        if resultat is None:
            inconnues.append(ligne)  # analyse absente du dictionnaire : relecture humaine
            continue
        resultat["_valeur_source"] = float(normaliser(ligne["valeur_imprimee"]).split()[0])
        resultat["warning"] = resultat["warning"] or ligne["marque_anormale"]
        details.append(resultat)
    return details, inconnues


if __name__ == "__main__":
    import pdfplumber
    from valider import controler

    sortie = {  # ce que renverrait le modèle pour labo_beta.pdf (simulé)
        "dossier": "CLB-0001", "date_validation": "2026-09-28",
        "analyses": [
            {"libelle_imprime": "HB (hémoglobine)", "valeur_imprimee": "10.9", "unite_imprimee": "g/dl", "normes_imprimees": "[12.0-16.0]", "marque_anormale": True, "page": 1},
            {"libelle_imprime": "Glucose (à jeun)", "valeur_imprimee": "5.2", "unite_imprimee": "mmol/L", "normes_imprimees": "[3.9 - 6.1]", "marque_anormale": False, "page": 1},
            {"libelle_imprime": "Ferritine", "valeur_imprimee": "8", "unite_imprimee": "ng/ml", "normes_imprimees": "15-150", "marque_anormale": True, "page": 1},
        ],
    }
    details, inconnues = ia_vers_eden(sortie)
    with pdfplumber.open("labo_beta.pdf") as pdf:
        texte = pdf.pages[0].extract_text()
    ok, ko = controler(details, texte)
    print("acceptées :", [(d["code"], d["result"], d["units"], d["warning"]) for d in ok])
    print("anomalies :", ko)
    print("hors dictionnaire :", [l["libelle_imprime"] for l in inconnues])
