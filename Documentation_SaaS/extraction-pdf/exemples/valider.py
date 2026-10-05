"""Contrôles automatiques d'une extraction (IA ou règles) avant publication dans EDEN."""
import re

from extraire_regles import ANALYSES, normaliser

# Bornes physiologiquement plausibles dans l'unité de référence : au-delà, erreur de lecture probable.
PLAUSIBLE = {"HB": (2, 25), "VGM": (40, 150), "GB": (0.1, 200), "PLQ": (1, 2000), "GLY": (0.1, 10)}


def nombres_du_texte(texte):
    """Tous les nombres présents dans le texte du PDF (virgule décimale comprise)."""
    return {float(n) for n in re.findall(r"\d+(?:\.\d+)?", normaliser(texte))}


def controler(details, texte_pdf):
    """Renvoie (lignes acceptées, anomalies). Une seule anomalie suffit à envoyer en relecture."""
    nombres = nombres_du_texte(texte_pdf) if texte_pdf.strip() else None
    acceptees, anomalies = [], []
    for d in details:
        code, valeur = d.get("code"), d.get("result")
        probleme = None
        if code not in ANALYSES:
            probleme = "analyse inconnue du dictionnaire"
        elif not isinstance(valeur, (int, float)):
            probleme = "valeur non numérique"
        elif nombres is not None and valeur not in nombres and d.get("_valeur_source") not in nombres:
            probleme = "valeur absente du texte du PDF (inventée ou mal lue ?)"
        elif code in PLAUSIBLE and not PLAUSIBLE[code][0] <= valeur <= PLAUSIBLE[code][1]:
            probleme = "valeur hors des bornes plausibles"
        if probleme:
            anomalies.append({"code": code, "result": valeur, "probleme": probleme})
            continue
        # « Hors norme » recalculé ici : on ne fait pas confiance au marquage fourni.
        bas, haut = d.get("lower_limit"), d.get("upper_limit")
        d["warning"] = (bas is not None and valeur < bas) or (haut is not None and valeur > haut)
        acceptees.append(d)
    return acceptees, anomalies


if __name__ == "__main__":
    import pdfplumber

    with pdfplumber.open("labo_alpha.pdf") as pdf:
        texte = pdf.pages[0].extract_text()
    sortie_ia = [  # sortie simulée d'un modèle : la 2e valeur n'existe pas dans le document
        {"code": "HB", "result": 10.9, "lower_limit": 12.0, "upper_limit": 16.0, "warning": False},
        {"code": "PLQ", "result": 215.0, "lower_limit": 150.0, "upper_limit": 400.0},
        {"code": "GB", "result": 640.0, "lower_limit": 4.0, "upper_limit": 10.0},
    ]
    ok, ko = controler(sortie_ia, texte)
    print("acceptées :", [(d["code"], d["result"], d["warning"]) for d in ok])
    print("anomalies :", ko)
