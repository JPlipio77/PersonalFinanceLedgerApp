#!/usr/bin/env bash
# slim.sh — build production images and shrink them with SlimToolkit
#
# Usage:
#   ./slim.sh                 # build prod images then slim them
#   ./slim.sh --skip-build    # skip docker build, slim existing :prod images
#
# ── Installing slim ──────────────────────────────────────────────────────────
#   Linux (CI / WSL2):
#     curl -L https://github.com/slimtoolkit/slim/releases/download/1.40.11/dist_linux.tar.gz | tar xz
#     sudo mv dist_linux/slim dist_linux/slim-sensor /usr/local/bin/
#
#   macOS (Homebrew):
#     brew install slimtoolkit/slim/slim
#
#   Windows (Docker Desktop — no native binary):
#     1. Open Docker Desktop → Settings → General
#        tick "Expose daemon on tcp://localhost:2375 without TLS" → Apply
#     2. This script will automatically use dslim/slim via Docker

set -euo pipefail

SKIP_BUILD=false
for arg in "$@"; do [[ "$arg" == "--skip-build" ]] && SKIP_BUILD=true; done

BACKEND_IMG="finance-backend"
FRONTEND_IMG="finance-frontend"
RED='\033[0;31m'; GREEN='\033[0;32m'; YELLOW='\033[1;33m'; CYAN='\033[0;36m'; NC='\033[0m'

# ── Detect how to invoke slim ─────────────────────────────────────────────────
if command -v slim &>/dev/null; then
  # Native binary (Linux/macOS)
  SLIM_CMD="slim"
elif [[ "$OSTYPE" == "msys" || "$OSTYPE" == "win32" || -n "${WINDIR:-}" ]]; then
  # Windows: use dslim/slim container via Docker TCP
  echo -e "${YELLOW}Windows detected — using slim via Docker container.${NC}"
  echo -e "${YELLOW}Requires Docker Desktop TCP daemon on localhost:2375.${NC}"
  echo ""
  if ! curl -s --connect-timeout 2 http://localhost:2375/version &>/dev/null; then
    echo -e "${RED}Error: Docker TCP API not reachable at localhost:2375.${NC}"
    echo ""
    echo "Enable it in Docker Desktop:"
    echo "  Settings → General → tick 'Expose daemon on tcp://localhost:2375 without TLS' → Apply & Restart"
    exit 1
  fi
  SLIM_CMD="docker run --rm -e DOCKER_HOST=tcp://host.docker.internal:2375 dslim/slim"
else
  echo -e "${RED}Error: slim is not installed.${NC}"
  echo "  Linux:  curl -L https://github.com/slimtoolkit/slim/releases/download/1.40.11/dist_linux.tar.gz | tar xz && sudo mv dist_linux/slim dist_linux/slim-sensor /usr/local/bin/"
  echo "  macOS:  brew install slimtoolkit/slim/slim"
  exit 1
fi

# ── Build production images ───────────────────────────────────────────────────
if [[ "$SKIP_BUILD" == "false" ]]; then
  echo -e "${CYAN}=== Building production images ===${NC}"
  docker build --target prod -t "${BACKEND_IMG}:prod"  ./backend
  docker build --target prod -t "${FRONTEND_IMG}:prod" ./frontend
fi

# ── Show baseline sizes ───────────────────────────────────────────────────────
echo ""
echo -e "${YELLOW}=== Before slimming ===${NC}"
docker images "${BACKEND_IMG}:prod"  --format "  Backend:  {{.Size}}"
docker images "${FRONTEND_IMG}:prod" --format "  Frontend: {{.Size}}"

# ── Slim backend ──────────────────────────────────────────────────────────────
# HTTP probe is skipped — the backend requires MongoDB at startup.
# slim removes unused OS packages/binaries; all /app contents are preserved.
echo ""
echo -e "${CYAN}=== Slimming backend ===${NC}"
$SLIM_CMD build \
  --include-path /app \
  --include-bin  /usr/local/bin/node \
  --http-probe=false \
  --continue-after exec \
  --exec "node -e 'process.exit(0)'" \
  --exec-wait 5 \
  --tag "${BACKEND_IMG}:slim" \
  "${BACKEND_IMG}:prod"

# ── Slim frontend ─────────────────────────────────────────────────────────────
# nginx + static files — HTTP probe works perfectly, no external deps needed.
echo ""
echo -e "${CYAN}=== Slimming frontend ===${NC}"
$SLIM_CMD build \
  --http-probe \
  --http-probe-cmd "GET /" \
  --expose 80 \
  --tag "${FRONTEND_IMG}:slim" \
  "${FRONTEND_IMG}:prod"

# ── Print comparison ──────────────────────────────────────────────────────────
echo ""
echo -e "${GREEN}=== Size Comparison ===${NC}"
printf "%-35s %s\n" "IMAGE" "SIZE"
printf "%-35s %s\n" "─────────────────────────────────" "────"
docker images --format "{{.Repository}}:{{.Tag}}\t{{.Size}}" \
  | grep -E "^(${BACKEND_IMG}|${FRONTEND_IMG}):" \
  | sort \
  | while IFS=$'\t' read -r img size; do
      printf "%-35s %s\n" "$img" "$size"
    done

echo ""
echo -e "${GREEN}Done.${NC}"
echo "  Slim images: ${BACKEND_IMG}:slim  ${FRONTEND_IMG}:slim"
echo "  Use them in docker-compose.prod.yml or push to your registry."
