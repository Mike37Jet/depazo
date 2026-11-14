#!/usr/bin/env bash
set -euo pipefail

repository_root="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"

configure_docker_for_testcontainers() {
  if [[ -z "${DOCKER_HOST:-}" ]] && command -v docker >/dev/null; then
    local docker_endpoint
    docker_endpoint="$(docker context inspect --format '{{.Endpoints.docker.Host}}' 2>/dev/null || true)"
    if [[ "$docker_endpoint" == unix://*colima* ]]; then
      export DOCKER_HOST="$docker_endpoint"
      export TESTCONTAINERS_DOCKER_SOCKET_OVERRIDE="${TESTCONTAINERS_DOCKER_SOCKET_OVERRIDE:-/var/run/docker.sock}"
    fi
  fi
  if [[ "$(uname -m)" == "arm64" ]]; then
    export DEPAZO_TEST_POSTGIS_IMAGE="${DEPAZO_TEST_POSTGIS_IMAGE:-imresamu/postgis:17-3.5}"
  fi
}

verify_backend() {
  cd "$repository_root/backend"
  uv sync --locked --quiet
  uv run ruff check
  uv run ruff format --check
  uv run mypy src tests
  uv run pytest -q -rs
}

verify_extension() {
  cd "$repository_root/extension"
  pnpm install --frozen-lockfile --silent
  pnpm exec biome ci .
  pnpm typecheck
  pnpm test
  pnpm build
}

configure_docker_for_testcontainers
verify_backend
verify_extension
echo "depazo: all checks passed"
