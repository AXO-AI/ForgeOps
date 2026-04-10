# Rollback Procedures

## Automatic Rollback
If health check fails (10 consecutive failures), pipeline auto-reverts and notifies.

## Manual from Dashboard
Pipelines page → find environment → Rollback button → confirm.

## Manual from GitHub
Repo → Actions → Rollback workflow → Run workflow → select environment.
