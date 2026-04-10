#!/bin/bash
echo "ForgeOps ITSM Health Check"
if [ -n "$CHERWELL_URL" ]; then
  STATUS=$(curl -so /dev/null -w '%{http_code}' --max-time 10 "$CHERWELL_URL/api/V1/status" 2>/dev/null || echo "000")
  [ "$STATUS" = "200" ] && echo "✅ Cherwell: connected ($STATUS)" || echo "❌ Cherwell: unreachable ($STATUS)"
elif [ -n "$SERVICENOW_URL" ]; then
  STATUS=$(curl -so /dev/null -w '%{http_code}' --max-time 10 "$SERVICENOW_URL/api/now/table/sys_properties?sysparm_limit=1" 2>/dev/null || echo "000")
  [ "$STATUS" = "200" ] && echo "✅ ServiceNow: connected ($STATUS)" || echo "❌ ServiceNow: unreachable ($STATUS)"
else
  echo "⏭️ No ITSM configured"
fi
