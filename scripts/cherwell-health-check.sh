#!/bin/bash
# cherwell-health-check.sh - Test connectivity to Cherwell or ServiceNow ITSM
# Checks whichever platform is configured via environment variables.

set -euo pipefail

CHERWELL_URL="${CHERWELL_URL:-}"
CHERWELL_TOKEN="${CHERWELL_TOKEN:-}"
SERVICENOW_URL="${SERVICENOW_URL:-}"
SERVICENOW_TOKEN="${SERVICENOW_TOKEN:-}"

TIMEOUT="${HEALTH_CHECK_TIMEOUT:-10}"
RETRIES="${HEALTH_CHECK_RETRIES:-3}"

# ------------------------------------------------------------------
# Helper: test a single endpoint
# ------------------------------------------------------------------
test_endpoint() {
  local url="$1"
  local auth_header="$2"
  local label="$3"
  local attempt=1

  while [[ $attempt -le $RETRIES ]]; do
    echo "[INFO] ${label} connectivity check (attempt ${attempt}/${RETRIES})..."

    HTTP_CODE=$(curl -s -o /dev/null -w "%{http_code}" \
      -X GET "${url}" \
      -H "Authorization: ${auth_header}" \
      -H "Accept: application/json" \
      --connect-timeout "$TIMEOUT" \
      --max-time "$TIMEOUT" \
    ) || HTTP_CODE="000"

    if [[ "$HTTP_CODE" =~ ^2[0-9]{2}$ ]]; then
      echo "[PASS] ${label} is reachable (HTTP ${HTTP_CODE})"
      return 0
    fi

    echo "[INFO] ${label} returned HTTP ${HTTP_CODE}"
    attempt=$((attempt + 1))

    if [[ $attempt -le $RETRIES ]]; then
      sleep 1
    fi
  done

  echo "[FAIL] ${label} is not reachable after ${RETRIES} attempts"
  return 1
}

# ------------------------------------------------------------------
# Main
# ------------------------------------------------------------------
CHECKED=0
FAILURES=0

if [[ -n "$CHERWELL_URL" && -n "$CHERWELL_TOKEN" ]]; then
  CHECKED=1
  HEALTH_ENDPOINT="${CHERWELL_URL%/}/api/V1/serviceinfo"
  if ! test_endpoint "$HEALTH_ENDPOINT" "Bearer ${CHERWELL_TOKEN}" "Cherwell"; then
    FAILURES=$((FAILURES + 1))
  fi
fi

if [[ -n "$SERVICENOW_URL" && -n "$SERVICENOW_TOKEN" ]]; then
  CHECKED=1
  HEALTH_ENDPOINT="${SERVICENOW_URL%/}/api/now/table/sys_properties?sysparm_limit=1"
  if ! test_endpoint "$HEALTH_ENDPOINT" "Bearer ${SERVICENOW_TOKEN}" "ServiceNow"; then
    FAILURES=$((FAILURES + 1))
  fi
fi

if [[ $CHECKED -eq 0 ]]; then
  echo "[SKIP] No ITSM platform configured -- nothing to check"
  echo "[SKIP] Set CHERWELL_URL/CHERWELL_TOKEN or SERVICENOW_URL/SERVICENOW_TOKEN to enable"
  exit 0
fi

if [[ $FAILURES -gt 0 ]]; then
  echo "[FAIL] Health check completed with ${FAILURES} failure(s)"
  exit 1
fi

echo "[PASS] All ITSM health checks passed"
exit 0
