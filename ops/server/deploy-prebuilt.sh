#!/usr/bin/env bash
set -euo pipefail

release="${1:?Usage: deploy-prebuilt.sh COMMIT_SHA APP_DIRECTORY}"
app_directory="${2:?Usage: deploy-prebuilt.sh COMMIT_SHA APP_DIRECTORY}"
[[ "$release" =~ ^[a-f0-9]{40}$ ]] || { echo 'Release must be a full commit SHA' >&2; exit 1; }
cd "$app_directory"

for file in .env.production backend/.env.production admin/.env.production; do
  test -f "$file" || { echo "Missing $file" >&2; exit 1; }
done

for service in backend frontend admin; do
  revision="$(docker image inspect --format '{{index .Config.Labels "org.opencontainers.image.revision"}}' "slotsone-$service:$release")"
  test "$revision" = "$release" || { echo "Wrong image revision: $service" >&2; exit 1; }
done

previous_image="$(docker inspect --format '{{.Config.Image}}' slotsone-backend)"
previous_release="${previous_image#slotsone-backend:}"
[[ "$previous_image" == slotsone-backend:* ]] || { echo 'Cannot determine previous release' >&2; exit 1; }
for service in backend frontend admin; do
  docker image inspect "slotsone-$service:$previous_release" >/dev/null
done

compose() {
  SLOTSONE_IMAGE_TAG="$1" docker compose --env-file .env.production \
    -f docker-compose.prod.yml -f ops/server/compose.prebuilt.yml "${@:2}"
}

rollback() {
  echo "Release failed; restoring $previous_release" >&2
  compose "$previous_release" up -d --no-build --wait --wait-timeout 180 || true
}

if ! compose "$release" up -d --no-build --wait --wait-timeout 180; then
  rollback
  exit 1
fi

if ! compose "$release" exec -T caddy caddy reload --config /etc/caddy/Caddyfile </dev/null; then
  rollback
  exit 1
fi

admin_ready=0
for _ in $(seq 1 30); do
  if compose "$release" exec -T admin node -e \
    'fetch("http://127.0.0.1:3002/admin/login", {signal: AbortSignal.timeout(5000)}).then(r => process.exit(r.status === 200 ? 0 : 1)).catch(() => process.exit(1))' </dev/null; then
    admin_ready=1
    break
  fi
  sleep 2
done
if [[ "$admin_ready" != 1 ]]; then
  rollback
  exit 1
fi

if ! compose "$release" exec -T frontend wget -qO- http://127.0.0.1/version.json </dev/null \
  | grep -Fq "\"commit\":\"$release\""; then
  rollback
  exit 1
fi

if grep -q '^SLOTSONE_IMAGE_TAG=' .env.production; then
  sed -i "s/^SLOTSONE_IMAGE_TAG=.*/SLOTSONE_IMAGE_TAG=$release/" .env.production
else
  printf '\nSLOTSONE_IMAGE_TAG=%s\n' "$release" >> .env.production
fi

compose "$release" ps
echo "Production containers verified at $release"
