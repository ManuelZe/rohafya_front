#!/usr/bin/env bash
# =============================================================================
#  Construit l'image Docker d'EDEN et la publie sur le registre (sans CI).
#  À utiliser si GitHub Actions n'est pas disponible. En temps normal, c'est la CI
#  qui fait ce travail au push d'un tag (voir 02_DEPLOIEMENT_HETZNER_PORTAINER.txt).
#
#  Usage :
#    bash Documentation/scripts/build-push.sh            # version = tag Git du commit courant
#    bash Documentation/scripts/build-push.sh --no-push  # construit seulement (test local)
#
#  Règle : seule une version taguée (vX.Y.Z) peut être publiée. Cela garantit
#  que l'image « eden-app:X.Y.Z » correspond EXACTEMENT au code du tag vX.Y.Z.
# =============================================================================
set -euo pipefail
source "$(dirname "${BASH_SOURCE[0]}")/lib-commun.sh"
charger_configuration

PUSH=1
[[ "${1:-}" == "--no-push" ]] && PUSH=0
EDEN_IMAGE="${EDEN_IMAGE:-ghcr.io/pdmdsante/eden-app}"

exiger_commandes git docker
cd "$EDEN_ROOT"

etape "1. Identification de la version"
[[ -z "$(git status --porcelain)" ]] || erreur "Modifications non commitées : l'image ne correspondrait à aucun commit."
tag="$(git describe --tags --exact-match --match 'v[0-9]*' 2>/dev/null || true)"
[[ -n "$tag" ]] || erreur "Le commit courant n'a pas de tag vX.Y.Z. Créez d'abord une release (release.sh) ou faites « git checkout vX.Y.Z »."
version="${tag#v}"
est_semver "$version" || erreur "Tag invalide : $tag"
commit="$(git rev-parse --short HEAD)"
ok "Version ${version} (commit ${commit})"

# Tags d'image : 1.4.2, 1.4, 1 (+ latest pour une version stable sans suffixe)
tags=("${EDEN_IMAGE}:${version}")
if [[ "$version" != *-* ]]; then
  IFS='.' read -r MAJ MIN _ <<<"$version"
  tags+=("${EDEN_IMAGE}:${MAJ}.${MIN}" "${EDEN_IMAGE}:${MAJ}" "${EDEN_IMAGE}:latest")
fi

etape "2. Construction de l'image"
args=()
for t in "${tags[@]}"; do args+=(-t "$t"); done
DOCKER_BUILDKIT=1 docker build \
  -f Documentation/docker/Dockerfile \
  --build-arg APP_VERSION="$version" \
  --build-arg GIT_COMMIT="$commit" \
  --build-arg BUILD_DATE="$(date -u +%Y-%m-%dT%H:%M:%SZ)" \
  "${args[@]}" .
ok "Image construite : ${tags[*]}"

etape "3. Test de fumée du conteneur"
nom="eden-smoke-$$"
docker run -d --rm --name "$nom" -p 127.0.0.1:4099:4000 -e API_URL=https://exemple.invalid/ "${tags[0]}" >/dev/null
trap 'docker stop "$nom" >/dev/null 2>&1 || true' EXIT
for _ in $(seq 1 20); do
  sante="$(curl -fsS http://127.0.0.1:4099/healthz 2>/dev/null || true)"
  [[ -n "$sante" ]] && break
  sleep 1
done
[[ "$sante" == *"\"version\":\"${version}\""* ]] || erreur "Le conteneur ne répond pas correctement sur /healthz : ${sante:-aucune réponse}"
ok "/healthz : $sante"

if (( PUSH )); then
  etape "4. Publication sur le registre"
  registre="${EDEN_IMAGE%%/*}"
  if [[ -n "${REGISTRY_TOKEN:-}" ]]; then
    printf '%s' "$REGISTRY_TOKEN" | docker login "$registre" -u "${REGISTRY_USER:?REGISTRY_USER manquant}" --password-stdin >/dev/null
  fi
  for t in "${tags[@]}"; do docker push --quiet "$t"; ok "Publié : $t"; done
  info "Déploiement : bash Documentation/scripts/deployer-portainer.sh ${version}"
else
  alerte "4. Publication ignorée (--no-push)"
fi
