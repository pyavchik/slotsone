#!/usr/bin/env bash
# dev.sh — start the full local development stack
#   1. Ensure PostgreSQL (backend + admin) is running via Docker
#   2. Start the backend (tsx watch)
#   3. Start the frontend (Vite)
#   4. Start the admin panel (Next.js)
#   Ctrl+C shuts everything down cleanly.
set -euo pipefail

# ── colours ────────────────────────────────────────────────────────────────────
RED='\033[0;31m'; GREEN='\033[0;32m'; YELLOW='\033[1;33m'; CYAN='\033[0;36m'
MAGENTA='\033[0;35m'; NC='\033[0m'
info()  { echo -e "${GREEN}[dev]${NC} $*"; }
warn()  { echo -e "${YELLOW}[dev]${NC} $*"; }
error() { echo -e "${RED}[dev]${NC} $*" >&2; }

# ── paths ──────────────────────────────────────────────────────────────────────
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
ROOT="$(dirname "$SCRIPT_DIR")"
BACKEND="$ROOT/backend"
FRONTEND="$ROOT/frontend"
ADMIN="$ROOT/admin"
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

# ── helper: wait for a postgres port ──────────────────────────────────────────
wait_for_pg() {
  local host="$1" port="$2" label="$3" seconds="${4:-15}"
  info "Waiting for $label at $host:$port..."
  for i in $(seq 1 "$seconds"); do
    if pg_ready "$host" "$port"; then
      info "$label ready (${i}s)"
      return 0
    fi
    if [[ $i -eq $seconds ]]; then
      error "$label did not become ready in time."
      exit 1
    fi
    sleep 1
  done
}

pg_ready() {
  local host="$1" port="$2"
  if command -v pg_isready &>/dev/null; then
    pg_isready -h "$host" -p "$port" -q
  else
    (echo > /dev/tcp/"$host"/"$port") &>/dev/null
  fi
}

# ── 1a. ensure backend postgres is reachable ─────────────────────────────────
PG_CONTAINER="slotsone-pg-dev"

if pg_ready "$PG_HOST" "$PG_PORT"; then
  info "Backend PostgreSQL already reachable at $PG_HOST:$PG_PORT"
else
  if ! command -v docker &>/dev/null; then
    error "PostgreSQL is not reachable and Docker is not installed."
    error "Start postgres manually and set DATABASE_URL in $ENV_FILE."
    exit 1
  fi

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

  wait_for_pg "$PG_HOST" "$PG_PORT" "Backend PostgreSQL"
fi

# ── 1b. ensure admin postgres is reachable ───────────────────────────────────
ADMIN_PG_CONTAINER="slotsone-admin-pg-dev"
ADMIN_PG_PORT=5433
ADMIN_DB="slotsone_admin"
ADMIN_PG_USER="slotsone"
ADMIN_PG_PASS="slotsone"

export ADMIN_DATABASE_URL="${ADMIN_DATABASE_URL:-postgres://${ADMIN_PG_USER}:${ADMIN_PG_PASS}@localhost:${ADMIN_PG_PORT}/${ADMIN_DB}}"
export BACKEND_DATABASE_URL="${BACKEND_DATABASE_URL:-$DATABASE_URL}"

if [[ -d "$ADMIN" ]]; then
  if pg_ready "localhost" "$ADMIN_PG_PORT"; then
    info "Admin PostgreSQL already reachable at localhost:$ADMIN_PG_PORT"
  else
    if ! command -v docker &>/dev/null; then
      warn "Docker not available — skipping admin postgres. Admin panel may fail."
    else
      if docker ps -a --format '{{.Names}}' | grep -q "^${ADMIN_PG_CONTAINER}$"; then
        info "Starting existing container $ADMIN_PG_CONTAINER"
        docker start "$ADMIN_PG_CONTAINER" >/dev/null
      else
        info "Starting new admin postgres container: $ADMIN_PG_CONTAINER"
        docker run -d --name "$ADMIN_PG_CONTAINER" \
          -e POSTGRES_DB="$ADMIN_DB" \
          -e POSTGRES_USER="$ADMIN_PG_USER" \
          -e POSTGRES_PASSWORD="$ADMIN_PG_PASS" \
          -p "${ADMIN_PG_PORT}:5432" \
          postgres:16-alpine >/dev/null
      fi

      wait_for_pg "localhost" "$ADMIN_PG_PORT" "Admin PostgreSQL"
    fi
  fi
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

if [[ -d "$ADMIN" && ! -d "$ADMIN/node_modules" ]]; then
  info "Installing admin dependencies..."
  npm --prefix "$ADMIN" install
fi

# ── 3. run admin prisma migrations ────────────────────────────────────────────
if [[ -d "$ADMIN" ]]; then
  info "Running admin Prisma migrations..."
  (cd "$ADMIN" && npx prisma generate 2>/dev/null && npx prisma db push --skip-generate 2>/dev/null) || warn "Admin Prisma setup skipped (may need manual migration)"
fi

# ── 4. start backend, frontend, and admin ────────────────────────────────────
info "Starting backend  → http://localhost:3001"
info "Starting frontend → http://localhost:5173"
if [[ -d "$ADMIN" ]]; then
  info "Starting admin    → http://localhost:3002/admin"
fi
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

npm --prefix "$FRONTEND" run dev 2>&1 | label_output "[frontend]" "$YELLOW" &
FRONTEND_PID=$!

ADMIN_PID=""
if [[ -d "$ADMIN" ]]; then
  NEXTAUTH_URL="${NEXTAUTH_URL:-http://localhost:3002}" \
  NEXTAUTH_SECRET="${NEXTAUTH_SECRET:-dev-secret-change-me}" \
  DATABASE_URL="$ADMIN_DATABASE_URL" \
  BACKEND_DATABASE_URL="$BACKEND_DATABASE_URL" \
  npm --prefix "$ADMIN" run dev 2>&1 | label_output "[admin]" "$MAGENTA" &
  ADMIN_PID=$!
fi

# ── 5. cleanup on exit ────────────────────────────────────────────────────────
cleanup() {
  echo ""
  warn "Shutting down..."
  kill "$BACKEND_PID"  2>/dev/null || true
  kill "$FRONTEND_PID" 2>/dev/null || true
  [[ -n "$ADMIN_PID" ]] && kill "$ADMIN_PID" 2>/dev/null || true
  wait "$BACKEND_PID"  2>/dev/null || true
  wait "$FRONTEND_PID" 2>/dev/null || true
  [[ -n "$ADMIN_PID" ]] && wait "$ADMIN_PID" 2>/dev/null || true
  info "Done."
}
trap cleanup EXIT INT TERM

if [[ -n "$ADMIN_PID" ]]; then
  wait "$BACKEND_PID" "$FRONTEND_PID" "$ADMIN_PID"
else
  wait "$BACKEND_PID" "$FRONTEND_PID"
fi
