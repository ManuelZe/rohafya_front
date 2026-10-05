"""Deux comptes rendus fictifs, même contenu, mises en page différentes."""
from fpdf import FPDF

FONT = "/usr/share/fonts/truetype/dejavu/DejaVuSans.ttf"


def base(title):
    pdf = FPDF()
    pdf.add_page()
    pdf.add_font("dv", fname=FONT)
    pdf.set_font("dv", size=14)
    pdf.cell(0, 10, title, new_x="LMARGIN", new_y="NEXT")
    pdf.set_font("dv", size=10)
    return pdf


# Laboratoire A : tableau Analyse | Résultat | Unité | Valeurs de référence, virgule décimale.
a = base("LABORATOIRE ALPHA — Compte rendu d'analyses")
for line in ["Patient : Aminata BELLO    Dossier : CLB-0001", "Prélevé le 27/09/2026    Validé le 28/09/2026 par Dr M. Owona", ""]:
    a.cell(0, 6, line, new_x="LMARGIN", new_y="NEXT")
rows = [("Analyse", "Résultat", "Unité", "Valeurs de référence"),
        ("Hémoglobine", "10,9 *", "g/dL", "12,0 - 16,0"),
        ("V.G.M.", "74", "fL", "80 - 100"),
        ("Leucocytes", "6,4", "G/L", "4,0 - 10,0"),
        ("Plaquettes", "251", "G/L", "150 - 400"),
        ("Glycémie à jeun", "0,94", "g/L", "0,70 - 1,10")]
for row in rows:
    for text, width in zip(row, (60, 30, 25, 50)):
        a.cell(width, 7, text, border=1)
    a.ln()
a.output("labo_alpha.pdf")

# Laboratoire B : liste « libellé : valeur unité (normes) », point décimal, intervalle AVANT la valeur
# pour certaines lignes, abréviations, autre ordre.
b = base("Centre BETA Diagnostics")
for line in [
    "Nom: BELLO Aminata - Réf. dossier CLB-0001 - Date de validation: 2026-09-28",
    "",
    "HEMATOLOGIE",
    "HB (hémoglobine) ........ [12.0-16.0] 10.9 g/dl  L",
    "Globules blancs : 6.4 x10^9/L  (N: 4.0 à 10.0)",
    "PLT : 251 x10^9/L (150-400)",
    "VGM : 74 fl  normes 80-100  BAS",
    "BIOCHIMIE",
    "Glucose (à jeun) = 5.2 mmol/L  [3.9 - 6.1]",
]:
    b.cell(0, 7, line, new_x="LMARGIN", new_y="NEXT")
b.output("labo_beta.pdf")
print("ok")
