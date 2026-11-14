#!/usr/bin/env bash
set -euo pipefail

export PATH="/usr/bin:/bin"
host_name="com.depazo.capture"
repository_root="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
extension_manifest="${DEPAZO_EXTENSION_MANIFEST:-$repository_root/extension/public/manifest.json}"
default_hosts_directory="$HOME/Library/Application Support/Google/Chrome/NativeMessagingHosts"
hosts_directory="${DEPAZO_NATIVE_HOSTS_DIRECTORY:-$default_hosts_directory}"
host_program="$repository_root/scripts/capture_host.sh"
host_manifest="$hosts_directory/$host_name.json"

fail() {
  echo "$*" >&2
  exit 1
}

read_extension_key() {
  local key
  key="$(plutil -extract key raw -o - "$extension_manifest" 2>/dev/null)" \
    || fail "no \"key\" found in $extension_manifest"
  [[ "$key" =~ ^[A-Za-z0-9+/]+=*$ ]] || fail "the \"key\" in $extension_manifest is not base64"
  echo "$key"
}

extension_id_for() {
  local id
  id="$(printf '%s' "$1" | base64 -D | shasum -a 256 | cut -c 1-32 | tr '0-9a-f' 'a-p')"
  [[ "$id" =~ ^[a-p]{32}$ ]] || fail "could not compute the extension id"
  echo "$id"
}

as_json_string() {
  local text="$1"
  text="${text//\\/\\\\}"
  text="${text//\"/\\\"}"
  printf '"%s"' "$text"
}

write_host_manifest() {
  local extension_id="$1"
  mkdir -p "$hosts_directory"
  cat >"$host_manifest" <<MANIFEST
{
  "name": "$host_name",
  "description": "Saves the listings captured by the depazo extension",
  "path": $(as_json_string "$host_program"),
  "type": "stdio",
  "allowed_origins": ["chrome-extension://$extension_id/"]
}
MANIFEST
  chmod 644 "$host_manifest"
}

[[ -x "$host_program" ]] || fail "$host_program is missing or not executable"
extension_key="$(read_extension_key)"
extension_id="$(extension_id_for "$extension_key")"
write_host_manifest "$extension_id"
echo "installed $host_manifest"
echo "  host program: $host_program"
echo "  allowed extension: $extension_id"
