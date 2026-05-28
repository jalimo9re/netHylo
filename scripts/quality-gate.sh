#!/usr/bin/env bash
set -euo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
OFFLINE_FRIENDLY="${OFFLINE_FRIENDLY:-true}"

install_or_skip() {
  local target_dir="$1"
  local label="$2"
  if [[ "$OFFLINE_FRIENDLY" == "true" && -d "$target_dir/node_modules" ]]; then
    echo "==> $label: skip install (offline-friendly, node_modules ya existe)"
    return 0
  fi
  echo "==> $label: install dependencies"
  npm --prefix "$target_dir" ci
}

has_eslint_config() {
  local target_dir="$1"
  [[ -f "$target_dir/.eslintrc" || -f "$target_dir/.eslintrc.json" || -f "$target_dir/.eslintrc.js" || -f "$target_dir/eslint.config.js" ]]
}

run_backend_checks() {
  install_or_skip "$ROOT_DIR/backend" "Backend"

  if has_eslint_config "$ROOT_DIR/backend"; then
    echo "==> Backend: lint"
    npm --prefix "$ROOT_DIR/backend" run lint:check
  else
    echo "==> Backend: lint skipped (no ESLint config)"
  fi

  echo "==> Backend: typecheck"
  npm --prefix "$ROOT_DIR/backend" run typecheck

  echo "==> Backend: test"
  npm --prefix "$ROOT_DIR/backend" run test -- --runInBand
}

run_frontend_checks() {
  install_or_skip "$ROOT_DIR/frontend" "Frontend"

  if npm --prefix "$ROOT_DIR/frontend" run | rg "typecheck" >/dev/null 2>&1; then
    echo "==> Frontend: typecheck"
    npm --prefix "$ROOT_DIR/frontend" run typecheck
  else
    echo "==> Frontend: typecheck skipped (script no definido)"
  fi

  echo "==> Frontend: build"
  npm --prefix "$ROOT_DIR/frontend" run build -- --configuration development --output-path dist-ci
}

main() {
  echo "Running quality gate from: $ROOT_DIR"
  run_backend_checks
  run_frontend_checks
  echo "Quality gate passed."
}

main "$@"
