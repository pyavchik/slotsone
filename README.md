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

## Production Setup

1. Prepare backend config:

```bash
cd backend
cp .env.production.example .env.production
```

2. Build and run:

```bash
npm run build
NODE_ENV=production npm start
```

### Generate Secrets/Keys

Generate HS256 secret:

```bash
openssl rand -base64 48
```

Generate RS256 key pair:

```bash
openssl genpkey -algorithm RSA -pkeyopt rsa_keygen_bits:2048 -out jwt_private.pem
openssl rsa -pubout -in jwt_private.pem -out jwt_public.pem
```

## Build Commands

```bash
# Backend
cd backend
npm run build
npm start

# Frontend
cd frontend
npm run build
```

Frontend static output is in `frontend/dist`.

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
