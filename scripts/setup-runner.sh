#!/bin/bash
# setup-runner.sh - Install and configure a GitHub Actions self-hosted runner
# along with security scanning tools (trivy, gitleaks, syft).
#
# Usage:
#   setup-runner.sh --url <repo_url> --token <reg_token> --labels <labels> --name <runner_name>

set -euo pipefail

# ------------------------------------------------------------------
# Parse arguments
# ------------------------------------------------------------------
RUNNER_URL=""
RUNNER_TOKEN=""
RUNNER_LABELS="self-hosted,linux"
RUNNER_NAME=""
RUNNER_VERSION="${RUNNER_VERSION:-2.321.0}"
RUNNER_DIR="${RUNNER_DIR:-/opt/actions-runner}"
TRIVY_VERSION="${TRIVY_VERSION:-0.58.0}"
GITLEAKS_VERSION="${GITLEAKS_VERSION:-8.22.0}"
SYFT_VERSION="${SYFT_VERSION:-1.18.0}"

while [[ $# -gt 0 ]]; do
  case "$1" in
    --url)
      RUNNER_URL="$2"
      shift 2
      ;;
    --token)
      RUNNER_TOKEN="$2"
      shift 2
      ;;
    --labels)
      RUNNER_LABELS="$2"
      shift 2
      ;;
    --name)
      RUNNER_NAME="$2"
      shift 2
      ;;
    *)
      echo "[FAIL] Unknown argument: $1"
      echo "Usage: setup-runner.sh --url <repo_url> --token <reg_token> --labels <labels> --name <runner_name>"
      exit 1
      ;;
  esac
done

if [[ -z "$RUNNER_URL" || -z "$RUNNER_TOKEN" ]]; then
  echo "[FAIL] --url and --token are required"
  exit 1
fi

if [[ -z "$RUNNER_NAME" ]]; then
  RUNNER_NAME="runner-$(hostname)-$$"
  echo "[INFO] No --name provided, using generated name: ${RUNNER_NAME}"
fi

# ------------------------------------------------------------------
# Detect architecture
# ------------------------------------------------------------------
ARCH=$(uname -m)
case "$ARCH" in
  x86_64)  RUNNER_ARCH="x64"; TRIVY_ARCH="Linux-64bit"; GITLEAKS_ARCH="linux_x64"; SYFT_ARCH="linux_amd64" ;;
  aarch64) RUNNER_ARCH="arm64"; TRIVY_ARCH="Linux-ARM64"; GITLEAKS_ARCH="linux_arm64"; SYFT_ARCH="linux_arm64" ;;
  arm64)   RUNNER_ARCH="arm64"; TRIVY_ARCH="Linux-ARM64"; GITLEAKS_ARCH="linux_arm64"; SYFT_ARCH="linux_arm64" ;;
  *)
    echo "[FAIL] Unsupported architecture: ${ARCH}"
    exit 1
    ;;
esac

echo "[INFO] Architecture: ${ARCH} -> runner=${RUNNER_ARCH}"

# ------------------------------------------------------------------
# Install GitHub Actions Runner
# ------------------------------------------------------------------
install_runner() {
  echo "[INFO] Installing GitHub Actions Runner v${RUNNER_VERSION}..."

  mkdir -p "$RUNNER_DIR"
  cd "$RUNNER_DIR"

  RUNNER_TAR="actions-runner-linux-${RUNNER_ARCH}-${RUNNER_VERSION}.tar.gz"
  RUNNER_DOWNLOAD_URL="https://github.com/actions/runner/releases/download/v${RUNNER_VERSION}/${RUNNER_TAR}"

  if [[ ! -f "$RUNNER_TAR" ]]; then
    echo "[INFO] Downloading runner from ${RUNNER_DOWNLOAD_URL}"
    curl -fsSL -o "$RUNNER_TAR" "$RUNNER_DOWNLOAD_URL"
  fi

  tar xzf "$RUNNER_TAR"

  echo "[INFO] Configuring runner..."
  ./config.sh \
    --url "$RUNNER_URL" \
    --token "$RUNNER_TOKEN" \
    --name "$RUNNER_NAME" \
    --labels "$RUNNER_LABELS" \
    --unattended \
    --replace

  echo "[PASS] GitHub Actions Runner installed and configured"
}

# ------------------------------------------------------------------
# Install Trivy (vulnerability scanner)
# ------------------------------------------------------------------
install_trivy() {
  echo "[INFO] Installing Trivy v${TRIVY_VERSION}..."

  TRIVY_TAR="trivy_${TRIVY_VERSION}_${TRIVY_ARCH}.tar.gz"
  TRIVY_URL="https://github.com/aquasecurity/trivy/releases/download/v${TRIVY_VERSION}/${TRIVY_TAR}"

  curl -fsSL -o "/tmp/${TRIVY_TAR}" "$TRIVY_URL"
  tar xzf "/tmp/${TRIVY_TAR}" -C /usr/local/bin trivy
  chmod +x /usr/local/bin/trivy
  rm -f "/tmp/${TRIVY_TAR}"

  echo "[PASS] Trivy v${TRIVY_VERSION} installed: $(trivy --version 2>/dev/null | head -1)"
}

# ------------------------------------------------------------------
# Install Gitleaks (secret scanner)
# ------------------------------------------------------------------
install_gitleaks() {
  echo "[INFO] Installing Gitleaks v${GITLEAKS_VERSION}..."

  GITLEAKS_TAR="gitleaks_${GITLEAKS_VERSION}_${GITLEAKS_ARCH}.tar.gz"
  GITLEAKS_URL="https://github.com/gitleaks/gitleaks/releases/download/v${GITLEAKS_VERSION}/${GITLEAKS_TAR}"

  curl -fsSL -o "/tmp/${GITLEAKS_TAR}" "$GITLEAKS_URL"
  tar xzf "/tmp/${GITLEAKS_TAR}" -C /usr/local/bin gitleaks
  chmod +x /usr/local/bin/gitleaks
  rm -f "/tmp/${GITLEAKS_TAR}"

  echo "[PASS] Gitleaks v${GITLEAKS_VERSION} installed: $(gitleaks version 2>/dev/null)"
}

# ------------------------------------------------------------------
# Install Syft (SBOM generator)
# ------------------------------------------------------------------
install_syft() {
  echo "[INFO] Installing Syft v${SYFT_VERSION}..."

  SYFT_TAR="syft_${SYFT_VERSION}_${SYFT_ARCH}.tar.gz"
  SYFT_URL="https://github.com/anchore/syft/releases/download/v${SYFT_VERSION}/${SYFT_TAR}"

  curl -fsSL -o "/tmp/${SYFT_TAR}" "$SYFT_URL"
  tar xzf "/tmp/${SYFT_TAR}" -C /usr/local/bin syft
  chmod +x /usr/local/bin/syft
  rm -f "/tmp/${SYFT_TAR}"

  echo "[PASS] Syft v${SYFT_VERSION} installed: $(syft version 2>/dev/null | head -1)"
}

# ------------------------------------------------------------------
# Main
# ------------------------------------------------------------------
echo "============================================"
echo "  ForgeOps Runner Setup"
echo "  URL:    ${RUNNER_URL}"
echo "  Name:   ${RUNNER_NAME}"
echo "  Labels: ${RUNNER_LABELS}"
echo "============================================"

install_runner
install_trivy
install_gitleaks
install_syft

echo ""
echo "[PASS] Runner setup complete. Start with: cd ${RUNNER_DIR} && ./run.sh"
echo "[INFO] Or install as a service: cd ${RUNNER_DIR} && sudo ./svc.sh install && sudo ./svc.sh start"
