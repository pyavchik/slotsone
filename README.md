# Slots — iGaming Slot (Backend + Frontend)

Reference implementation of a slot game:
- backend: RNG, spin engine, JWT-protected API
- frontend: React + PixiJS reel rendering and game UI
- docs: architecture, security, UI and design guides

## Repository Structure

- `backend/` — Node.js + Express API
- `frontend/` — Vite + React + TypeScript + PixiJS client
- `docs/` — architecture and compliance documentation
- `postman/` — API collection and environment

## Requirements

- Node.js 20+
- npm 10+

## Quick Start (Development)

1. Start backend:

```bash
cd backend
npm install
cp .env.development.example .env.development
npm run dev
```

Backend runs on `http://localhost:3001`.

2. Start frontend in a second terminal:

```bash
cd frontend
npm install
npm run dev
```

Open `http://localhost:5173`. Vite proxies `/api` to the backend.

## API Endpoints

- `POST /api/v1/game/init`
- `POST /api/v1/spin`
- `GET /api/v1/history`
- `GET /health`

## Authentication (JWT)

The backend accepts only valid JWT tokens in:

`Authorization: Bearer <token>`

Supported signing algorithms:
- `HS256`
- `RS256`

Configuration is loaded automatically from:
- `backend/.env`
- `backend/.env.<NODE_ENV>`

### Important JWT Environment Variables

- `JWT_ALLOWED_ALGS` — comma-separated allowlist (`HS256`, `RS256`)
- `JWT_HS256_SECRET` — required if `HS256` is enabled
- `JWT_PUBLIC_KEY` — required if `RS256` is enabled (PEM; supports `\n`)
- `JWT_ISSUER` — optional claim check
- `JWT_AUDIENCE` — optional claim check

Frontend uses a built-in dev token by default.  
Override with `VITE_DEMO_JWT` if needed.

## Production Deployment (GitHub Actions + Docker Compose)

This repository includes:
- `docker-compose.prod.yml`
- `backend/Dockerfile`
- `frontend/Dockerfile`
- `.github/workflows/deploy.yml`
- `ops/server/bootstrap_deploy_user.sh`

### 1) Prepare the server (run once as root)

```bash
git clone <your-repo-url>
cd slotsone
sudo DEPLOY_USER=deploy DEPLOY_PUBLIC_KEY="<your-public-key>" bash ops/server/bootstrap_deploy_user.sh
```

After script execution:
- Docker + Compose plugin are installed
- non-root `deploy` user exists
- `/opt/slotsone` is owned by `deploy`

### 2) Configure runtime env files on the server

Login as `deploy` and create:
- `/opt/slotsone/backend/.env.production` (backend JWT config)
- `/opt/slotsone/.env.production` (root file used for compose build args)

You can start from:
- `backend/.env.production.example`
- `.env.production.example`

Example root file:

```bash
VITE_DEMO_JWT=<production-jwt-for-frontend-build>
```

### 3) Add GitHub repository secrets

Required secrets for `.github/workflows/deploy.yml`:
- `DEPLOY_HOST` (for example `64.176.72.28`)
- `DEPLOY_PORT` (usually `22`)
- `DEPLOY_USER` (for example `deploy`)
- `DEPLOY_PATH` (for example `/opt/slotsone`)
- `DEPLOY_SSH_KEY` (private key matching `DEPLOY_PUBLIC_KEY`)
- `DEPLOY_KNOWN_HOSTS` (optional but recommended)

### 4) Deploy

- Push to `main` (or run workflow manually via `workflow_dispatch`)
- GitHub Actions builds backend/frontend
- Workflow syncs files over SSH and runs:

```bash
docker compose --env-file .env.production -f docker-compose.prod.yml up -d --build --remove-orphans
```

App is served by frontend nginx container on port `80` and proxies `/api` to backend.

## Manual Build Commands

```bash
# Backend
cd backend
npm run build
npm start

# Frontend
cd frontend
npm run build
```

## Testing (Postman/Newman)

```bash
cd postman
newman run slots-collection.json -e dev.env.json
```

See `postman/README.md` for the full regression suite details.

## Game Flow Summary

1. Client calls `POST /api/v1/game/init`
2. User presses **SPIN**
3. Client calls `POST /api/v1/spin` with `session_id`, `bet`, optional `Idempotency-Key`
4. Backend returns authoritative outcome (`reel_matrix`, `win`, `bonus_triggered`)
5. Frontend animates reels and displays win/bonus states
