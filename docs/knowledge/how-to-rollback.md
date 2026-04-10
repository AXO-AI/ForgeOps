# How to Rollback

## Automatic Rollback
If health checks fail after deploy, the platform rolls back automatically. No action needed.

## Manual Rollback

### Option 1: Git Revert
```bash
git revert <commit-sha>
git push origin <branch>
```
This triggers a new deploy with the previous code.

### Option 2: Re-run Previous Deploy
1. Go to the Actions tab in GitHub
2. Find the last successful deploy run
3. Click "Re-run all jobs"

### Option 3: Emergency
1. Open a Support Request with Critical priority
2. Tag @askboppana
3. Admin triggers rollback from the dashboard

## After Rollback
1. Investigate root cause
2. Fix on a feature branch
3. Re-promote through the standard workflow
