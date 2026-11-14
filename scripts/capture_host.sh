#!/usr/bin/env bash
set -euo pipefail

export PATH="/opt/homebrew/bin:/usr/local/bin:/usr/bin:/bin"
umask 077
repository_root="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
config_directory="${DEPAZO_CONFIG_DIRECTORY:-$HOME/.config/depazo}"
log_directory="${DEPAZO_LOG_DIRECTORY:-$HOME/Library/Logs/depazo}"
lock_file="$config_directory/scheduled-ingest.lock"
max_lock_wait_seconds=30

mkdir -p "$log_directory"
exec 2>>"$log_directory/capture-host.log"

echo "$(date '+%Y-%m-%dT%H:%M:%S%z') capture host started" >&2

if [[ -f "$config_directory/env" ]]; then
  set -a
  source "$config_directory/env" >&2
  set +a
fi

receive_options=()
if [[ -n "${DEPAZO_VAPID_PRIVATE_KEY:-}" ]]; then
  receive_options+=(--notify-users)
fi

cd "$repository_root/backend"
exec /usr/bin/lockf -t "$max_lock_wait_seconds" "$lock_file" \
  uv run --quiet --no-sync depazo receive-capture ${receive_options[@]+"${receive_options[@]}"}
