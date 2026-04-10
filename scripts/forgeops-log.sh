#!/bin/bash
# Dual logger: GITHUB_STEP_SUMMARY + events.json + Splunk
# Usage: bash scripts/forgeops-log.sh <event_type> <status> <message> '<json>'
EVENT_TYPE="$1"; STATUS="$2"; MSG="$3"; PAYLOAD="${4:-{}}"
EMOJI="ℹ️"; [ "$STATUS" = "passed" ] && EMOJI="✅"; [ "$STATUS" = "failed" ] && EMOJI="❌"; [ "$STATUS" = "skipped" ] && EMOJI="⏭️"
echo "| $(date -u +%H:%M:%S) | $EVENT_TYPE | $EMOJI $STATUS | $MSG |" >> "$GITHUB_STEP_SUMMARY" 2>/dev/null || true
mkdir -p .forgeops
echo "{\"timestamp\":\"$(date -u +%Y-%m-%dT%H:%M:%SZ)\",\"type\":\"$EVENT_TYPE\",\"status\":\"$STATUS\",\"message\":\"$MSG\",\"data\":$PAYLOAD,\"run_id\":\"$GITHUB_RUN_ID\",\"repo\":\"$GITHUB_REPOSITORY\",\"actor\":\"$GITHUB_ACTOR\",\"branch\":\"$GITHUB_REF_NAME\",\"sha\":\"${GITHUB_SHA:0:7}\"}" >> .forgeops/events.json
[ -z "$SPLUNK_HEC_URL" ] || [ -z "$SPLUNK_HEC_TOKEN" ] && exit 0
curl -k -s -o /dev/null -X POST "${SPLUNK_HEC_URL}/services/collector/event" \
  -H "Authorization: Splunk ${SPLUNK_HEC_TOKEN}" \
  -d "{\"time\":$(date +%s),\"host\":\"$(hostname)\",\"source\":\"forgeops\",\"sourcetype\":\"forgeops:${EVENT_TYPE}\",\"index\":\"${SPLUNK_INDEX:-forgeops_cicd}\",\"event\":$PAYLOAD}" || true
