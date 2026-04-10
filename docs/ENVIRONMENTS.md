# Environments

## Overview

| Environment | Branch  | Auto Deploy | Approval Required | Purpose              |
|-------------|---------|-------------|-------------------|----------------------|
| INT         | int     | Yes         | No                | Integration testing  |
| QA          | qa      | No          | Yes               | Quality assurance    |
| Stage       | stage   | No          | Yes               | UAT / pre-production |
| Production  | main    | No          | Yes               | Live production      |

## Environment Variables

Each environment has its own set of secrets and variables configured in GitHub:
- `ENV_URL` -- target deployment URL
- `ENV_CREDENTIALS` -- stored in GitHub Org Secrets
- `ENV_CONFIG` -- environment-specific configuration

## Promotion Rules

- INT: automatic on merge to `int` branch
- QA: requires qa_team approval via GitHub Environment protection
- Stage: requires uat_team approval via GitHub Environment protection
- Production: requires release_engineer approval + Cherwell change ticket

## Health Checks

Each environment runs health checks post-deploy. If health checks fail, automatic rollback is triggered.
