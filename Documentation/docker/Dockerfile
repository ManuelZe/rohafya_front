# syntax=docker/dockerfile:1.7
# =============================================================================
#  EDEN — image Docker de l'application Angular 22 (SSR, serveur Node/Express)
#
#  Construction (depuis la RACINE du dépôt) :
#    docker build -f Documentation/docker/Dockerfile \
#      --build-arg APP_VERSION=1.2.0 \
#      --build-arg GIT_COMMIT=$(git rev-parse --short HEAD) \
#      --build-arg BUILD_DATE=$(date -u +%Y-%m-%dT%H:%M:%SZ) \
#      -t ghcr.io/<organisation>/eden-app:1.2.0 .
#
#  Le fichier Dockerfile.dockerignore (même dossier) est pris en compte automatiquement
#  par BuildKit : node_modules, dist, .git… ne sont pas envoyés au démon Docker.
#  Voir Documentation/02_DEPLOIEMENT_HETZNER_PORTAINER.txt, étape 4.
# =============================================================================

# Version de Node alignée sur les exigences d'Angular 22 (^22.22.3 || ^24.15.0).
ARG NODE_IMAGE=node:24-alpine

# -----------------------------------------------------------------------------
# 1) Dépendances : couche mise en cache tant que package*.json ne change pas
# -----------------------------------------------------------------------------
FROM ${NODE_IMAGE} AS deps
WORKDIR /app
COPY package.json package-lock.json ./
RUN --mount=type=cache,target=/root/.npm npm ci --no-audit --no-fund

# -----------------------------------------------------------------------------
# 2) Build de production Angular (navigateur + serveur SSR + pré-rendu)
# -----------------------------------------------------------------------------
FROM deps AS build
COPY . .
ENV NG_CLI_ANALYTICS=false
RUN npx ng build --configuration production

# -----------------------------------------------------------------------------
# 3) Image d'exécution minimale : uniquement le résultat du build
#    (le serveur SSR est entièrement bundlé : pas de node_modules à l'exécution)
# -----------------------------------------------------------------------------
FROM ${NODE_IMAGE} AS runtime

ARG APP_VERSION=dev
ARG GIT_COMMIT=unknown
ARG BUILD_DATE=unknown

LABEL org.opencontainers.image.title="EDEN" \
      org.opencontainers.image.description="Application EDEN — espaces patient et docteur (Angular SSR)" \
      org.opencontainers.image.version="${APP_VERSION}" \
      org.opencontainers.image.revision="${GIT_COMMIT}" \
      org.opencontainers.image.created="${BUILD_DATE}" \
      org.opencontainers.image.vendor="PDMD Santé"

ENV NODE_ENV=production \
    PORT=4000 \
    APP_VERSION=${APP_VERSION} \
    GIT_COMMIT=${GIT_COMMIT} \
    TZ=Africa/Douala

# tzdata : horodatage des journaux à l'heure locale ; tini : PID 1 propre (signaux, zombies).
RUN apk add --no-cache tzdata tini

WORKDIR /app
COPY --from=build --chown=node:node /app/dist/eden_app ./dist/eden_app

# Jamais root dans le conteneur.
USER node

EXPOSE 4000

# Utilisé par Docker/Portainer pour marquer le conteneur « healthy » / « unhealthy ».
HEALTHCHECK --interval=30s --timeout=5s --start-period=20s --retries=3 \
  CMD wget -q -O /dev/null "http://127.0.0.1:${PORT}/healthz" || exit 1

ENTRYPOINT ["/sbin/tini", "--"]
CMD ["node", "dist/eden_app/server/server.mjs"]
