#!/usr/bin/env bash
# =============================================================================
#  Préparation / sécurisation du serveur Hetzner qui héberge EDEN.
#  Cible : Ubuntu 22.04 / 24.04 LTS (ou Debian 12). À exécuter EN ROOT, une seule fois
#  (ré-exécutable sans danger : chaque étape vérifie l'existant).
#
#  Usage (depuis votre poste) :
#    scp Documentation/serveur/preparation-serveur-hetzner.sh root@IP_DU_SERVEUR:/root/
#    ssh root@IP_DU_SERVEUR 'bash /root/preparation-serveur-hetzner.sh deploy'
#      (argument = nom de l'utilisateur d'exploitation à créer, « deploy » par défaut)
#
#  Ce que fait le script :
#    1. mises à jour système + outils (curl, jq, ufw, fail2ban, unattended-upgrades)
#    2. fichier d'échange (swap) de 2 Go s'il n'en existe pas
#    3. utilisateur d'exploitation (sudo + docker) avec vos clés SSH
#    4. Docker Engine (si absent) + rotation des journaux Docker
#    5. pare-feu UFW : SSH, 80, 443 uniquement
#    6. fail2ban (protection SSH) et mises à jour de sécurité automatiques
#    7. durcissement SSH (mot de passe désactivé SEULEMENT si une clé est en place)
#    8. réseau Docker partagé « proxy »
#    9. Portainer CE : conservé tel quel s'il existe, sinon installé en local (127.0.0.1:9443)
# =============================================================================
set -euo pipefail

UTILISATEUR="${1:-deploy}"

etape() { printf '\n\e[1;34m==> %s\e[0m\n' "$*"; }
ok()    { printf '\e[32m    ✔ %s\e[0m\n' "$*"; }
alerte(){ printf '\e[33m    ⚠ %s\e[0m\n' "$*"; }

[[ $EUID -eq 0 ]] || { echo "Ce script doit être exécuté en root."; exit 1; }
. /etc/os-release
[[ "$ID" == "ubuntu" || "$ID" == "debian" ]] || { echo "Système non pris en charge : $PRETTY_NAME"; exit 1; }
ok "Système : $PRETTY_NAME"

# -----------------------------------------------------------------------------
etape "1. Mises à jour et outils"
export DEBIAN_FRONTEND=noninteractive
apt-get update -q
apt-get upgrade -y -q
apt-get install -y -q ca-certificates curl gnupg jq ufw fail2ban unattended-upgrades apt-listchanges
ok "Système à jour, outils installés"

# -----------------------------------------------------------------------------
etape "2. Mémoire d'échange (swap)"
if swapon --show | grep -q .; then
  ok "Swap déjà présent : $(swapon --show --noheadings | awk '{print $1" "$3}')"
else
  fallocate -l 2G /swapfile
  chmod 600 /swapfile
  mkswap /swapfile >/dev/null
  swapon /swapfile
  grep -q '^/swapfile' /etc/fstab || echo '/swapfile none swap sw 0 0' >> /etc/fstab
  sysctl -q vm.swappiness=10
  echo 'vm.swappiness=10' > /etc/sysctl.d/99-swappiness.conf
  ok "Swap de 2 Go créé"
fi

# -----------------------------------------------------------------------------
etape "3. Utilisateur d'exploitation « ${UTILISATEUR} »"
if id "$UTILISATEUR" >/dev/null 2>&1; then
  ok "Utilisateur existant"
else
  adduser --disabled-password --gecos "Exploitation EDEN" "$UTILISATEUR" >/dev/null
  ok "Utilisateur créé"
fi
usermod -aG sudo "$UTILISATEUR"
home_u="$(getent passwd "$UTILISATEUR" | cut -d: -f6)"
install -d -m 700 -o "$UTILISATEUR" -g "$UTILISATEUR" "$home_u/.ssh"
if [[ ! -s "$home_u/.ssh/authorized_keys" && -s /root/.ssh/authorized_keys ]]; then
  install -m 600 -o "$UTILISATEUR" -g "$UTILISATEUR" /root/.ssh/authorized_keys "$home_u/.ssh/authorized_keys"
  ok "Clés SSH de root copiées pour ${UTILISATEUR}"
fi
if [[ -s "$home_u/.ssh/authorized_keys" ]]; then
  ok "Connexion par clé SSH disponible pour ${UTILISATEUR}"
  CLE_OK=1
else
  alerte "Aucune clé SSH pour ${UTILISATEUR} : ajoutez-en une (ssh-copy-id) avant de désactiver les mots de passe."
  CLE_OK=0
fi
alerte "Définissez un mot de passe sudo pour ${UTILISATEUR} : passwd ${UTILISATEUR}"

# -----------------------------------------------------------------------------
etape "4. Docker Engine"
if command -v docker >/dev/null 2>&1; then
  ok "Docker déjà installé : $(docker --version)"
else
  curl -fsSL https://get.docker.com | sh
  ok "Docker installé : $(docker --version)"
fi
systemctl enable --now docker >/dev/null
usermod -aG docker "$UTILISATEUR"

if [[ -f /etc/docker/daemon.json ]]; then
  alerte "/etc/docker/daemon.json existe déjà : vérifiez qu'il limite la taille des journaux (voir 02_DEPLOIEMENT…, étape 3)."
else
  cat > /etc/docker/daemon.json <<'EOF'
{
  "log-driver": "json-file",
  "log-opts": { "max-size": "10m", "max-file": "5" },
  "live-restore": true
}
EOF
  systemctl restart docker
  ok "Rotation des journaux Docker configurée (10 Mo x 5)"
fi

# -----------------------------------------------------------------------------
etape "5. Pare-feu UFW"
ufw default deny incoming >/dev/null
ufw default allow outgoing >/dev/null
ufw allow OpenSSH >/dev/null
ufw allow 80/tcp >/dev/null
ufw allow 443/tcp >/dev/null
ufw --force enable >/dev/null
ok "UFW actif : SSH, 80, 443 autorisés"
alerte "Docker contourne UFW pour les ports publiés : ne publiez des ports que sur 127.0.0.1 (sauf 80/443),"
alerte "et configurez AUSSI le pare-feu Hetzner Cloud (console Hetzner > Firewalls)."

# -----------------------------------------------------------------------------
etape "6. fail2ban et mises à jour automatiques"
cat > /etc/fail2ban/jail.d/eden-sshd.local <<'EOF'
[sshd]
enabled  = true
maxretry = 5
findtime = 10m
bantime  = 1h
EOF
systemctl enable --now fail2ban >/dev/null
systemctl restart fail2ban
ok "fail2ban actif (SSH : 5 essais / 10 min -> bannissement 1 h)"
echo 'APT::Periodic::Update-Package-Lists "1";
APT::Periodic::Unattended-Upgrade "1";' > /etc/apt/apt.conf.d/20auto-upgrades
ok "Mises à jour de sécurité automatiques activées"

# -----------------------------------------------------------------------------
etape "7. Durcissement SSH"
if [[ "$CLE_OK" == "1" ]]; then
  cat > /etc/ssh/sshd_config.d/99-eden.conf <<'EOF'
PermitRootLogin prohibit-password
PasswordAuthentication no
KbdInteractiveAuthentication no
MaxAuthTries 4
X11Forwarding no
EOF
  if sshd -t; then
    systemctl reload ssh 2>/dev/null || systemctl reload sshd
    ok "Connexion par mot de passe désactivée (clés SSH uniquement)"
    alerte "AVANT de fermer cette session, testez dans un autre terminal : ssh ${UTILISATEUR}@IP_DU_SERVEUR"
  else
    rm -f /etc/ssh/sshd_config.d/99-eden.conf
    alerte "Configuration SSH invalide : durcissement annulé."
  fi
else
  alerte "Durcissement SSH IGNORÉ (aucune clé pour ${UTILISATEUR}). Relancez le script après avoir ajouté une clé."
fi

# -----------------------------------------------------------------------------
etape "8. Réseau Docker partagé « proxy »"
if docker network inspect proxy >/dev/null 2>&1; then
  ok "Réseau « proxy » déjà présent"
else
  docker network create proxy >/dev/null
  ok "Réseau « proxy » créé (partagé par Nginx Proxy Manager et EDEN)"
fi

# -----------------------------------------------------------------------------
etape "9. Portainer CE"
if docker ps -a --format '{{.Image}} {{.Names}}' | grep -qi 'portainer'; then
  ok "Portainer déjà installé : $(docker ps -a --format '{{.Names}} ({{.Image}}, {{.Status}})' | grep -i portainer | head -1)"
  if docker port "$(docker ps -a --format '{{.Names}}' | grep -i portainer | head -1)" 2>/dev/null | grep -q '0.0.0.0'; then
    alerte "Portainer est exposé sur Internet : restreignez le port 9443 à votre IP dans le pare-feu Hetzner"
    alerte "ou accédez-y uniquement par tunnel SSH (voir 02_DEPLOIEMENT…, étape 2)."
  fi
else
  docker volume create portainer_data >/dev/null
  docker run -d --name portainer --restart=always \
    -p 127.0.0.1:9443:9443 \
    -v /var/run/docker.sock:/var/run/docker.sock \
    -v portainer_data:/data \
    portainer/portainer-ce:lts >/dev/null
  ok "Portainer CE installé (accessible uniquement en local : 127.0.0.1:9443)"
  alerte "Créez le compte administrateur dans les 5 minutes via le tunnel SSH :"
  alerte "  ssh -N -L 9443:127.0.0.1:9443 ${UTILISATEUR}@IP_DU_SERVEUR  puis https://localhost:9443"
fi

etape "Préparation terminée"
echo "    Étape suivante : Documentation/02_DEPLOIEMENT_HETZNER_PORTAINER.txt, étape 5 (registre d'images)."
