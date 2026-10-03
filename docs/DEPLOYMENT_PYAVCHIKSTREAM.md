# Portfolio deployment

Last recorded manual deployment: 2026-09-24.

- Server: `64.176.66.50` (Ubuntu, SSH user `root`).
- Portfolio: https://pyavchikstream.online
- Admin: https://pyavchikstream.online/admin
- API documentation: https://pyavchikstream.online/api-docs
- Application directory: `/opt/slotsone`.
- Image tag: `20260924`.

## Automated releases

The `Deploy Production` workflow targets this server on pushes to `main`,
or when dispatched manually. It checks SSH access first, builds the three
Docker images on the GitHub runner, and transfers them to the server.
Only the Compose files and Caddy configuration are synced. Runtime environment
files, credentials, and database volumes remain on the server.

Configure `DEPLOY_SSH_KEY_B64` (preferred) or `DEPLOY_SSH_KEY` with a key that
can access this server, and set `DEPLOY_KNOWN_HOSTS` to its verified SSH host
key entry. These secrets must match `64.176.66.50`; credentials for the old
server will not work. The SSH user defaults to `root`; set the repository
variable `DEPLOY_USER` to use another account with Docker and application
directory access.

Images are tagged and labeled with the full Git commit SHA. The deployment
script waits for containers, checks the admin login and frontend revision,
and restores the previous images if those checks fail. After success, it
persists `SLOTSONE_IMAGE_TAG` in the server's `.env.production`. Previous
images are retained for rollback. Database migrations are not rolled back.

The workflow then verifies `/ready`, `/version.json`, `/`, and `/admin/login`
over HTTPS. `/version.json` identifies the deployed frontend commit.

## Manual releases

Both the apex and `www` DNS records point to the server. Caddy obtains and
renews Let's Encrypt certificates automatically. HTTP redirects to HTTPS;
`www` redirects to the apex domain. Ports 80 and 443 are public; databases
and application containers are reachable only on the Docker network.

The server has approximately 1 GB RAM. Build the three application images
on an amd64 Linux development machine, then transfer them to the server.
Use the prebuilt-image override when starting or updating this deployment.

```bash
# Run on the development machine from the repository root.
docker build -t slotsone-backend:20260924 backend
docker build --build-arg APP_REVISION="$(git rev-parse HEAD)" -t slotsone-frontend:20260924 frontend
docker build -t slotsone-admin:20260924 admin
set -o pipefail
docker save slotsone-backend:20260924 slotsone-frontend:20260924 slotsone-admin:20260924 \
  | gzip -1 | ssh root@64.176.66.50 'gzip -d | docker load'

# Run on the server after loading the images.
cd /opt/slotsone
docker compose --env-file .env.production \
  -f docker-compose.prod.yml -f ops/server/compose.prebuilt.yml \
  up -d --no-build --wait --wait-timeout 120
```

For a new release, choose a new image tag and update `SLOTSONE_IMAGE_TAG` in
the server's `.env.production` to match. Sync changed application source and
deployment configuration separately, preserving the production environment
files and `secrets/` directory. The original September deployment used this
manual process; new automated releases use commit SHA tags as described above.

Production secrets are stored only in root-readable server files:

- `/opt/slotsone/.env.production`
- `/opt/slotsone/backend/.env.production`
- `/opt/slotsone/admin/.env.production`
- `/opt/slotsone/secrets/admin-login.txt` (initial administrator credentials)

The administrator uses the portfolio contact email, `pyavchik@gmail.com`,
and a generated password. The sample `admin123` accounts were not created.
A local credential copy is in the git-ignored `.tmp/deployment/admin-login.txt`.

The deployment uses fresh databases. Existing player data was not migrated.
Optional Sentry, image-generation, and email/Atlassian integrations require
their own environment settings and were not configured for this host.

For status and logs, use the same Compose options followed by `ps` or
`logs --tail 100 backend admin caddy`. Readiness is available at
https://pyavchikstream.online/ready.

PostgreSQL data and certificates use persistent Docker volumes. All six
services restart automatically with Docker, which is enabled at boot.
Container logs rotate at 10 MB with three files per container.
