#!/bin/bash
# ForgeOps Self-Hosted Runner Setup (Linux)
# Usage: bash scripts/setup-runner.sh --url <github_url> --token <reg_token> [--labels <labels>] [--name <name>]
set -euo pipefail

# Argument parsing
URL=""; TOKEN=""; LABELS="forgeops"; NAME="$(hostname)"
while [[ $# -gt 0 ]]; do
  case "$1" in
    --url)    URL="$2"; shift 2 ;;
    --token)  TOKEN="$2"; shift 2 ;;
    --labels) LABELS="$2"; shift 2 ;;
    --name)   NAME="$2"; shift 2 ;;
    *) echo "Unknown arg: $1"; exit 1 ;;
  esac
done

if [ -z "$URL" ] || [ -z "$TOKEN" ]; then
  echo "Usage: setup-runner.sh --url <github_url> --token <reg_token> [--labels <labels>] [--name <name>]"
  exit 1
fi

echo "=== ForgeOps Runner Setup ==="

# Install dependencies
echo "Installing system packages..."
sudo apt-get update -qq
sudo apt-get install -y -qq curl jq unzip docker.io nodejs npm python3 python3-pip

# Install Trivy
echo "Installing Trivy..."
curl -sfL https://raw.githubusercontent.com/aquasecurity/trivy/main/contrib/install.sh | sudo sh -s -- -b /usr/local/bin

# Install Gitleaks
echo "Installing Gitleaks..."
GITLEAKS_VERSION=$(curl -s https://api.github.com/repos/gitleaks/gitleaks/releases/latest | jq -r .tag_name)
curl -sSLo gitleaks.tar.gz "https://github.com/gitleaks/gitleaks/releases/download/${GITLEAKS_VERSION}/gitleaks_${GITLEAKS_VERSION#v}_linux_x64.tar.gz"
tar xzf gitleaks.tar.gz gitleaks && sudo mv gitleaks /usr/local/bin/ && rm gitleaks.tar.gz

# Install Syft
echo "Installing Syft..."
curl -sSfL https://raw.githubusercontent.com/anchore/syft/main/install.sh | sudo sh -s -- -b /usr/local/bin

# Setup GitHub Actions runner
echo "Setting up GitHub Actions runner..."
RUNNER_DIR="/opt/actions-runner"
sudo mkdir -p "$RUNNER_DIR"
sudo chown "$(whoami)" "$RUNNER_DIR"
cd "$RUNNER_DIR"

RUNNER_VERSION=$(curl -s https://api.github.com/repos/actions/runner/releases/latest | jq -r .tag_name | sed 's/^v//')
curl -sSLo actions-runner.tar.gz "https://github.com/actions/runner/releases/download/v${RUNNER_VERSION}/actions-runner-linux-x64-${RUNNER_VERSION}.tar.gz"
tar xzf actions-runner.tar.gz && rm actions-runner.tar.gz

# Configure runner
./config.sh --url "$URL" --token "$TOKEN" --name "$NAME" --labels "$LABELS" --unattended --replace

# Install and start as service
sudo ./svc.sh install
sudo ./svc.sh start

echo "=== Runner '$NAME' is running with labels: $LABELS ==="
