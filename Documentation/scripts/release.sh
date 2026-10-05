#!/usr/bin/env bash
# =============================================================================
#  Crée une nouvelle version (release) d'EDEN.
#
#  Usage :
#    bash Documentation/scripts/release.sh patch      # 1.4.2 -> 1.4.3  (corrections)
#    bash Documentation/scripts/release.sh minor      # 1.4.2 -> 1.5.0  (nouvelles fonctionnalités)
#    bash Documentation/scripts/release.sh major      # 1.4.2 -> 2.0.0  (changement incompatible)
#    bash Documentation/scripts/release.sh 1.0.0      # version explicite (1re release)
#  Options :
#    --dry-run      affiche ce qui serait fait, ne modifie rien
#    --no-push      crée commit + tag en local sans les pousser
#    --skip-tests   n'exécute pas tests et build (déconseillé)
#
#  Étapes : contrôles -> tests + build -> CHANGELOG.md -> package.json
#           -> commit « chore(release): vX.Y.Z » -> tag annoté vX.Y.Z -> push
#  Le push du tag déclenche la CI (construction + publication de l'image Docker).
# =============================================================================
set -euo pipefail
source "$(dirname "${BASH_SOURCE[0]}")/lib-commun.sh"

BRANCHE_RELEASE="${BRANCHE_RELEASE:-main}"
DRY_RUN=0; PUSH=1; TESTS=1; DEMANDE=""

for arg in "$@"; do
  case "$arg" in
    --dry-run) DRY_RUN=1 ;;
    --no-push) PUSH=0 ;;
    --skip-tests) TESTS=0 ;;
    patch|minor|major) DEMANDE="$arg" ;;
    -h|--help) sed -n '2,20p' "$0"; exit 0 ;;
    *) est_semver "$arg" && DEMANDE="$arg" || erreur "Argument inconnu : $arg (patch|minor|major|X.Y.Z)" ;;
  esac
done
[[ -n "$DEMANDE" ]] || erreur "Précisez patch, minor, major ou une version X.Y.Z (voir --help)."

exiger_commandes git node npm
cd "$EDEN_ROOT"

# -----------------------------------------------------------------------------
etape "1. Contrôles préalables"
# -----------------------------------------------------------------------------
branche="$(git rev-parse --abbrev-ref HEAD)"
[[ "$branche" == "$BRANCHE_RELEASE" ]] || erreur "Une release se fait depuis « $BRANCHE_RELEASE » (branche actuelle : $branche)."
ok "Branche : $branche"

[[ -z "$(git status --porcelain)" ]] || erreur "Des modifications ne sont pas commitées (git status). Commitez ou remisez-les d'abord."
ok "Arbre de travail propre"

if git remote get-url origin >/dev/null 2>&1; then
  git fetch --quiet --tags origin
  if git rev-parse --verify --quiet "origin/$BRANCHE_RELEASE" >/dev/null; then
    [[ "$(git rev-parse HEAD)" == "$(git rev-parse "origin/$BRANCHE_RELEASE")" ]] \
      || erreur "« $BRANCHE_RELEASE » n'est pas à jour avec origin (git pull puis relancez)."
    ok "À jour avec origin/$BRANCHE_RELEASE"
  fi
else
  alerte "Aucun dépôt distant « origin » : la release restera locale."
  PUSH=0
fi

# -----------------------------------------------------------------------------
etape "2. Calcul de la nouvelle version"
# -----------------------------------------------------------------------------
dernier_tag="$(git describe --tags --abbrev=0 --match 'v[0-9]*' 2>/dev/null || true)"
version_actuelle="${dernier_tag#v}"
[[ -n "$version_actuelle" ]] || version_actuelle="$(node -p "require('./package.json').version")"

if est_semver "$DEMANDE"; then
  nouvelle="$DEMANDE"
else
  IFS='.' read -r MAJ MIN PAT <<<"${version_actuelle%%-*}"
  case "$DEMANDE" in
    major) nouvelle="$((MAJ + 1)).0.0" ;;
    minor) nouvelle="${MAJ}.$((MIN + 1)).0" ;;
    patch) nouvelle="${MAJ}.${MIN}.$((PAT + 1))" ;;
  esac
fi
tag="v${nouvelle}"

git rev-parse -q --verify "refs/tags/${tag}" >/dev/null && erreur "Le tag ${tag} existe déjà."
info "Dernier tag      : ${dernier_tag:-aucun}"
info "Nouvelle version : ${C_GRAS}${nouvelle}${C_RESET} (tag ${tag})"

plage="${dernier_tag:+${dernier_tag}..}HEAD"
nb_commits="$(git rev-list --count "$plage")"
(( nb_commits > 0 )) || erreur "Aucun commit depuis ${dernier_tag} : rien à publier."
info "Commits inclus   : ${nb_commits}"

# Avertissement si un changement incompatible est présent sans version majeure.
if git log "$plage" --format='%s%n%b' | grep -qE '^[a-z]+(\([^)]*\))?!:|BREAKING CHANGE'; then
  [[ "$DEMANDE" == "major" ]] || alerte "Des changements INCOMPATIBLES (« ! » / BREAKING CHANGE) sont présents : une version « major » est recommandée."
fi

# -----------------------------------------------------------------------------
etape "3. Notes de version (CHANGELOG.md)"
# -----------------------------------------------------------------------------
section() { # $1 = regex des types, $2 = titre — imprime la section si elle a des commits
  local lignes
  lignes="$(git log "$plage" --no-merges --format='%s (%h)' | grep -E "^($1)(\([^)]*\))?!?: " | sed -E 's/^[a-z]+(\(([^)]*)\))?!?: /- **\2** /; s/- \*\*\*\* /- /' || true)"
  if [[ -n "$lignes" ]]; then printf '### %s\n\n%s\n\n' "$2" "$lignes"; fi
  return 0
}

section_divers() { # commits hors des types ci-dessus (chore, ci, build, test, style…)
  local lignes
  lignes="$(git log "$plage" --no-merges --format='%s (%h)' | grep -vE '^(feat|fix|perf|refactor|docs|chore\(release\))(\([^)]*\))?!?: ' | sed 's/^/- /' || true)"
  if [[ -n "$lignes" ]]; then printf '### Divers\n\n%s\n\n' "$lignes"; fi
  return 0
}

generer_notes() { # un seul appel capturé : les sauts de ligne entre sections sont conservés
  printf '## %s — %s\n\n' "$tag" "$(date +%Y-%m-%d)"
  section 'feat' 'Nouvelles fonctionnalités'
  section 'fix' 'Corrections'
  section 'perf' 'Performances'
  section 'refactor' 'Refonte du code'
  section 'docs' 'Documentation'
  section_divers
}

notes="$(generer_notes)"

printf '%s\n' "$notes" | sed 's/^/    │ /'

if (( DRY_RUN )); then
  etape "Mode --dry-run : aucune modification effectuée."
  exit 0
fi

confirmer "Publier la version ${tag} ?"

# -----------------------------------------------------------------------------
if (( TESTS )); then
  etape "4. Tests unitaires et build de production"
  npx ng test --watch=false
  npx ng build --configuration production >/dev/null
  ok "Tests et build réussis"
else
  alerte "4. Tests ignorés (--skip-tests)"
fi

# -----------------------------------------------------------------------------
etape "5. Mise à jour de package.json et CHANGELOG.md"
# -----------------------------------------------------------------------------
npm version "$nouvelle" --no-git-tag-version --allow-same-version >/dev/null
fichier_changelog="CHANGELOG.md"
if [[ -f "$fichier_changelog" ]]; then
  { head -n 2 "$fichier_changelog"; printf '%s\n\n' "$notes"; tail -n +3 "$fichier_changelog"; } > "${fichier_changelog}.tmp"
else
  { printf '# Historique des versions EDEN\n\n'; printf '%s\n\n' "$notes"; } > "${fichier_changelog}.tmp"
fi
mv "${fichier_changelog}.tmp" "$fichier_changelog"
ok "package.json -> ${nouvelle}, CHANGELOG.md complété"

# -----------------------------------------------------------------------------
etape "6. Commit et tag annoté"
# -----------------------------------------------------------------------------
git add package.json package-lock.json "$fichier_changelog"
git commit --quiet -m "chore(release): ${tag}"
git tag -a --cleanup=verbatim "$tag" -m "EDEN ${tag}" -m "$notes"
ok "Commit « chore(release): ${tag} » et tag ${tag} créés"

# -----------------------------------------------------------------------------
if (( PUSH )); then
  etape "7. Publication (push)"
  git push origin "$BRANCHE_RELEASE" 
  git push origin "$tag"
  ok "Poussé : la CI construit et publie l'image eden-app:${nouvelle}"
  info "Suivi : onglet « Actions » du dépôt, puis déploiement :"
  info "  bash Documentation/scripts/deployer-portainer.sh ${nouvelle}"
else
  alerte "7. Push non effectué. Pour publier : git push origin ${BRANCHE_RELEASE} && git push origin ${tag}"
fi
