# Rollback Procedures

## Automatic Rollback

If post-deploy health checks fail, the platform automatically rolls back to the previous stable version. No manual action needed.

## Manual Rollback

### Option 1: Revert via Git

```bash
git revert <commit-sha>
git push origin <branch>
```

The revert triggers a new pipeline run deploying the previous state.

### Option 2: Redeploy Previous Version

1. Go to Actions tab in GitHub
2. Find the last successful deploy workflow run
3. Click "Re-run all jobs"

### Option 3: Emergency Rollback

For production emergencies:
1. Open a [Support Request](https://github.com/askboppana/ForgeOps/issues/new?template=support-request.md) with Critical priority
2. Tag @askboppana for immediate response
3. The admin can trigger a manual rollback from the dashboard

## Post-Rollback

1. Investigate the root cause
2. Document findings in the Jira ticket
3. Fix the issue on a feature branch
4. Re-promote through the standard workflow
