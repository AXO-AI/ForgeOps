# ForgeOps Backlog

## Phase 1 — Core Platform (Complete ✅)

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

## Phase 1.5 — Gap Remediation (Complete ✅)

- [x] Fix script permissions (git executable bit)
- [x] Add workflow_dispatch triggers to all pipelines
- [x] Add secret validation workflow (_validate-secrets.yml)
- [x] Add scheduled secret health check with GitHub Issue creation
- [x] Add CODEOWNERS file
- [x] Add OWASP Dependency-Check as free SCA (when Black Duck not configured)
- [x] Add test result aggregation (dorny/test-reporter)
- [x] Add changelog generation + GitHub Releases on tag
- [x] Fix DAST to not require Docker (graceful skip on hosted runners)
- [x] Fix secret detection pattern (env var check, not direct secret reference)
- [x] Add chmod +x step in all workflow jobs
- [x] Dashboard v4: full API integration, search, toasts, keyboard shortcuts
- [x] Dashboard: proper <select> dropdowns for PR creation (not text inputs)
- [x] Dashboard: Deploy page with artifact management and environment promotion
- [x] Dashboard: loading skeletons and empty states
- [x] Dashboard: notification bell with counts
- [x] Dashboard: mobile responsive sidebar collapse
- [x] Dashboard: ErrorBoundary for crash recovery

## Phase 2 — Enhanced Security

- [x] OWASP Dependency-Check as free SCA alternative
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
- [ ] Replace PAT auth with GitHub OAuth App

## Immediate Next Steps

- [ ] Install SonarQube Community Edition (free, self-hosted)
- [ ] Sign up for Jira free tier (atlassian.com/software/jira/free)
- [ ] Ask IT about Splunk HEC access
- [ ] Ask IT about Black Duck license
- [ ] Ask IT about Cherwell/ServiceNow credentials
- [ ] Switch to self-hosted runners (see docs/MIGRATION-TO-SELF-HOSTED.md)
- [ ] Add drift detection scheduled workflow
- [ ] Build Splunk dashboard for pipeline metrics
- [ ] Add code coverage badges to repos

## Technical Debt

- [ ] Integration tests for all scripts (jira-integration.py, cherwell-integration.py)
- [ ] Mock API server for local development/testing
- [ ] Shellcheck linting for all .sh scripts
- [ ] Python type hints and mypy for all .py scripts
- [ ] Workflow validation CI (actionlint)
- [ ] Consolidate duplicate DAST job definition across pipelines into reusable workflow
