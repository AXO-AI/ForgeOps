#!/usr/bin/env bash
# cherwell-health-check.sh — Test ITSM connectivity (Cherwell or ServiceNow)
# Usage: bash scripts/cherwell-health-check.sh
# Reads from env vars: CHERWELL_URL, CHERWELL_CLIENT_ID, CHERWELL_CLIENT_SECRET
#                   or: SERVICENOW_URL, SERVICENOW_USER, SERVICENOW_PASSWORD
# Reports success/failure.

set -euo pipefail

echo "========================================="
echo "  ForgeOps ITSM Health Check"
echo "========================================="

# ── Detect ITSM ──
if [ -n "${CHERWELL_URL:-}" ]; then
  ITSM="Cherwell"
  URL="${CHERWELL_URL}"
  echo "ITSM: Cherwell"
  echo "URL:  ${URL}"
  echo ""

  echo "Testing OAuth2 authentication..."
  TOKEN_RESPONSE=$(curl -s -w "\n%{http_code}" -X POST \
    "${URL}/CherwellAPI/token" \
    -H "Content-Type: application/x-www-form-urlencoded" \
    -d "grant_type=client_credentials&client_id=${CHERWELL_CLIENT_ID:-}&client_secret=${CHERWELL_CLIENT_SECRET:-}" \
    --max-time 10 2>/dev/null) || true

  HTTP_CODE=$(echo "${TOKEN_RESPONSE}" | tail -1)
  BODY=$(echo "${TOKEN_RESPONSE}" | sed '$d')

  if [ "${HTTP_CODE}" = "200" ]; then
    echo "✅ Authentication successful (HTTP ${HTTP_CODE})"

    # Test API access
    ACCESS_TOKEN=$(echo "${BODY}" | python3 -c "import sys,json; print(json.load(sys.stdin).get('access_token',''))" 2>/dev/null || echo "")
    if [ -n "${ACCESS_TOKEN}" ]; then
      API_RESPONSE=$(curl -s -o /dev/null -w "%{http_code}" \
        "${URL}/CherwellAPI/api/V1/getbusinessobjectsummary/busobname/ChangeRequest" \
        -H "Authorization: Bearer ${ACCESS_TOKEN}" \
        --max-time 10 2>/dev/null) || API_RESPONSE="000"

      if [ "${API_RESPONSE}" = "200" ]; then
        echo "✅ API access successful — ChangeRequest object found"
      else
        echo "❌ API access failed (HTTP ${API_RESPONSE})"
      fi
    fi
  else
    echo "❌ Authentication failed (HTTP ${HTTP_CODE})"
    echo "Response: ${BODY}"
  fi

elif [ -n "${SERVICENOW_URL:-}" ]; then
  ITSM="ServiceNow"
  URL="${SERVICENOW_URL}"
  echo "ITSM: ServiceNow"
  echo "URL:  ${URL}"
  echo ""

  echo "Testing Basic authentication..."
  AUTH=$(echo -n "${SERVICENOW_USER:-}:${SERVICENOW_PASSWORD:-}" | base64)

  HTTP_CODE=$(curl -s -o /dev/null -w "%{http_code}" \
    "${URL}/api/now/table/change_request?sysparm_limit=1" \
    -H "Authorization: Basic ${AUTH}" \
    -H "Accept: application/json" \
    --max-time 10 2>/dev/null) || HTTP_CODE="000"

  if [ "${HTTP_CODE}" = "200" ]; then
    echo "✅ Authentication successful (HTTP ${HTTP_CODE})"
    echo "✅ API access successful — change_request table accessible"
  else
    echo "❌ Authentication/API failed (HTTP ${HTTP_CODE})"
  fi

else
  echo "⏭️ No ITSM configured."
  echo ""
  echo "To configure Cherwell, set:"
  echo "  CHERWELL_URL, CHERWELL_CLIENT_ID, CHERWELL_CLIENT_SECRET"
  echo ""
  echo "To configure ServiceNow, set:"
  echo "  SERVICENOW_URL, SERVICENOW_USER, SERVICENOW_PASSWORD"
  exit 0
fi

echo ""
echo "========================================="
echo "  Health check complete"
echo "========================================="
