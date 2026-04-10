#!/usr/bin/env bash
# forgeops-log.sh — Unified ForgeOps logging engine.
# Dual logging: GitHub Actions Job Summary + Splunk HEC (optional)
# Plus append-mode JSON lines to .forgeops/events.json for audit trail.
#
# Usage: bash scripts/forgeops-log.sh <event_type> <status> <message> [json_payload]
# Status: passed, failed, skipped, info
# Example: bash scripts/forgeops-log.sh "security_scan" "passed" "SonarQube quality gate passed" '{"tool":"SonarQube","gate":"OK"}'

set -euo pipefail

EVENT_TYPE="${1:-unknown}"
STATUS="${2:-info}"
MESSAGE="${3:-}"
PAYLOAD="${4:-"{}"}"

TIMESTAMP=$(date -u +"%Y-%m-%dT%H:%M:%SZ")

# ── Status emoji mapping ──
case "${STATUS}" in
  passed)  EMOJI="✅" ;;
  failed)  EMOJI="❌" ;;
  skipped) EMOJI="⏭️" ;;
  info)    EMOJI="ℹ️" ;;
  warning) EMOJI="⚠️" ;;
  *)       EMOJI="🔷" ;;
esac

# ── Step 1: Write to GITHUB_STEP_SUMMARY ──
if [ -n "${GITHUB_STEP_SUMMARY:-}" ]; then
  echo "| ${TIMESTAMP} | \`${EVENT_TYPE}\` | ${EMOJI} ${STATUS} | ${MESSAGE} |" >> "${GITHUB_STEP_SUMMARY}"
fi

# ── Step 2: Append to .forgeops/events.json ──
EVENTS_DIR=".forgeops"
EVENTS_FILE="${EVENTS_DIR}/events.json"
mkdir -p "${EVENTS_DIR}"

# Build JSON line using python3 for proper escaping
python3 -c "
import json, sys
event = {
    'timestamp': '${TIMESTAMP}',
    'type': sys.argv[1],
    'status': sys.argv[2],
    'message': sys.argv[3],
    'data': json.loads(sys.argv[4]) if sys.argv[4] != '{}' else {},
    'run_id': '${GITHUB_RUN_ID:-local}',
    'run_number': '${GITHUB_RUN_NUMBER:-0}',
    'repo': '${GITHUB_REPOSITORY:-local}',
    'actor': '${GITHUB_ACTOR:-local}',
    'branch': '${GITHUB_REF_NAME:-local}',
    'sha': '${GITHUB_SHA:-local}',
    'workflow': '${GITHUB_WORKFLOW:-local}',
    'job': '${GITHUB_JOB:-local}'
}
print(json.dumps(event))
" "${EVENT_TYPE}" "${STATUS}" "${MESSAGE}" "${PAYLOAD}" >> "${EVENTS_FILE}" 2>/dev/null || \
  echo "{\"timestamp\":\"${TIMESTAMP}\",\"type\":\"${EVENT_TYPE}\",\"status\":\"${STATUS}\",\"message\":\"${MESSAGE}\"}" >> "${EVENTS_FILE}"

# ── Step 3: Send to Splunk HEC (optional) ──
if [ -n "${SPLUNK_HEC_URL:-}" ] && [ -n "${SPLUNK_HEC_TOKEN:-}" ]; then
  SPLUNK_INDEX="${SPLUNK_INDEX:-forgeops_cicd}"

  HEC_PAYLOAD=$(python3 -c "
import json, sys
payload = {
    'time': $(date +%s),
    'host': '${GITHUB_REPOSITORY:-local}',
    'index': '${SPLUNK_INDEX}',
    'sourcetype': 'forgeops:${EVENT_TYPE}',
    'source': 'forgeops-pipeline',
    'event': {
        'type': sys.argv[1],
        'status': sys.argv[2],
        'message': sys.argv[3],
        'data': json.loads(sys.argv[4]) if sys.argv[4] != '{}' else {},
        'github': {
            'repository': '${GITHUB_REPOSITORY:-local}',
            'run_id': '${GITHUB_RUN_ID:-local}',
            'run_number': '${GITHUB_RUN_NUMBER:-0}',
            'ref': '${GITHUB_REF:-local}',
            'sha': '${GITHUB_SHA:-local}',
            'actor': '${GITHUB_ACTOR:-local}',
            'workflow': '${GITHUB_WORKFLOW:-local}'
        }
    }
}
print(json.dumps(payload))
" "${EVENT_TYPE}" "${STATUS}" "${MESSAGE}" "${PAYLOAD}" 2>/dev/null)

  curl -k -s -o /dev/null -w "" \
    -H "Authorization: Splunk ${SPLUNK_HEC_TOKEN}" \
    -H "Content-Type: application/json" \
    -d "${HEC_PAYLOAD}" \
    "${SPLUNK_HEC_URL}" \
    --max-time 5 2>/dev/null || echo "::warning::Splunk HEC send failed (non-fatal)"
fi

echo "${EMOJI} [${EVENT_TYPE}] ${MESSAGE}"
