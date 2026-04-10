# How to Configure Jira

## Overview
ForgeOps links Jira tickets to PRs and deployments for traceability.

## Setup
1. Ensure `JIRA_API_TOKEN` is set in GitHub Org Secrets
2. Ensure `JIRA_BASE_URL` is set (e.g., `https://yourorg.atlassian.net`)
3. Use the project prefix defined in `forgeops-config.json` (default: `FORGE`)

## Linking Tickets to PRs
Include the Jira ticket ID in your PR title:
```
FORGE-123: Add user authentication
```
The pipeline automatically updates the Jira ticket with the PR link and build status.

## Ticket Transitions
- PR opened: ticket moves to "In Progress"
- PR merged to int: ticket moves to "In Review"
- Deployed to prod: ticket moves to "Done"

## Troubleshooting
- Verify the API token has read/write access to the project
- Check that the ticket ID format matches the project prefix
- Review the pipeline logs for Jira API errors
