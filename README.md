# ForgeOps — Enterprise DevSecOps Platform

GitHub Actions-based CI/CD replacing CloudBees Jenkins. No Docker. Best of Harness.io + CircleCI + CloudBees, built on GitHub-native primitives.

## Architecture

```
┌─────────────────────────────────────────────────────────────────────┐
│                          GitHub Repository                          │
│                                                                     │
│  ┌─────────────┐  ┌───────────────┐  ┌───────────┐  ┌───────────┐ │
│  │ java-webapp  │  │ js-webapp     │  │ uipath-rpa│  │ sys-integ │ │
│  │ .yml         │  │ .yml          │  │ .yml      │  │ .yml      │ │
│  └──────┬───────┘  └──────┬────────┘  └─────┬─────┘  └─────┬─────┘ │
│         │                 │                 │              │        │
│         └────────┬────────┴─────┬───────────┴──────────────┘        │
│                  │              │                                    │
│    ┌─────────────▼──┐  ┌───────▼──────────┐                        │
│    │ _security-scan  │  │ _deploy          │   Reusable Workflows   │
│    │ .yml            │  │ .yml             │                        │
│    │                 │  │                  │                        │
│    │ • SonarQube     │  │ • SSH            │                        │
│    │ • Black Duck    │  │ • ArgoCD         │                        │
│    │ • Gitleaks      │  │ • UiPath Orch    │                        │
│    │ • Trivy         │  │ • Health checks  │                        │
│    │ • Syft SBOM     │  │ • Auto-rollback  │                        │
│    └────────────────┘  └──────────────────┘                        │
│                                                                     │
├─────────────────────────────────────────────────────────────────────┤
│                     GitHub-Hosted Runners                           │
│           (ubuntu-latest / windows-latest for now)                  │
│        Switch to self-hosted when ready — see docs/                 │
├─────────────────────────────────────────────────────────────────────┤
│                        Integrations                                 │
│                                                                     │
│  ┌──────────┐ ┌───────────┐ ┌──────┐ ┌───────┐ ┌────────────────┐ │
│  │ SonarQube│ │ Black Duck│ │ Jira │ │ Slack │ │Cherwell/       │ │
│  │ (SAST)   │ │ (SCA)     │ │      │ │       │ │ServiceNow      │ │
│  └──────────┘ └───────────┘ └──────┘ └───────┘ └────────────────┘ │
│  ┌──────────┐ ┌───────────┐ ┌──────────────┐ ┌──────────────────┐ │
│  │ Gitleaks │ │ Trivy     │ │ Syft (SBOM)  │ │ Splunk (opt.)   │ │
│  │ (secrets)│ │ (container│ │              │ │                  │ │
│  └──────────┘ └───────────┘ └──────────────┘ └──────────────────┘ │
│                                                                     │
│  All integrations skip gracefully if not configured ⏭️              │
└─────────────────────────────────────────────────────────────────────┘
```

## Pipeline Flow

```
feature/* ──► PR ──► develop ──► DEV ──► INT ──► QA
                          │
     release/* ──────────► STAGE ──► DAST ──► approval ──► PROD ──► Git Tag
                          │
     hotfix/*  ──────────────────────────────► approval ──► PROD ──► Git Tag
```

Each pipeline runs:
1. **Build** — compile, test, coverage, upload artifact
2. **Security** — 5 parallel scans (SAST, SCA, secrets, container, SBOM) + security gate
3. **Deploy** — progressive promotion through environments
4. **DAST** — OWASP ZAP against staging (release branches)
5. **Release** — git tag on successful production deployment
6. **Summary** — full pipeline audit trail with rich job summaries

## Dual Logging

Every pipeline event is logged to **two places**:

| Destination | Always Works | Purpose |
|-------------|-------------|---------|
| **GitHub Actions Job Summary** | Yes | Rich markdown tables and emoji in every workflow run. Primary audit trail. Free, no setup. |
| **Splunk HEC** | Optional | Centralized cross-repo visibility. Skips silently if `SPLUNK_HEC_URL` not set. |

Plus a JSON lines audit trail (`.forgeops/events.json`) uploaded as an artifact with 365-day retention.

## Graceful Skip

**All integrations skip gracefully when not configured.** Pipelines never fail because a tool isn't set up.

| Integration | Required Secrets | If Not Configured |
|-------------|-----------------|-------------------|
| SonarQube | `SONAR_HOST_URL`, `SONAR_TOKEN` | Logs "⏭️ SonarQube not configured — skipping SAST" |
| Black Duck | `BLACKDUCK_URL`, `BLACKDUCK_TOKEN` | Logs skip + suggests OWASP Dependency-Check |
| Jira | `JIRA_URL`, `JIRA_TOKEN` | Skips ticket transitions |
| Cherwell | `CHERWELL_URL`, `CHERWELL_CLIENT_ID`, `CHERWELL_CLIENT_SECRET` | Skips CR creation |
| ServiceNow | `SERVICENOW_URL`, `SERVICENOW_USER`, `SERVICENOW_PASSWORD` | Skips CR creation |
| Splunk | `SPLUNK_HEC_URL`, `SPLUNK_HEC_TOKEN` | Skips HEC send (summary still written) |
| Slack | `SLACK_WEBHOOK_URL` | Skips notification |
| SSH Deploy | `DEPLOY_SSH_KEY`, `*_DEPLOY_HOST` | Logs dry run with artifact listing |

## Environments

| Environment | Branch | Auto-Deploy | Approval | Jira Status |
|-------------|--------|-------------|----------|-------------|
| **DEV** | `develop` | Yes | No | In Development |
| **INT** | `develop` | After DEV | No | In Integration |
| **QA** | `develop` | After INT | No | In QA |
| **STAGE** | `release/*` | Yes | No | In Staging |
| **PROD** | `release/*`, `hotfix/*` | No | **Yes** | Done |

## Setup

### 1. Create GitHub Environments

In **Settings > Environments**, create: `dev`, `int`, `qa`, `stage`, `prod`.

Set **required reviewers** on `prod` (and optionally `stage`).

### 2. Add Secrets (as needed)

Add any of these to enable the corresponding integration. All are optional — pipelines work without any:

| Secret | Integration |
|--------|------------|
| `SONAR_HOST_URL` + `SONAR_TOKEN` | SonarQube SAST |
| `BLACKDUCK_URL` + `BLACKDUCK_TOKEN` | Black Duck SCA |
| `JIRA_URL` + `JIRA_TOKEN` + `JIRA_PROJECT` | Jira automation |
| `CHERWELL_URL` + `CHERWELL_CLIENT_ID` + `CHERWELL_CLIENT_SECRET` | Cherwell ITSM |
| `SERVICENOW_URL` + `SERVICENOW_USER` + `SERVICENOW_PASSWORD` | ServiceNow ITSM |
| `SPLUNK_HEC_URL` + `SPLUNK_HEC_TOKEN` | Splunk logging |
| `SLACK_WEBHOOK_URL` | Slack notifications |
| `DEPLOY_SSH_KEY` + `DEPLOY_SSH_USER` | SSH deployment |
| `DEV_DEPLOY_HOST` / `INT_DEPLOY_HOST` / etc. | Per-env SSH hosts |

### 3. Copy Workflows to App Repos

Copy `.github/workflows/` and `scripts/` to each application repository. Choose the pipeline:

| App Type | Workflow |
|----------|---------|
| Java web apps (WAR/JAR) | `java-webapp.yml` |
| JavaScript/React/Angular | `javascript-webapp.yml` |
| UiPath RPA processes | `uipath-rpa.yml` |
| Backend services (Java) | `system-integration.yml` |

### 4. Update APP_NAME

Edit the `env.APP_NAME` in the chosen workflow file.

### 5. Push to develop

```bash
git checkout -b develop
git push origin develop
```

The pipeline runs automatically.

## Branching Strategy (GitFlow)

| Branch | Purpose | Deploys To |
|--------|---------|------------|
| `feature/*` | New features | PR to develop |
| `develop` | Integration | DEV → INT → QA |
| `release/*` | Release candidates | STAGE → PROD |
| `hotfix/*` | Production fixes | PROD (fast-track) |
| `main` | Production state | Tagged releases |

## Approval Process

Production deployments use **GitHub Environment Protection Rules**:

1. Pipeline reaches the `prod` job
2. GitHub pauses and notifies required reviewers
3. Reviewers approve/reject in the Actions UI
4. On approval, deploy proceeds
5. Cherwell/ServiceNow CR auto-updated

No Jenkins manual approvals. No separate systems. Everything in GitHub.

## Security Pipeline

5 parallel scans + gate:

| Tool | Type | What It Does |
|------|------|-------------|
| **SonarQube** | SAST | Static code analysis, quality gates |
| **Black Duck** | SCA | Open-source vulnerability & license |
| **Gitleaks** | Secrets | Exposed secrets in git history |
| **Trivy** | Container | Image vulnerability scan (optional) |
| **Syft** | SBOM | Software bill of materials (CycloneDX) |

**Security Gate** aggregates all results. CRITICAL/HIGH findings block deployment.

## Feature Origin Map

| ForgeOps Feature | CloudBees Jenkins | Harness.io | CircleCI |
|-----------------|-------------------|------------|----------|
| Reusable workflows | Shared libraries | Templates | Orbs |
| Environment protection | Input step | Approval stages | Manual approval |
| GitHub Secrets | Credentials store | Secrets manager | Contexts |
| Job summaries | Build description | Dashboard | Insights |
| Self-hosted runners | Jenkins agents | Delegates | Self-hosted runner |
| Artifact upload | Stash/unstash | Artifact server | Workspaces |
| Branch-based deploy | Multibranch | Triggers | Branch filters |
| Security gate | Quality gate plugin | OPA policies | Security orb |
| Dual logging | Splunk plugin | Log service | — |
| ITSM integration | Cherwell plugin | ServiceNow step | — |

## Repository Structure

```
ForgeOps/
├── .github/workflows/
│   ├── _security-scan.yml        # Reusable: 5 parallel security scans + gate
│   ├── _deploy.yml               # Reusable: multi-method deploy + ITSM + health
│   ├── java-webapp.yml           # Full pipeline for Java web apps
│   ├── javascript-webapp.yml     # Full pipeline for JS web apps
│   ├── uipath-rpa.yml            # Full pipeline for UiPath RPA
│   └── system-integration.yml    # Full pipeline for backend services
├── scripts/
│   ├── forgeops-log.sh           # Dual logging engine (Summary + Splunk)
│   ├── forgeops-summary.sh       # Final pipeline summary generator
│   ├── jira-integration.py       # Jira ticket/transition automation
│   ├── cherwell-integration.py   # Cherwell/ServiceNow CR automation
│   ├── cherwell-health-check.sh  # ITSM connectivity test
│   ├── setup-runner.sh           # Linux self-hosted runner setup
│   └── setup-runner-windows.ps1  # Windows self-hosted runner setup
├── docs/
│   ├── ENVIRONMENTS.md           # Environment matrix & branch mapping
│   ├── MIGRATION-TO-SELF-HOSTED.md  # How to switch from hosted to self-hosted
│   ├── BACKLOG.md                # Future work items
│   └── CHERWELL-SETUP.md        # ITSM setup guide
├── .gitignore
└── README.md
```
