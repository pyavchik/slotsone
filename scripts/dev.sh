#!/usr/bin/env bash
# dev.sh — start the full local development stack
#   1. Ensure PostgreSQL is running (starts a Docker container if needed)
#   2. Start the backend (tsx watch)
#   3. Start the frontend (Vite)
#   Ctrl+C shuts everything down cleanly.
set -euo pipefail

# ── colours ────────────────────────────────────────────────────────────────────
RED='\033[0;31m'; GREEN='\033[0;32m'; YELLOW='\033[1;33m'; CYAN='\033[0;36m'; NC='\033[0m'
info()  { echo -e "${GREEN}[dev]${NC} $*"; }
warn()  { echo -e "${YELLOW}[dev]${NC} $*"; }
error() { echo -e "${RED}[dev]${NC} $*" >&2; }

# ── paths ──────────────────────────────────────────────────────────────────────
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
ROOT="$(dirname "$SCRIPT_DIR")"
BACKEND="$ROOT/backend"
FRONTEND="$ROOT/frontend"
ENV_FILE="$BACKEND/.env.development"

# ── load backend env file ──────────────────────────────────────────────────────
if [[ -f "$ENV_FILE" ]]; then
  info "Loading $ENV_FILE"
  set -a
  # shellcheck disable=SC1090
  source "$ENV_FILE"
  set +a
else
  warn "$ENV_FILE not found — copy backend/.env.development.example and fill in values"
fi

export DATABASE_URL="${DATABASE_URL:-postgres://slotsone:slotsone@localhost:5432/slotsone}"

# ── parse host/port from DATABASE_URL ─────────────────────────────────────────
PG_HOST=$(echo "$DATABASE_URL" | sed -E 's|.*@([^:/]+).*|\1|')
PG_PORT=$(echo "$DATABASE_URL" | sed -E 's|.*:([0-9]+)/.*|\1|')
PG_PORT="${PG_PORT:-5432}"

# ── 1. ensure postgres is reachable ───────────────────────────────────────────
PG_CONTAINER="slotsone-pg-dev"

postgres_ready() {
  # try pg_isready first, fall back to TCP check
  if command -v pg_isready &>/dev/null; then
    pg_isready -h "$PG_HOST" -p "$PG_PORT" -q
  else
    # bash built-in TCP probe (works without netcat)
    (echo > /dev/tcp/"$PG_HOST"/"$PG_PORT") &>/dev/null
  fi
}

if postgres_ready; then
  info "PostgreSQL already reachable at $PG_HOST:$PG_PORT"
else
  if ! command -v docker &>/dev/null; then
    error "PostgreSQL is not reachable and Docker is not installed."
    error "Start postgres manually and set DATABASE_URL in $ENV_FILE."
    exit 1
  fi

  # reuse existing container if it exists but is stopped
  if docker ps -a --format '{{.Names}}' | grep -q "^${PG_CONTAINER}$"; then
    info "Starting existing container $PG_CONTAINER"
    docker start "$PG_CONTAINER" >/dev/null
  else
    info "Starting new postgres container: $PG_CONTAINER"
    docker run -d --name "$PG_CONTAINER" \
      -e POSTGRES_DB=slotsone \
      -e POSTGRES_USER=slotsone \
      -e POSTGRES_PASSWORD=slotsone \
      -p "${PG_PORT}:5432" \
      postgres:16-alpine >/dev/null
  fi

  # wait up to 15 s for postgres to accept connections
  info "Waiting for PostgreSQL to be ready..."
  for i in $(seq 1 15); do
    if postgres_ready; then
      info "PostgreSQL ready (${i}s)"
      break
    fi
    if [[ $i -eq 15 ]]; then
      error "PostgreSQL did not become ready in time."
      exit 1
    fi
    sleep 1
  done
fi

# ── 2. install dependencies if needed ─────────────────────────────────────────
if [[ ! -d "$BACKEND/node_modules" ]]; then
  info "Installing backend dependencies..."
  npm --prefix "$BACKEND" install
fi

if [[ ! -d "$FRONTEND/node_modules" ]]; then
  info "Installing frontend dependencies..."
  npm --prefix "$FRONTEND" install
fi

# ── 3. start backend and frontend ─────────────────────────────────────────────
info "Starting backend  → http://localhost:3001"
info "Starting frontend → http://localhost:5173"
echo ""

# labelled output: prefix each line with a coloured tag
label_output() {
  local tag="$1" color="$2"
  while IFS= read -r line; do
    echo -e "${color}${tag}${NC}  $line"
  done
}

npm --prefix "$BACKEND" run dev 2>&1 | label_output "[backend]" "$CYAN" &
BACKEND_PID=$!

# start frontend
npm --prefix "$FRONTEND" run dev 2>&1 | label_output "[frontend]" "$YELLOW" &
FRONTEND_PID=$!

# ── 4. cleanup on exit ────────────────────────────────────────────────────────
cleanup() {
  echo ""
  warn "Shutting down..."
  kill "$BACKEND_PID"  2>/dev/null || true
  kill "$FRONTEND_PID" 2>/dev/null || true
  wait "$BACKEND_PID"  2>/dev/null || true
  wait "$FRONTEND_PID" 2>/dev/null || true
  info "Done."
}
trap cleanup EXIT INT TERM

wait "$BACKEND_PID" "$FRONTEND_PID"
