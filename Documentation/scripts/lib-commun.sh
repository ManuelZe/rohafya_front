#!/usr/bin/env bash
# =============================================================================
#  Fonctions communes aux scripts EDEN (à « sourcer », ne pas exécuter seul).
# =============================================================================

# Racine du dépôt Git, quel que soit le dossier d'où le script est lancé.
EDEN_SCRIPTS_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
EDEN_DOC_DIR="$(cd "${EDEN_SCRIPTS_DIR}/.." && pwd)"
EDEN_ROOT="$(cd "${EDEN_DOC_DIR}/.." && pwd)"

if [[ -t 1 ]]; then
  C_RESET=$'\e[0m'; C_BLEU=$'\e[34m'; C_VERT=$'\e[32m'; C_JAUNE=$'\e[33m'; C_ROUGE=$'\e[31m'; C_GRAS=$'\e[1m'
else
  C_RESET=''; C_BLEU=''; C_VERT=''; C_JAUNE=''; C_ROUGE=''; C_GRAS=''
fi

etape()  { printf '\n%s==> %s%s\n' "${C_GRAS}${C_BLEU}" "$*" "${C_RESET}"; }
info()   { printf '    %s\n' "$*"; }
ok()     { printf '%s    ✔ %s%s\n' "${C_VERT}" "$*" "${C_RESET}"; }
alerte() { printf '%s    ⚠ %s%s\n' "${C_JAUNE}" "$*" "${C_RESET}" >&2; }
erreur() { printf '%s    ✖ %s%s\n' "${C_ROUGE}" "$*" "${C_RESET}" >&2; exit 1; }

# Vérifie que les commandes nécessaires sont installées.
exiger_commandes() {
  local cmd
  for cmd in "$@"; do
    command -v "$cmd" >/dev/null 2>&1 || erreur "Commande « $cmd » introuvable : installez-la avant de continuer."
  done
}

# Charge Documentation/scripts/deploiement.conf (non versionné, contient les secrets).
charger_configuration() {
  local conf="${EDEN_SCRIPTS_DIR}/deploiement.conf"
  if [[ -f "$conf" ]]; then
    # shellcheck source=/dev/null
    source "$conf"
  fi
}

# Demande confirmation (sauf si OUI=1 dans l'environnement, utilisé par la CI).
confirmer() {
  [[ "${OUI:-0}" == "1" ]] && return 0
  local reponse
  read -r -p "    $1 [o/N] " reponse
  [[ "$reponse" =~ ^[oOyY]$ ]] || erreur "Opération annulée."
}

# Valide un numéro de version SemVer (sans « v »).
est_semver() {
  [[ "$1" =~ ^(0|[1-9][0-9]*)\.(0|[1-9][0-9]*)\.(0|[1-9][0-9]*)(-[0-9A-Za-z.-]+)?$ ]]
}
