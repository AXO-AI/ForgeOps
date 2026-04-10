#!/usr/bin/env bash
# forgeops-summary.sh — Generate final pipeline summary from .forgeops/events.json
# Called at the end of every pipeline to write a beautiful markdown summary.
#
# Usage: bash scripts/forgeops-summary.sh
# Env vars: APP_NAME, VERSION (optional, auto-detected from events if not set)

set -euo pipefail

EVENTS_FILE=".forgeops/events.json"
SUMMARY_FILE="${GITHUB_STEP_SUMMARY:-/dev/stdout}"

APP_NAME="${APP_NAME:-${GITHUB_REPOSITORY:-unknown}}"
VERSION="${VERSION:-unknown}"
PIPELINE_START=""
PIPELINE_END=""

# ── Parse events ──
TOTAL_EVENTS=0
PASSED=0
FAILED=0
SKIPPED=0

if [ -f "${EVENTS_FILE}" ]; then
  TOTAL_EVENTS=$(wc -l < "${EVENTS_FILE}" | tr -d ' ')

  PASSED=$(grep -c '"status": *"passed"' "${EVENTS_FILE}" 2>/dev/null || echo 0)
  FAILED=$(grep -c '"status": *"failed"' "${EVENTS_FILE}" 2>/dev/null || echo 0)
  SKIPPED=$(grep -c '"status": *"skipped"' "${EVENTS_FILE}" 2>/dev/null || echo 0)

  PIPELINE_START=$(head -1 "${EVENTS_FILE}" | python3 -c "import sys,json; print(json.load(sys.stdin).get('timestamp',''))" 2>/dev/null || echo "")
  PIPELINE_END=$(tail -1 "${EVENTS_FILE}" | python3 -c "import sys,json; print(json.load(sys.stdin).get('timestamp',''))" 2>/dev/null || echo "")
fi

# ── Determine overall status ──
if [ "${FAILED}" -gt 0 ]; then
  OVERALL="❌ FAILED"
  OVERALL_EMOJI="❌"
else
  OVERALL="✅ PASSED"
  OVERALL_EMOJI="✅"
fi

# ── Write summary ──
cat >> "${SUMMARY_FILE}" <<HEADER

---

# 🔷 ForgeOps Pipeline Summary

**Application:** \`${APP_NAME}\` | **Version:** \`${VERSION}\` | **Result:** ${OVERALL}

| Detail | Value |
|--------|-------|
| **Repository** | \`${GITHUB_REPOSITORY:-local}\` |
| **Branch** | \`${GITHUB_REF_NAME:-local}\` |
| **Commit** | \`${GITHUB_SHA:0:8}\` |
| **Actor** | \`${GITHUB_ACTOR:-local}\` |
| **Run ID** | [${GITHUB_RUN_ID:-local}](${GITHUB_SERVER_URL:-https://github.com}/${GITHUB_REPOSITORY:-}/actions/runs/${GITHUB_RUN_ID:-}) |
| **Started** | ${PIPELINE_START} |
| **Completed** | ${PIPELINE_END} |

HEADER

# ── Events table ──
if [ -f "${EVENTS_FILE}" ] && [ "${TOTAL_EVENTS}" -gt 0 ]; then
  cat >> "${SUMMARY_FILE}" <<'TABLE_HEADER'
## 📋 Pipeline Events

| Timestamp | Event | Status | Message |
|-----------|-------|--------|---------|
TABLE_HEADER

  while IFS= read -r line; do
    TS=$(echo "${line}" | python3 -c "import sys,json; print(json.load(sys.stdin).get('timestamp',''))" 2>/dev/null || echo "?")
    TYPE=$(echo "${line}" | python3 -c "import sys,json; print(json.load(sys.stdin).get('type',''))" 2>/dev/null || echo "?")
    ST=$(echo "${line}" | python3 -c "import sys,json; print(json.load(sys.stdin).get('status',''))" 2>/dev/null || echo "?")
    MSG=$(echo "${line}" | python3 -c "import sys,json; print(json.load(sys.stdin).get('message',''))" 2>/dev/null || echo "?")

    case "${ST}" in
      passed)  ST_EMOJI="✅" ;;
      failed)  ST_EMOJI="❌" ;;
      skipped) ST_EMOJI="⏭️" ;;
      info)    ST_EMOJI="ℹ️" ;;
      *)       ST_EMOJI="🔷" ;;
    esac

    echo "| ${TS} | \`${TYPE}\` | ${ST_EMOJI} ${ST} | ${MSG} |" >> "${SUMMARY_FILE}"
  done < "${EVENTS_FILE}"
fi

# ── Stats ──
cat >> "${SUMMARY_FILE}" <<STATS

## 📊 Summary Statistics

| Metric | Count |
|--------|-------|
| Total Events | ${TOTAL_EVENTS} |
| ✅ Passed | ${PASSED} |
| ❌ Failed | ${FAILED} |
| ⏭️ Skipped | ${SKIPPED} |

STATS

# ── Footer ──
cat >> "${SUMMARY_FILE}" <<FOOTER

---
> 🔷 **ForgeOps DevSecOps Platform** — [Pipeline Run](${GITHUB_SERVER_URL:-https://github.com}/${GITHUB_REPOSITORY:-}/actions/runs/${GITHUB_RUN_ID:-})
FOOTER

echo "${OVERALL_EMOJI} Pipeline summary written to GITHUB_STEP_SUMMARY"
