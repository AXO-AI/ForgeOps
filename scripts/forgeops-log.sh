#!/bin/bash
# forgeops-log.sh - Structured logging for ForgeOps CI/CD pipelines
# Usage: forgeops-log.sh <event_type> <status> <message> [json_payload]
# Status values: PASS, FAIL, SKIP, INFO

set -euo pipefail

EVENT_TYPE="${1:-}"
STATUS="${2:-}"
MESSAGE="${3:-}"
JSON_PAYLOAD="${4:-{}}"

if [[ -z "$EVENT_TYPE" || -z "$STATUS" || -z "$MESSAGE" ]]; then
  echo "[FAIL] Usage: forgeops-log.sh <event_type> <status> <message> [json_payload]"
  exit 1
fi

# Validate status
case "$STATUS" in
  PASS|FAIL|SKIP|INFO) ;;
  *)
    echo "[FAIL] Invalid status: $STATUS. Must be one of: PASS, FAIL, SKIP, INFO"
    exit 1
    ;;
esac

TIMESTAMP="$(date -u '+%Y-%m-%dT%H:%M:%SZ')"
DISPLAY_TIME="$(date -u '+%H:%M:%S')"

# Format status label
STATUS_LABEL="[${STATUS}]"

# ------------------------------------------------------------------
# 1. Write to GITHUB_STEP_SUMMARY (markdown table row)
# ------------------------------------------------------------------
if [[ -n "${GITHUB_STEP_SUMMARY:-}" ]]; then
  echo "| ${DISPLAY_TIME} | ${EVENT_TYPE} | ${STATUS_LABEL} | ${MESSAGE} |" >> "$GITHUB_STEP_SUMMARY"
else
  echo "${DISPLAY_TIME} | ${EVENT_TYPE} | ${STATUS_LABEL} | ${MESSAGE}"
fi

# ------------------------------------------------------------------
# 2. Append structured JSON to .forgeops/events.json
# ------------------------------------------------------------------
EVENTS_DIR=".forgeops"
EVENTS_FILE="${EVENTS_DIR}/events.json"

mkdir -p "$EVENTS_DIR"

# Build the event JSON object
EVENT_JSON=$(cat <<ENDJSON
{
  "timestamp": "${TIMESTAMP}",
  "event_type": "${EVENT_TYPE}",
  "status": "${STATUS}",
  "message": "${MESSAGE}",
  "payload": ${JSON_PAYLOAD},
  "run_id": "${GITHUB_RUN_ID:-local}",
  "run_number": "${GITHUB_RUN_NUMBER:-0}",
  "repository": "${GITHUB_REPOSITORY:-local}",
  "ref": "${GITHUB_REF:-unknown}"
}
ENDJSON
)

# Initialize the events file if it does not exist
if [[ ! -f "$EVENTS_FILE" ]]; then
  echo "[]" > "$EVENTS_FILE"
fi

# Append the event -- read existing array, add new entry, write back
# Uses a temp file to avoid partial writes
TMP_FILE=$(mktemp)
if command -v python3 &>/dev/null; then
  python3 -c "
import json, sys
with open('${EVENTS_FILE}', 'r') as f:
    events = json.load(f)
events.append(json.loads(sys.stdin.read()))
with open('${TMP_FILE}', 'w') as f:
    json.dump(events, f, indent=2)
" <<< "$EVENT_JSON"
  mv "$TMP_FILE" "$EVENTS_FILE"
else
  # Fallback: just append as newline-delimited JSON
  echo "$EVENT_JSON" >> "$EVENTS_FILE"
  rm -f "$TMP_FILE"
fi

# ------------------------------------------------------------------
# 3. Send to Splunk HEC if configured
# ------------------------------------------------------------------
if [[ -n "${SPLUNK_HEC_URL:-}" && -n "${SPLUNK_HEC_TOKEN:-}" ]]; then
  SPLUNK_PAYLOAD=$(cat <<ENDJSON2
{
  "event": ${EVENT_JSON},
  "sourcetype": "forgeops:ci",
  "source": "forgeops-log",
  "index": "${SPLUNK_INDEX:-main}"
}
ENDJSON2
  )

  HTTP_CODE=$(curl -s -o /dev/null -w "%{http_code}" \
    -X POST "${SPLUNK_HEC_URL}" \
    -H "Authorization: Splunk ${SPLUNK_HEC_TOKEN}" \
    -H "Content-Type: application/json" \
    -d "$SPLUNK_PAYLOAD" \
    --connect-timeout 5 \
    --max-time 10 \
  ) || true

  if [[ "${HTTP_CODE}" == "200" ]]; then
    echo "[INFO] Event sent to Splunk successfully"
  else
    echo "[INFO] Splunk delivery returned HTTP ${HTTP_CODE} (non-fatal)"
  fi
else
  echo "[INFO] Splunk HEC not configured -- skipping remote logging"
fi
