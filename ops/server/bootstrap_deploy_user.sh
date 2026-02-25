#!/usr/bin/env bash
set -euo pipefail

if [ "${EUID}" -ne 0 ]; then
  echo "Run as root: sudo bash ops/server/bootstrap_deploy_user.sh"
  exit 1
fi

DEPLOY_USER="${DEPLOY_USER:-deploy}"
DEPLOY_HOME="/home/${DEPLOY_USER}"
DEPLOY_PUBLIC_KEY="${DEPLOY_PUBLIC_KEY:-}"
APP_DIR="${APP_DIR:-/opt/slotsone}"

echo "[1/6] Installing system dependencies"
apt-get update -y
apt-get install -y ca-certificates curl gnupg lsb-release

if ! command -v docker >/dev/null 2>&1; then
  echo "[2/6] Installing Docker Engine + Compose plugin"
  install -m 0755 -d /etc/apt/keyrings
  curl -fsSL https://download.docker.com/linux/ubuntu/gpg -o /etc/apt/keyrings/docker.asc
  chmod a+r /etc/apt/keyrings/docker.asc

  ARCH="$(dpkg --print-architecture)"
  RELEASE_CODENAME="$(. /etc/os-release && echo "${VERSION_CODENAME}")"
  echo \
    "deb [arch=${ARCH} signed-by=/etc/apt/keyrings/docker.asc] https://download.docker.com/linux/ubuntu ${RELEASE_CODENAME} stable" \
    > /etc/apt/sources.list.d/docker.list

  apt-get update -y
  apt-get install -y docker-ce docker-ce-cli containerd.io docker-buildx-plugin docker-compose-plugin
fi

echo "[3/6] Ensuring deploy user exists"
if ! id "${DEPLOY_USER}" >/dev/null 2>&1; then
  useradd -m -s /bin/bash "${DEPLOY_USER}"
fi

echo "[4/6] Configuring deploy user SSH access"
install -d -m 700 -o "${DEPLOY_USER}" -g "${DEPLOY_USER}" "${DEPLOY_HOME}/.ssh"
AUTH_KEYS="${DEPLOY_HOME}/.ssh/authorized_keys"
touch "${AUTH_KEYS}"
chmod 600 "${AUTH_KEYS}"
chown "${DEPLOY_USER}:${DEPLOY_USER}" "${AUTH_KEYS}"

if [ -n "${DEPLOY_PUBLIC_KEY}" ]; then
  if ! grep -qxF "${DEPLOY_PUBLIC_KEY}" "${AUTH_KEYS}"; then
    printf '%s\n' "${DEPLOY_PUBLIC_KEY}" >> "${AUTH_KEYS}"
  fi
else
  echo "DEPLOY_PUBLIC_KEY is empty. Add your public key manually to ${AUTH_KEYS}."
fi

echo "[5/6] Granting Docker access and preparing app directory"
usermod -aG docker "${DEPLOY_USER}"
mkdir -p "${APP_DIR}"
chown -R "${DEPLOY_USER}:${DEPLOY_USER}" "${APP_DIR}"

echo "[6/6] Done"
cat <<EOF
Next steps:
1. As root, harden SSH in /etc/ssh/sshd_config:
   - PermitRootLogin no
   - PasswordAuthentication no
2. Restart SSH: systemctl restart ssh
3. As deploy user, create runtime env files:
   - ${APP_DIR}/backend/.env.production
   - ${APP_DIR}/.env.production
4. In GitHub repository settings, add secrets:
   - DEPLOY_HOST
   - DEPLOY_PORT
   - DEPLOY_USER
   - DEPLOY_PATH
   - DEPLOY_SSH_KEY
   - DEPLOY_KNOWN_HOSTS (optional but recommended)
EOF
