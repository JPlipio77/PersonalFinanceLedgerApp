#!/usr/bin/env bash
# =============================================================================
# configure-gitlab-ci.sh — Set all CI/CD variables for PersonalFinanceLedgerApp
#
# USAGE:
#   GITLAB_TOKEN=<api-token> GITLAB_PROJECT=<group/project> \
#     bash scripts/configure-gitlab-ci.sh [--dry-run]
#
# PREREQUISITES:
#   1. Copy scripts/gitlab-ci-vars.env.example → scripts/gitlab-ci-vars.env
#      and fill in every value.
#   2. Create a GitLab Personal Access Token with the `api` scope at:
#      https://gitlab.com/-/user_settings/personal_access_tokens
#   3. Set GITLAB_TOKEN and GITLAB_PROJECT before running.
#
# OPTIONS:
#   --dry-run   Print the curl commands without executing them.
#
# IDEMPOTENT: Each variable is created (POST) on first run; subsequent runs
#             update the value (PUT). Safe to run multiple times.
# =============================================================================

set -euo pipefail

# ── Config ────────────────────────────────────────────────────────────────────
VARS_FILE="$(dirname "$0")/gitlab-ci-vars.env"
GITLAB_API="${GITLAB_API_URL:-https://gitlab.com}/api/v4"
DRY_RUN=false

[[ "${1:-}" == "--dry-run" ]] && DRY_RUN=true

# ── Validate required env vars ────────────────────────────────────────────────
if [[ -z "${GITLAB_TOKEN:-}" ]]; then
  echo "ERROR: GITLAB_TOKEN is not set."
  echo "  Create a token at: https://gitlab.com/-/user_settings/personal_access_tokens"
  echo "  Required scope: api"
  echo "  Then run: GITLAB_TOKEN=<token> GITLAB_PROJECT=<group/project> bash $0"
  exit 1
fi

if [[ -z "${GITLAB_PROJECT:-}" ]]; then
  echo "ERROR: GITLAB_PROJECT is not set."
  echo "  Set it to your GitLab project path, e.g. 77gsi/personal-finance-ledger"
  echo "  Then run: GITLAB_TOKEN=<token> GITLAB_PROJECT=<group/project> bash $0"
  exit 1
fi

if [[ ! -f "$VARS_FILE" ]]; then
  echo "ERROR: $VARS_FILE not found."
  echo "  Copy the template and fill in your values:"
  echo "    cp scripts/gitlab-ci-vars.env.example scripts/gitlab-ci-vars.env"
  exit 1
fi

# ── Load variables file ───────────────────────────────────────────────────────
# shellcheck disable=SC1090
source "$VARS_FILE"

# ── URL-encode the project path ───────────────────────────────────────────────
ENCODED_PROJECT="$(python3 -c "import urllib.parse; print(urllib.parse.quote('${GITLAB_PROJECT}', safe=''))" 2>/dev/null \
  || node -e "console.log(encodeURIComponent('${GITLAB_PROJECT}'))" 2>/dev/null \
  || echo "${GITLAB_PROJECT//\//%2F}")"

VARS_URL="${GITLAB_API}/projects/${ENCODED_PROJECT}/variables"

# ── Helpers ───────────────────────────────────────────────────────────────────
GREEN='\033[0;32m'
RED='\033[0;31m'
YELLOW='\033[1;33m'
RESET='\033[0m'

ok()   { echo -e "${GREEN}[OK]${RESET}   $1"; }
fail() { echo -e "${RED}[FAIL]${RESET} $1"; }
info() { echo -e "${YELLOW}[INFO]${RESET} $1"; }

# set_var <key> <value> <variable_type> <masked> <protected> <environment_scope>
set_var() {
  local key="$1" value="$2" var_type="$3" masked="$4" protected="$5" env_scope="$6"

  if [[ -z "$value" ]]; then
    echo -e "${YELLOW}[SKIP]${RESET} $key — value is empty, skipping"
    return 0
  fi

  local base_args=(
    --silent --show-error
    --header "PRIVATE-TOKEN: ${GITLAB_TOKEN}"
    --form   "key=${key}"
    --form   "value=${value}"
    --form   "variable_type=${var_type}"
    --form   "masked=${masked}"
    --form   "protected=${protected}"
    --form   "environment_scope=${env_scope}"
  )

  if [[ "$DRY_RUN" == "true" ]]; then
    info "DRY-RUN: would set ${key} (type=${var_type}, masked=${masked}, scope=${env_scope})"
    return 0
  fi

  # Try PUT (update existing) first; fall back to POST (create new)
  local http_status
  http_status=$(curl "${base_args[@]}" \
    --output /dev/null \
    --write-out "%{http_code}" \
    --request PUT \
    "${VARS_URL}/${key}?filter%5Benvironment_scope%5D=${env_scope//\*/%2A}" 2>/dev/null || echo "000")

  if [[ "$http_status" == "200" ]]; then
    ok "$key (updated)"
    return 0
  fi

  # Variable doesn't exist yet — create it
  http_status=$(curl "${base_args[@]}" \
    --output /dev/null \
    --write-out "%{http_code}" \
    --request POST \
    "${VARS_URL}" 2>/dev/null || echo "000")

  if [[ "$http_status" == "201" ]]; then
    ok "$key (created)"
  else
    fail "$key — HTTP ${http_status}"
  fi
}

# set_file_var <key> <file_path> <environment_scope>
# Uploads the contents of a local file as a File-type variable.
# Required for STAGING_SSH_KEY — GitLab needs File type for multiline values.
set_file_var() {
  local key="$1" file_path="$2" env_scope="$3"

  # Expand ~ in path
  file_path="${file_path/#\~/$HOME}"

  if [[ ! -f "$file_path" ]]; then
    echo -e "${YELLOW}[SKIP]${RESET} $key — file not found: $file_path"
    return 0
  fi

  local value
  value="$(cat "$file_path")"

  if [[ "$DRY_RUN" == "true" ]]; then
    info "DRY-RUN: would set ${key} (type=file, masked=false, scope=${env_scope}) from ${file_path}"
    return 0
  fi

  local http_status
  http_status=$(curl \
    --silent --show-error \
    --output /dev/null \
    --write-out "%{http_code}" \
    --request PUT \
    --header "PRIVATE-TOKEN: ${GITLAB_TOKEN}" \
    --form "key=${key}" \
    --form "value=${value}" \
    --form "variable_type=file" \
    --form "masked=false" \
    --form "protected=false" \
    --form "environment_scope=${env_scope}" \
    "${VARS_URL}/${key}?filter%5Benvironment_scope%5D=${env_scope//\*/%2A}" 2>/dev/null || echo "000")

  if [[ "$http_status" == "200" ]]; then
    ok "$key (updated, file type)"
    return 0
  fi

  http_status=$(curl \
    --silent --show-error \
    --output /dev/null \
    --write-out "%{http_code}" \
    --request POST \
    --header "PRIVATE-TOKEN: ${GITLAB_TOKEN}" \
    --form "key=${key}" \
    --form "value=${value}" \
    --form "variable_type=file" \
    --form "masked=false" \
    --form "protected=false" \
    --form "environment_scope=${env_scope}" \
    "${VARS_URL}" 2>/dev/null || echo "000")

  if [[ "$http_status" == "201" ]]; then
    ok "$key (created, file type)"
  else
    fail "$key — HTTP ${http_status}"
  fi
}

# ── Auto-generate JWT_SECRET if not set ──────────────────────────────────────
if [[ -z "${JWT_SECRET:-}" ]]; then
  info "JWT_SECRET is empty — auto-generating a 64-byte hex value..."
  if command -v node &>/dev/null; then
    JWT_SECRET="$(node -e "console.log(require('crypto').randomBytes(64).toString('hex'))")"
  elif command -v openssl &>/dev/null; then
    JWT_SECRET="$(openssl rand -hex 64)"
  else
    fail "Cannot generate JWT_SECRET — node and openssl are both unavailable. Set it manually in gitlab-ci-vars.env."
    exit 1
  fi
  info "Generated JWT_SECRET. Add it to gitlab-ci-vars.env for future reference."
  echo "JWT_SECRET=${JWT_SECRET}" >> "$VARS_FILE"
fi

# ── Validate required staging values ─────────────────────────────────────────
MISSING=()
[[ -z "${CR_PAT:-}"             ]] && MISSING+=("CR_PAT")
[[ -z "${STAGING_HOST:-}"       ]] && MISSING+=("STAGING_HOST")
[[ -z "${STAGING_USER:-}"       ]] && MISSING+=("STAGING_USER")
[[ -z "${STAGING_SSH_KEY_FILE:-}" ]] && MISSING+=("STAGING_SSH_KEY_FILE")
[[ -z "${GHCR_READ_TOKEN:-}"    ]] && MISSING+=("GHCR_READ_TOKEN")
[[ -z "${STAGING_URL:-}"        ]] && MISSING+=("STAGING_URL")

if [[ ${#MISSING[@]} -gt 0 ]] && [[ "$DRY_RUN" == "false" ]]; then
  echo ""
  echo -e "${RED}ERROR: The following required variables are empty in ${VARS_FILE}:${RESET}"
  for v in "${MISSING[@]}"; do echo "  - $v"; done
  echo ""
  echo "Fill them in and re-run. Use --dry-run to preview without applying."
  exit 1
fi

# ── Apply variables ───────────────────────────────────────────────────────────
echo ""
echo "Project : ${GITLAB_PROJECT}"
echo "API URL : ${VARS_URL}"
[[ "$DRY_RUN" == "true" ]] && echo -e "${YELLOW}DRY-RUN mode — no changes will be made${RESET}"
echo ""
echo "── Global variables (all environments) ──────────────────────────────────"

# CR_PAT — GitHub PAT for GHCR push/pull from GitLab runners
set_var "CR_PAT"          "${CR_PAT}"          "env_var" "true"  "false" "*"

# JWT_SECRET — backend container runtime secret for integration tests
set_var "JWT_SECRET"      "${JWT_SECRET}"       "env_var" "true"  "false" "*"

# CODECOV_TOKEN — optional coverage upload
if [[ -n "${CODECOV_TOKEN:-}" ]]; then
  set_var "CODECOV_TOKEN" "${CODECOV_TOKEN}"    "env_var" "true"  "false" "*"
else
  info "CODECOV_TOKEN — empty, skipping (optional)"
fi

echo ""
echo "── Staging environment variables (scope: staging) ───────────────────────"

set_var      "STAGING_HOST"       "${STAGING_HOST:-}"       "env_var" "true"  "false" "staging"
set_var      "STAGING_USER"       "${STAGING_USER:-}"       "env_var" "true"  "false" "staging"
set_file_var "STAGING_SSH_KEY"    "${STAGING_SSH_KEY_FILE:-~/.ssh/id_ed25519}"   "staging"
set_var      "GHCR_READ_TOKEN"    "${GHCR_READ_TOKEN:-}"    "env_var" "true"  "false" "staging"
set_var      "STAGING_URL"        "${STAGING_URL:-}"        "env_var" "false" "false" "staging"

echo ""
echo "Done. Verify at: https://gitlab.com/${GITLAB_PROJECT}/-/settings/ci_cd#js-cicd-variables-settings"
