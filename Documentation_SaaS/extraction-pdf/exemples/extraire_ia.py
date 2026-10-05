"""Lecture d'un compte rendu PDF (texte ou scanné) par Claude, sortie JSON imposée par un schéma.

Le modèle RECOPIE ce qui est imprimé (libellé, valeur, unité, normes) ligne par ligne ; il ne
convertit et n'interprète rien. La normalisation et les contrôles restent dans notre code
(pont_ia.py puis valider.py), testé et prévisible.

ATTENTION : ce script envoie le PDF (données de santé nominatives) à l'API d'Anthropic.
Ne l'utiliser qu'après accord sur la protection des données (voir EXTRACTION_RESULTATS_PDF.txt §6).

Installation : pip install anthropic
Clé : variable d'environnement ANTHROPIC_API_KEY.
"""
import base64
import json
import sys

import anthropic

MODELE = "claude-opus-5-5"

SCHEMA = {
    "type": "object",
    "properties": {
        "dossier": {"type": "string", "description": "Numéro de dossier du patient, chaîne vide si absent"},
        "date_validation": {"type": "string", "description": "Date de validation au format AAAA-MM-JJ, vide si absente"},
        "analyses": {
            "type": "array",
            "items": {
                "type": "object",
                "properties": {
                    "libelle_imprime": {"type": "string"},
                    "valeur_imprimee": {"type": "string"},
                    "unite_imprimee": {"type": "string"},
                    "normes_imprimees": {"type": "string"},
                    "marque_anormale": {"type": "boolean"},
                    "page": {"type": "integer"},
                },
                "required": ["libelle_imprime", "valeur_imprimee", "unite_imprimee", "normes_imprimees", "marque_anormale", "page"],
                "additionalProperties": False,
            },
        },
    },
    "required": ["dossier", "date_validation", "analyses"],
    "additionalProperties": False,
}

CONSIGNE = """Ce document est un compte rendu d'analyses médicales.
Recopie chaque résultat chiffré, une entrée par analyse, exactement comme il est imprimé :
le libellé, la valeur (avec sa virgule ou son point), l'unité et les valeurs de référence.
N'effectue aucune conversion d'unité et ne corrige rien. Si une information n'est pas imprimée,
laisse le champ vide. marque_anormale vaut true seulement si le document signale la valeur
(astérisque, H, L, flèche, gras, mention « bas » ou « élevé »). Ignore les en-têtes, les adresses
et les commentaires sans valeur chiffrée."""


def lire_pdf(chemin):
    client = anthropic.Anthropic()
    with open(chemin, "rb") as f:
        pdf_b64 = base64.standard_b64encode(f.read()).decode("ascii")

    response = client.beta.messages.create(
        model=MODELE,
        max_tokens=16000,
        # Si le modèle refuse la requête, l'API la rejoue sur le modèle de repli recommandé.
        betas=["server-side-fallback-2026-07-01"],
        fallbacks="default",
        output_config={"effort": "high", "format": {"type": "json_schema", "schema": SCHEMA}},
        messages=[
            {
                "role": "user",
                "content": [
                    {"type": "document", "source": {"type": "base64", "media_type": "application/pdf", "data": pdf_b64}},
                    {"type": "text", "text": CONSIGNE},
                ],
            }
        ],
    )

    if response.stop_reason == "refusal":
        raise RuntimeError(f"Lecture refusée : {response.stop_details}")
    if response.stop_reason == "max_tokens":
        raise RuntimeError("Réponse tronquée : document trop long, le découper par pages.")
    texte = next(block.text for block in response.content if block.type == "text")
    return json.loads(texte)


if __name__ == "__main__":
    print(json.dumps(lire_pdf(sys.argv[1]), ensure_ascii=False, indent=2))
