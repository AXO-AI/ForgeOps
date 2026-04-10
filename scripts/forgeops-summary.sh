#!/bin/bash
# forgeops-summary.sh - Generate a markdown summary from .forgeops/events.json
# Writes a formatted table to GITHUB_STEP_SUMMARY

set -euo pipefail

EVENTS_FILE=".forgeops/events.json"

if [[ ! -f "$EVENTS_FILE" ]]; then
  echo "[INFO] No events file found at ${EVENTS_FILE} -- nothing to summarize"
  exit 0
fi

# ------------------------------------------------------------------
# Build the markdown summary
# ------------------------------------------------------------------
generate_summary() {
  python3 -c "
import json
import sys

events_file = '${EVENTS_FILE}'

try:
    with open(events_file, 'r') as f:
        content = f.read().strip()
except FileNotFoundError:
    print('[INFO] Events file not found')
    sys.exit(0)

# Support both JSON array and newline-delimited JSON
events = []
if content.startswith('['):
    events = json.loads(content)
else:
    for line in content.splitlines():
        line = line.strip()
        if line:
            events.append(json.loads(line))

if not events:
    print('[INFO] No events recorded')
    sys.exit(0)

lines = []
lines.append('## ForgeOps Pipeline Summary')
lines.append('')
lines.append('| Time | Event Type | Status | Message |')
lines.append('|------|-----------|--------|---------|')

pass_count = 0
fail_count = 0
skip_count = 0
info_count = 0

for evt in events:
    ts = evt.get('timestamp', 'N/A')
    # Show only the time portion if full ISO timestamp
    if 'T' in ts:
        display_time = ts.split('T')[1].replace('Z', '')
    else:
        display_time = ts

    etype = evt.get('event_type', 'unknown')
    status = evt.get('status', 'INFO')
    msg = evt.get('message', '')

    status_label = '[' + status + ']'

    if status == 'PASS':
        pass_count += 1
    elif status == 'FAIL':
        fail_count += 1
    elif status == 'SKIP':
        skip_count += 1
    else:
        info_count += 1

    lines.append(f'| {display_time} | {etype} | {status_label} | {msg} |')

lines.append('')
lines.append('### Totals')
lines.append('')
lines.append(f'- **PASS:** {pass_count}')
lines.append(f'- **FAIL:** {fail_count}')
lines.append(f'- **SKIP:** {skip_count}')
lines.append(f'- **INFO:** {info_count}')
lines.append('')

if fail_count > 0:
    lines.append('> **Result: FAIL** -- One or more steps failed.')
else:
    lines.append('> **Result: PASS** -- All steps completed successfully.')

print('\n'.join(lines))
"
}

SUMMARY=$(generate_summary)

if [[ -n "${GITHUB_STEP_SUMMARY:-}" ]]; then
  echo "$SUMMARY" >> "$GITHUB_STEP_SUMMARY"
  echo "[INFO] Summary written to GITHUB_STEP_SUMMARY"
else
  echo "$SUMMARY"
fi
