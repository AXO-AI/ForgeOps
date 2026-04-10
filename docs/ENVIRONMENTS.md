# ForgeOps Environments

## Overview

ForgeOps uses 5 environments in a progressive promotion pipeline. Each environment has specific branch triggers, protection rules, and Jira status mappings.

## Environment Matrix

| Environment | Branch Trigger | Auto-Deploy | Approval Required | Jira Status |
|-------------|---------------|-------------|-------------------|-------------|
| **DEV** | `develop` | Yes | No | `In Development` |
| **INT** | `develop` | Yes (after DEV) | No | `In Integration` |
| **QA** | `develop` | Yes (after INT) | No | `In QA` |
| **STAGE** | `release/*` | Yes | No | `In Staging` |
| **PROD** | `release/*`, `hotfix/*` | No | **Yes** | `Done` |

## Environment Details

### DEV (Development)
- **Purpose**: First deployment target for feature integration
- **Branch**: `develop`
- **Trigger**: Automatic on push to `develop` (after security scan)
- **Protection**: None
- **URL Pattern**: `https://<app>.dev.internal`
- **Jira Transition**: In Development
- **ITSM**: No Change Request

### INT (Integration)
- **Purpose**: Integration testing between services
- **Branch**: `develop`
- **Trigger**: Automatic after successful DEV deployment
- **Protection**: None
- **URL Pattern**: `https://<app>.int.internal`
- **Jira Transition**: In Integration
- **ITSM**: No Change Request

### QA (Quality Assurance)
- **Purpose**: Manual and automated QA testing
- **Branch**: `develop`
- **Trigger**: Automatic after successful INT deployment
- **Protection**: None (QA team notified via Slack)
- **URL Pattern**: `https://<app>.qa.internal`
- **Jira Transition**: In QA
- **ITSM**: No Change Request

### STAGE (Staging)
- **Purpose**: Pre-production validation, DAST scanning, UAT
- **Branch**: `release/*`
- **Trigger**: Automatic on push to `release/*`
- **Protection**: Cherwell/ServiceNow Change Request created automatically
- **URL Pattern**: `https://<app>.stage.internal`
- **Jira Transition**: In Staging
- **ITSM**: Change Request created (auto)
- **Notes**: OWASP ZAP DAST scan runs against this environment

### PROD (Production)
- **Purpose**: Live production environment
- **Branch**: `release/*`, `hotfix/*`
- **Trigger**: Manual approval via GitHub Environment Protection Rules
- **Protection**:
  - GitHub Environment protection rules (required reviewers)
  - Cherwell/ServiceNow Change Request
  - All security scans must pass
  - DAST scan on staging must pass
- **URL Pattern**: `https://<app>.internal`
- **Jira Transition**: Done
- **ITSM**: Change Request updated (Implemented/Failed)
- **Notes**: Git tag created on successful deployment

## Branch to Environment Flow

```
feature/* ──► develop ──► DEV ──► INT ──► QA
                   │
release/* ──────► STAGE ──► DAST ──► PROD (approval) ──► Git Tag
                   │
hotfix/*  ──────────────────────────► PROD (approval) ──► Git Tag
```

## GitHub Environment Setup

Create these in **Settings > Environments**:

| Environment | Required Reviewers | Wait Timer | Branch Restrictions |
|-------------|-------------------|------------|---------------------|
| `dev` | None | None | `develop` |
| `int` | None | None | `develop` |
| `qa` | None | None | `develop` |
| `stage` | Optional | None | `release/*` |
| `prod` | **Yes** (team leads) | Optional (15 min) | `release/*`, `hotfix/*` |

## Jira Status Flow

```
Open → In Development → In Integration → In QA → In Staging → Done
```

Each pipeline stage automatically transitions linked Jira issues. Issue keys are extracted from commit messages using the regex `[A-Z]+-\d+`.

## ITSM Change Requests

| Environment | Cherwell/ServiceNow |
|-------------|-------------------|
| dev, int, qa | No CR |
| stage | CR created (status: New) |
| prod (success) | CR updated (status: Implemented) |
| prod (failure) | CR updated (status: Failed) |

If neither Cherwell nor ServiceNow is configured, CR creation is skipped gracefully.
