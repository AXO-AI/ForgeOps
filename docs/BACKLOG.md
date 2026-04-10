# ForgeOps Backlog

## Phase 1 — Core Platform (Current)

- [x] Reusable security scan workflow (_security-scan.yml)
- [x] Reusable deploy workflow (_deploy.yml)
- [x] Java web app pipeline
- [x] JavaScript web app pipeline
- [x] UiPath RPA pipeline
- [x] System integration pipeline
- [x] Dual logging (GitHub Actions Summary + Splunk)
- [x] Graceful skip for all integrations
- [x] Jira integration (create-ticket, transition, set-fix-version)
- [x] Cherwell/ServiceNow integration (create-cr, update-cr)
- [x] Splunk HEC logging
- [x] Slack notifications
- [x] Self-hosted runner setup scripts (Linux + Windows)
- [x] Pipeline audit trail (events.json artifact)

## Phase 2 — Enhanced Security

- [ ] OWASP Dependency-Check as free SCA alternative (when Black Duck not configured)
- [ ] CodeQL integration for GitHub-native SAST
- [ ] Snyk integration option
- [ ] SARIF upload to GitHub Security tab
- [ ] License compliance reporting from SBOM
- [ ] Vulnerability database auto-update for Trivy/Gitleaks
- [ ] Security scan result caching (skip unchanged files)

## Phase 3 — Deployment Enhancements

- [ ] Blue/green deployment support for SSH
- [ ] Canary deployment with traffic shifting (ArgoCD Rollouts)
- [ ] Database migration step (Flyway/Liquibase)
- [ ] Smoke test framework post-deploy
- [ ] Deployment windows (block deploys outside approved times)
- [ ] Multi-region deployment support
- [ ] Rollback to specific version (not just previous)

## Phase 4 — Observability & Compliance

- [ ] Grafana dashboard for pipeline metrics
- [ ] SLA tracking (time from commit to prod)
- [ ] DORA metrics calculation (deployment frequency, lead time, MTTR, change failure rate)
- [ ] Audit log retention to S3/Azure Blob
- [ ] SOC 2 evidence collection automation
- [ ] Change Advisory Board (CAB) integration workflow

## Phase 5 — Platform Expansion

- [ ] Python web app pipeline (Django/Flask)
- [ ] .NET pipeline (dotnet build/test)
- [ ] Mobile app pipeline (React Native / Flutter)
- [ ] Infrastructure as Code pipeline (Terraform/Pulumi)
- [ ] Shared library / package publishing pipeline (Maven Central, npm, NuGet)
- [ ] Monorepo support (detect changed services, build only affected)
- [ ] Matrix builds for multi-version testing

## Phase 6 — Developer Experience

- [ ] CLI tool (`forgeops init`) to bootstrap new repos with correct workflow
- [ ] PR comment bot with pipeline status summary
- [ ] Auto-labeling PRs based on changed files
- [ ] Dependency update automation (Renovate/Dependabot config)
- [ ] Branch protection rule automation script
- [ ] GitHub App for centralized ForgeOps management

## Technical Debt

- [ ] Integration tests for all scripts (jira-integration.py, cherwell-integration.py)
- [ ] Mock API server for local development/testing
- [ ] Shellcheck linting for all .sh scripts
- [ ] Python type hints and mypy for all .py scripts
- [ ] Workflow validation CI (actionlint)
- [ ] Consolidate duplicate DAST job definition across pipelines into reusable workflow
