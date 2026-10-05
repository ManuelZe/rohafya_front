"""Chaîne complète : PDF -> extraction -> contrôles -> envoi à EDEN, ou mise de côté pour relecture.

    export EDEN_API_URL=https://...      EDEN_API_KEY=eden_...
    python pipeline.py compte_rendu.pdf LAB-CLB-1201 "Numération Formule Sanguine" [--ia]

Sans --ia : extraction par règles uniquement (rien ne quitte le serveur).
Avec --ia : si les règles ne suffisent pas (PDF scanné, lignes non reconnues), lecture par Claude.
"""
import json
import os
import sys

import pdfplumber
import requests

from extraire_regles import extraire
from valider import controler

SEUIL_CONFIANCE = 1.0  # toutes les lignes doivent avoir unité ET normes reconnues


def extraire_avec_repli(chemin, utiliser_ia):
    resultat = extraire(chemin)
    insuffisant = (
        not resultat["texte_present"]
        or not resultat["details"]
        or resultat["lignes_non_reconnues"]
        or min(d["_confiance"] for d in resultat["details"]) < SEUIL_CONFIANCE
    )
    if insuffisant and utiliser_ia:
        from extraire_ia import lire_pdf
        from pont_ia import ia_vers_eden

        sortie = lire_pdf(chemin)
        details, inconnues = ia_vers_eden(sortie)
        entete = {"local_ref": sortie["dossier"] or None, "validation_date": sortie["date_validation"] or None}
        return {"methode": "ia", "entete": entete, "details": details, "a_relire": inconnues}
    return {"methode": "regles", "entete": resultat["entete"], "details": resultat["details"],
            "a_relire": resultat["lignes_non_reconnues"]}


def main(chemin, code_examen, intitule, utiliser_ia=False):
    extraction = extraire_avec_repli(chemin, utiliser_ia)
    with pdfplumber.open(chemin) as pdf:
        texte = "\n".join(page.extract_text() or "" for page in pdf.pages)
    acceptees, anomalies = controler(extraction["details"], texte)
    entete = extraction["entete"]

    if anomalies or extraction["a_relire"] or not entete["local_ref"] or not entete["validation_date"]:
        # Rien n'est publié : un humain vérifie (les valeurs fausses sont pires que l'absence de valeurs).
        dossier = {"pdf": chemin, "extraction": extraction, "anomalies": anomalies}
        sortie = os.path.splitext(chemin)[0] + ".a_relire.json"
        with open(sortie, "w", encoding="utf-8") as f:
            json.dump(dossier, f, ensure_ascii=False, indent=2, default=str)
        print(f"À RELIRE ({extraction['methode']}) : {sortie}")
        return 2

    enregistrement = {
        "local_ref": entete["local_ref"],
        "name": code_examen,
        "test": intitule,
        "validation_date": entete["validation_date"],
        "details": [{k: v for k, v in d.items() if not k.startswith("_")} for d in acceptees],
    }
    reponse = requests.post(
        os.environ["EDEN_API_URL"].rstrip("/") + "/ingest/v1/laboratoire",
        headers={"X-EDEN-API-Key": os.environ["EDEN_API_KEY"]},
        json=[enregistrement],
        timeout=30,
    )
    print(f"Envoyé ({extraction['methode']}) : HTTP {reponse.status_code} {reponse.text.strip()}")
    return 0 if reponse.ok else 1


if __name__ == "__main__":
    args = [a for a in sys.argv[1:] if a != "--ia"]
    sys.exit(main(args[0], args[1], args[2], utiliser_ia="--ia" in sys.argv))
