# Setup Guide

## Prerequisites

- GitHub account with access to the ForgeOps organization
- Repository registered in `forgeops-config.json`
- Required secrets configured in GitHub Org Secrets

## Step 1: Repository Setup

1. Add your repo to `forgeops-config.json`
2. Copy `templates/CODEOWNERS.template` to your repo root as `CODEOWNERS`
3. Enable branch protection on `main`, `stage`, `qa`, `int`

## Step 2: Secrets Configuration

Add these secrets at the org or repo level:
- `DEPLOY_TOKEN` -- deployment credentials
- `JIRA_API_TOKEN` -- Jira integration
- `TEAMS_WEBHOOK_URL` -- Teams notifications
- `SPLUNK_HEC_TOKEN` -- Splunk logging
- `EMAIL_SMTP_PASSWORD` -- email notifications

## Step 3: Branch Setup

Create the environment branches:
```
git checkout -b int
git push origin int
git checkout -b qa
git push origin qa
git checkout -b stage
git push origin stage
```

## Step 4: GitHub Environments

Configure environments (int, qa, stage, prod) in repo Settings > Environments with appropriate protection rules.

## Step 5: Verify

Push a test change to a feature branch and open a PR to `int` to verify the pipeline runs.
