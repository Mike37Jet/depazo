#!/usr/bin/env bash
set -euo pipefail

export PATH="/opt/homebrew/bin:/usr/local/bin:/usr/bin:/bin"
repository_root="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
config_directory="${DEPAZO_CONFIG_DIRECTORY:-$HOME/.config/depazo}"
lock_file="$config_directory/scheduled-ingest.lock"
max_lock_wait_seconds=900
max_database_wait_seconds=60
source_stopped_exit_code=3
minutes_paused_after_a_block=1440

if [[ "${DEPAZO_INGEST_LOCK_HELD:-}" != "1" ]]; then
  DEPAZO_INGEST_LOCK_HELD=1 exec /usr/bin/lockf -t "$max_lock_wait_seconds" "$lock_file" \
    /bin/bash "${BASH_SOURCE[0]}"
fi

log() {
  echo "$(date '+%Y-%m-%dT%H:%M:%S%z') $*"
}

update_code() {
  if git -C "$repository_root" pull --ff-only --quiet; then
    log "code at $(git -C "$repository_root" rev-parse --short HEAD)"
  else
    log "could not update the code; running $(git -C "$repository_root" rev-parse --short HEAD)"
  fi
}

load_configuration() {
  set -a
  source "$config_directory/env"
  set +a
}

ensure_docker_is_running() {
  if docker info >/dev/null 2>&1; then
    return
  fi
  if [[ -n "${DEPAZO_COLIMA_PROFILE:-}" ]]; then
    log "starting colima profile $DEPAZO_COLIMA_PROFILE"
    colima start "$DEPAZO_COLIMA_PROFILE" >/dev/null
  fi
}

ensure_database_is_ready() {
  local container="${DEPAZO_DATABASE_CONTAINER:-}"
  if [[ -z "$container" ]]; then
    return
  fi
  docker start "$container" >/dev/null
  for _ in $(seq "$max_database_wait_seconds"); do
    if docker exec "$container" pg_isready -q; then
      return
    fi
    sleep 1
  done
  log "database container $container is not ready"
  exit 1
}

ingest_source() {
  local source_name="$1"
  shift
  local block_marker="$config_directory/blocked-$source_name"
  if [[ -n "$(find "$block_marker" -mmin "-$minutes_paused_after_a_block" 2>/dev/null)" ]]; then
    log "skipping $source_name: it blocked or changed less than a day ago"
    return
  fi
  log "ingesting $source_name"
  local status=0
  uv run --quiet depazo ingest --source "$source_name" --pages "${DEPAZO_SCHEDULED_PAGES:-20}" \
    --save "$@" >/dev/null || status=$?
  if [[ "$status" -eq "$source_stopped_exit_code" ]]; then
    touch "$block_marker"
    log "$source_name blocked or changed; paused for a day (delete $block_marker to resume)"
  elif [[ "$status" -ne 0 ]]; then
    exit "$status"
  fi
}

run_ingest() {
  cd "$repository_root/backend"
  uv run --quiet alembic upgrade head
  local alert_options=()
  if [[ -n "${RESEND_API_KEY:-}" && -n "${DEPAZO_ALERT_EMAIL:-}" ]]; then
    alert_options=(--alert-profile "$config_directory/profile.json")
  else
    log "email alerts disabled: RESEND_API_KEY or DEPAZO_ALERT_EMAIL is empty"
  fi
  if [[ -n "${DEPAZO_VAPID_PRIVATE_KEY:-}" ]]; then
    alert_options+=(--notify-users)
  else
    log "push notifications disabled: DEPAZO_VAPID_PRIVATE_KEY is empty"
  fi
  local source_name
  for source_name in ${DEPAZO_SCHEDULED_SOURCES:-icasas arriendos_ec marketplace}; do
    ingest_source "$source_name" ${alert_options[@]+"${alert_options[@]}"}
  done
}

log "scheduled ingest started"
update_code
load_configuration
ensure_docker_is_running
ensure_database_is_ready
run_ingest
log "scheduled ingest finished"
