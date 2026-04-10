#!/bin/bash
# Final pipeline summary generator
echo "## 🔷 ForgeOps Pipeline Summary" >> "$GITHUB_STEP_SUMMARY"
echo "" >> "$GITHUB_STEP_SUMMARY"
echo "| Field | Value |" >> "$GITHUB_STEP_SUMMARY"
echo "|---|---|" >> "$GITHUB_STEP_SUMMARY"
echo "| Repository | $GITHUB_REPOSITORY |" >> "$GITHUB_STEP_SUMMARY"
echo "| Branch | $GITHUB_REF_NAME |" >> "$GITHUB_STEP_SUMMARY"
echo "| Commit | ${GITHUB_SHA:0:7} |" >> "$GITHUB_STEP_SUMMARY"
echo "| Actor | $GITHUB_ACTOR |" >> "$GITHUB_STEP_SUMMARY"
echo "| Run | [#$GITHUB_RUN_NUMBER](https://github.com/$GITHUB_REPOSITORY/actions/runs/$GITHUB_RUN_ID) |" >> "$GITHUB_STEP_SUMMARY"
if [ -f .forgeops/events.json ]; then
  TOTAL=$(wc -l < .forgeops/events.json)
  PASSED=$(grep -c '"passed"' .forgeops/events.json || echo 0)
  FAILED=$(grep -c '"failed"' .forgeops/events.json || echo 0)
  echo "| Events | $TOTAL total, $PASSED passed, $FAILED failed |" >> "$GITHUB_STEP_SUMMARY"
fi
