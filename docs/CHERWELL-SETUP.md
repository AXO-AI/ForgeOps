# Cherwell / ServiceNow Setup

Requires self-hosted runners on corporate network.

## Cherwell
Secrets: `CHERWELL_URL`, `CHERWELL_CLIENT_ID`, `CHERWELL_CLIENT_SECRET`

## ServiceNow
Secrets: `SERVICENOW_URL`, `SERVICENOW_USER`, `SERVICENOW_PASSWORD`

## What Happens
| Event | Action |
|-------|--------|
| Deploy to STAGE | CR created (New) |
| Deploy to PROD (success) | CR updated (Implemented) |
| Deploy to PROD (failure) | CR updated (Failed) |

If neither configured, CR steps skip gracefully.
