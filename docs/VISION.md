# ForgeOps — Vision

## What is ForgeOps?
ForgeOps is an enterprise DevSecOps platform built on GitHub Actions. It replaces CloudBees Jenkins with a modern, automated, and secure CI/CD pipeline framework that requires zero scripting knowledge from its users.

## Mission
Make every software release fast, safe, and auditable — without requiring developers or release engineers to write scripts or touch a command line.

## Core Principles
1. **GitHub is the platform** — no external servers, no Docker, no databases. GitHub Actions is the engine, GitHub Pages hosts the dashboard, GitHub API stores all data.
2. **Click, don't type** — release engineers promote code through environments using buttons, not git commands.
3. **Secure by default** — every commit is scanned (SAST, SCA, secrets, SBOM). Security gates block unsafe code automatically.
4. **Skip gracefully** — every integration (Jira, Splunk, Teams, Cherwell, SonarQube, Black Duck) works when configured and skips silently when not.
5. **Dual logging** — every event is logged to GitHub Actions Job Summary (always free) AND Splunk (when configured).
6. **One workflow, all technologies** — Java, JavaScript, UiPath, system integrations all follow the same flow: build → scan → INT → QA → STAGE → PROD.

## Architecture

```
┌──────────────────────────────────────────────────────────────┐
│                      GitHub Repository                        │
│  Reusable Workflows        Technology Pipelines              │
│  ├── _security-scan.yml    ├── java-webapp.yml               │
│  ├── _deploy.yml           ├── javascript-webapp.yml         │
│  ├── _notify.yml           ├── uipath-rpa.yml                │
│  ├── _validate-secrets     └── system-integration.yml        │
│  └── _rollback.yml                                           │
│  Dashboard (Pages)         Scripts (Jira, Cherwell, Splunk)  │
├──────────────────────────────────────────────────────────────┤
│  Runners: ubuntu-latest / windows-latest (self-hosted ready) │
├──────────────────────────────────────────────────────────────┤
│  Integrations (all optional, skip gracefully):               │
│  SonarQube · OWASP DC · Gitleaks · Trivy · Syft · Jira      │
│  Email · Teams · Splunk · Cherwell/ServiceNow                │
└──────────────────────────────────────────────────────────────┘
```

## Workflow

```
feature/* ──PR──► int ──PR──► qa ──PR──► stage ──PR──► main (prod)
              Tech Lead     Release Eng    Release Eng    2 Approvals
```

## Integrations

| Tool | Purpose | Status |
|------|---------|--------|
| GitHub Actions | CI/CD engine | Core (always active) |
| GitHub Copilot | AI code review | Enable at org level |
| SonarQube | SAST scanning | Optional (free CE) |
| Black Duck / OWASP DC | SCA scanning | Optional (OWASP DC is free) |
| Gitleaks | Secret detection | Always active (free) |
| Trivy | Container scanning | Optional |
| Syft | SBOM generation | Always active (free) |
| Jira | ALM / ticket tracking | Optional |
| Splunk | Centralized logging | Optional |
| Microsoft Teams | Chat notifications | Optional |
| Email (SMTP) | Job notifications | Optional |
| Cherwell / ServiceNow | Change management | Optional |

## Roadmap

### Phase 1 (Current): Foundation
### Phase 2: Self-Hosted Runners
### Phase 3: Advanced Security
### Phase 4: Self-Healing
### Phase 5: Enterprise Scale
