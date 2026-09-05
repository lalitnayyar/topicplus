#!/usr/bin/env bash
# TopicPulse — interactive Docker management script.
# Usage:
#   ./manage.sh                 interactive menu
#   ./manage.sh <command>       run one command directly (see COMMANDS below)
#
# COMMANDS: start stop restart redeploy deploy pull logs status shell backup restore build clean help

set -euo pipefail
cd "$(dirname "${BASH_SOURCE[0]}")"

ENV_FILE=".env"
ENV_EXAMPLE=".env.example"
VOLUME_NAME="topicpulse_data"
BACKUP_DIR="backups"
DEFAULT_PORT=3000

# ---------- output helpers ----------
c_reset="\033[0m"; c_bold="\033[1m"; c_blue="\033[34m"; c_green="\033[32m"; c_yellow="\033[33m"; c_red="\033[31m"
info()  { printf "%b[topicpulse]%b %s\n" "$c_blue" "$c_reset" "$1"; }
ok()    { printf "%b[topicpulse]%b %s\n" "$c_green" "$c_reset" "$1"; }
warn()  { printf "%b[topicpulse]%b %s\n" "$c_yellow" "$c_reset" "$1"; }
err()   { printf "%b[topicpulse]%b %s\n" "$c_red" "$c_reset" "$1" >&2; }

confirm() {
  # confirm "message" — returns 0 if the operator typed yes
  local prompt="$1"
  read -r -p "$(printf '%b%s%b [y/N]: ' "$c_yellow" "$prompt" "$c_reset")" reply
  [[ "$reply" =~ ^[Yy]$ ]]
}

# ---------- prerequisites ----------
require_docker() {
  if ! command -v docker >/dev/null 2>&1; then
    err "Docker is not installed or not on PATH. Install Docker first: https://docs.docker.com/get-docker/"
    exit 1
  fi
  if ! docker info >/dev/null 2>&1; then
    err "Docker is installed but the daemon isn't reachable. Is Docker running?"
    exit 1
  fi
  if docker compose version >/dev/null 2>&1; then
    COMPOSE=(docker compose)
  elif command -v docker-compose >/dev/null 2>&1; then
    COMPOSE=(docker-compose)
  else
    err "Neither 'docker compose' nor 'docker-compose' is available. Install the Docker Compose plugin."
    exit 1
  fi
}

ensure_env_file() {
  if [[ -f "$ENV_FILE" ]]; then
    return
  fi
  warn "No .env file found."
  if [[ ! -f "$ENV_EXAMPLE" ]]; then
    err "$ENV_EXAMPLE is also missing — cannot bootstrap configuration."
    exit 1
  fi
  if confirm "Generate $ENV_FILE from $ENV_EXAMPLE with freshly generated secrets?"; then
    cp "$ENV_EXAMPLE" "$ENV_FILE"
    local jwt enc
    jwt="$(openssl rand -base64 48 2>/dev/null || head -c48 /dev/urandom | base64)"
    enc="$(openssl rand -base64 32 2>/dev/null || head -c32 /dev/urandom | base64)"
    # Portable in-place edit (works on both GNU and BSD sed).
    sed -i.bak "s#^JWT_SECRET=.*#JWT_SECRET=\"${jwt}\"#" "$ENV_FILE" && rm -f "$ENV_FILE.bak"
    sed -i.bak "s#^ENCRYPTION_KEY=.*#ENCRYPTION_KEY=\"${enc}\"#" "$ENV_FILE" && rm -f "$ENV_FILE.bak"
    ok "Created $ENV_FILE with generated JWT_SECRET and ENCRYPTION_KEY."
  else
    err "Refusing to start without $ENV_FILE. Copy $ENV_EXAMPLE to $ENV_FILE and fill in values, then retry."
    exit 1
  fi
}

# ---------- dynamic port handling ----------
port_in_use() {
  local port="$1"
  if command -v lsof >/dev/null 2>&1; then
    lsof -iTCP:"$port" -sTCP:LISTEN >/dev/null 2>&1 && return 0
  fi
  # Portable fallback using bash's /dev/tcp.
  (exec 3<>"/dev/tcp/127.0.0.1/$port") 2>/dev/null && { exec 3>&-; return 0; }
  return 1
}

resolve_host_port() {
  local configured
  configured="$(grep -E '^PORT=' "$ENV_FILE" 2>/dev/null | tail -1 | cut -d= -f2- | tr -d '"' || true)"
  configured="${configured:-$DEFAULT_PORT}"
  local port="$configured"
  local tries=0
  while port_in_use "$port" && [[ $tries -lt 50 ]]; do
    port=$((port + 1))
    tries=$((tries + 1))
  done
  if [[ "$port" != "$configured" ]]; then
    warn "Configured port $configured is already in use — falling back to $port."
  fi
  echo "$port"
}

# ---------- commands ----------
cmd_build() {
  require_docker
  info "Building images..."
  "${COMPOSE[@]}" build
  ok "Build complete."
}

cmd_deploy() {
  # First-time provisioning: build, start, migrations run automatically via the
  # container entrypoint (prisma migrate deploy) before the server starts.
  require_docker
  ensure_env_file
  export HOST_PORT
  HOST_PORT="$(resolve_host_port)"
  info "Deploying (build + start) on host port $HOST_PORT..."
  "${COMPOSE[@]}" up -d --build
  ok "Deployed. TopicPulse is starting at http://localhost:${HOST_PORT}"
  info "Tip: run './manage.sh logs' to watch startup, or './manage.sh status' once it's healthy."
}

cmd_start() {
  require_docker
  ensure_env_file
  export HOST_PORT
  HOST_PORT="$(resolve_host_port)"
  info "Starting (building images only if missing) on host port $HOST_PORT..."
  "${COMPOSE[@]}" up -d
  ok "TopicPulse is running at http://localhost:${HOST_PORT}"
}

cmd_stop() {
  require_docker
  info "Stopping the stack (data volume is preserved)..."
  "${COMPOSE[@]}" stop
  ok "Stopped."
}

cmd_restart() {
  require_docker
  ensure_env_file
  export HOST_PORT
  HOST_PORT="$(resolve_host_port)"
  info "Restarting on host port $HOST_PORT..."
  "${COMPOSE[@]}" down
  "${COMPOSE[@]}" up -d
  ok "TopicPulse is running at http://localhost:${HOST_PORT}"
}

cmd_redeploy() {
  require_docker
  ensure_env_file
  info "Redeploying: pulling latest source, rebuilding, migrating, restarting..."
  cmd_pull
  export HOST_PORT
  HOST_PORT="$(resolve_host_port)"
  "${COMPOSE[@]}" build
  "${COMPOSE[@]}" up -d --force-recreate
  ok "Redeployed. TopicPulse is running at http://localhost:${HOST_PORT}"
}

cmd_pull() {
  if [[ -d .git ]]; then
    info "Pulling latest source (git pull)..."
    git pull --ff-only || warn "git pull failed or was not fast-forward — resolve manually before redeploying."
  else
    warn "Not a git checkout — skipping source pull. Pulling base images instead."
  fi
  if command -v docker >/dev/null 2>&1; then
    "${COMPOSE[@]}" pull --ignore-buildable 2>/dev/null || true
  fi
}

cmd_logs() {
  require_docker
  info "Tailing logs (Ctrl+C to stop)..."
  "${COMPOSE[@]}" logs -f --tail=200
}

cmd_status() {
  require_docker
  "${COMPOSE[@]}" ps
  echo
  local configured
  configured="$(grep -E '^HOST_PORT=' "$ENV_FILE" 2>/dev/null | tail -1 | cut -d= -f2- || true)"
  info "Configured default port: $(grep -E '^PORT=' "$ENV_FILE" 2>/dev/null | cut -d= -f2- || echo "$DEFAULT_PORT (default)")"
  docker volume inspect "$VOLUME_NAME" >/dev/null 2>&1 && ok "Database volume '$VOLUME_NAME' exists." || warn "Database volume '$VOLUME_NAME' not found yet."
}

cmd_shell() {
  require_docker
  info "Opening a shell in the app container..."
  "${COMPOSE[@]}" exec app sh
}

cmd_backup() {
  require_docker
  mkdir -p "$BACKUP_DIR"
  local file="$BACKUP_DIR/topicpulse-backup-$(date +%Y%m%d%H%M%S).tar.gz"
  if ! docker volume inspect "$VOLUME_NAME" >/dev/null 2>&1; then
    err "Volume '$VOLUME_NAME' does not exist yet — nothing to back up."
    exit 1
  fi
  info "Backing up database volume to $file..."
  docker run --rm -v "${VOLUME_NAME}:/data" -v "$(pwd)/$BACKUP_DIR:/backup" alpine \
    sh -c "tar czf /backup/$(basename "$file") -C /data ."
  ok "Backup written to $file"
}

cmd_restore() {
  require_docker
  local file="${1:-}"
  if [[ -z "$file" ]]; then
    info "Available backups in $BACKUP_DIR:"
    ls -1 "$BACKUP_DIR" 2>/dev/null || true
    read -r -p "Backup file to restore (path): " file
  fi
  if [[ ! -f "$file" ]]; then
    err "Backup file not found: $file"
    exit 1
  fi
  warn "This OVERWRITES the current database volume ('$VOLUME_NAME') with the contents of $file."
  confirm "Type y to continue" || { info "Restore canceled."; exit 0; }
  "${COMPOSE[@]}" stop app || true
  docker run --rm -v "${VOLUME_NAME}:/data" -v "$(cd "$(dirname "$file")" && pwd):/backup" alpine \
    sh -c "rm -rf /data/* && tar xzf /backup/$(basename "$file") -C /data"
  ok "Restore complete. Run './manage.sh start' to bring the app back up."
}

cmd_clean() {
  require_docker
  warn "This removes stopped containers and dangling images for this project. The database volume ('$VOLUME_NAME') is NOT touched."
  confirm "Type y to continue" || { info "Clean canceled."; exit 0; }
  "${COMPOSE[@]}" down --remove-orphans
  docker image prune -f --filter "label=com.docker.compose.project=$(basename "$(pwd)")" >/dev/null 2>&1 || true
  ok "Cleaned. Data volume preserved — run './manage.sh backup' any time to snapshot it."
}

cmd_help() {
  cat <<EOF
TopicPulse management script

  ./manage.sh <command>

  deploy    First-time provisioning: build images, start the stack, run migrations.
  start     Start the stack (builds images only if missing).
  stop      Stop the stack without removing data.
  restart   Stop then start.
  redeploy  Pull latest source, rebuild, migrate, and restart with --force-recreate.
  pull      Pull latest source (git) and base images.
  logs      Tail application logs.
  status    Show container status and the data volume.
  shell     Open an interactive shell inside the running app container.
  backup    Snapshot the database volume to ./backups/.
  restore   Restore the database volume from a backup file.
  build     Rebuild images without starting the stack.
  clean     Remove stopped containers/dangling images. Never touches the data volume.
  help      Show this message.

Run with no arguments for an interactive menu. The host port is dynamic — set PORT in
.env for a preferred default; a free port is auto-detected if it's taken, and the
actual URL is printed after every start/restart/redeploy.
EOF
}

# ---------- interactive menu ----------
interactive_menu() {
  echo
  printf "%b%s%b\n" "$c_bold" "TopicPulse — Docker management" "$c_reset"
  echo "  1) deploy    (first-time build + start)"
  echo "  2) start"
  echo "  3) stop"
  echo "  4) restart"
  echo "  5) redeploy  (pull + rebuild + migrate + restart)"
  echo "  6) pull"
  echo "  7) logs"
  echo "  8) status"
  echo "  9) shell"
  echo " 10) backup"
  echo " 11) restore"
  echo " 12) build"
  echo " 13) clean"
  echo "  0) exit"
  echo
  read -r -p "Choose an option: " choice
  case "$choice" in
    1) cmd_deploy ;;
    2) cmd_start ;;
    3) cmd_stop ;;
    4) cmd_restart ;;
    5) cmd_redeploy ;;
    6) cmd_pull ;;
    7) cmd_logs ;;
    8) cmd_status ;;
    9) cmd_shell ;;
    10) cmd_backup ;;
    11) cmd_restore ;;
    12) cmd_build ;;
    13) cmd_clean ;;
    0) exit 0 ;;
    *) warn "Unknown option." ;;
  esac
}

# ---------- entrypoint ----------
main() {
  local cmd="${1:-}"
  if [[ -z "$cmd" ]]; then
    while true; do interactive_menu; done
  fi
  shift || true
  case "$cmd" in
    deploy) cmd_deploy ;;
    start) cmd_start ;;
    stop) cmd_stop ;;
    restart) cmd_restart ;;
    redeploy) cmd_redeploy ;;
    pull) cmd_pull ;;
    logs) cmd_logs ;;
    status) cmd_status ;;
    shell) cmd_shell ;;
    backup) cmd_backup ;;
    restore) cmd_restore "$@" ;;
    build) cmd_build ;;
    clean) cmd_clean ;;
    help|-h|--help) cmd_help ;;
    *) err "Unknown command: $cmd"; cmd_help; exit 1 ;;
  esac
}

main "$@"
