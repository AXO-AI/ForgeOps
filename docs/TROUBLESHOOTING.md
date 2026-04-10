# Troubleshooting

## Permission denied on scripts
Run: `chmod +x scripts/*.sh scripts/*.py` and push. Workflows also auto-fix this.

## Integration skips everything
Expected — add secrets to enable. See docs/SETUP.md.

## SonarQube/Jira/email/Teams fails
Check secrets in GitHub → Org → Settings → Secrets. If not configured, step should skip with "⏭️".

## Dashboard blank screen
Open DevTools → Console. Usually a CDN load error. Refresh.

## Pipeline queued long time
GitHub free: 20 concurrent jobs. Switch to self-hosted for more.

## Merge button disabled
CI checks must pass first. Fix failing checks.

## Jira tickets not transitioning
Check: JIRA_URL + JIRA_TOKEN set, ticket key in commit message (PROJ-123), transition name matches.

## Getting help
Create a [Support Ticket](https://github.com/askboppana/ForgeOps/issues/new?template=support-request.md).
