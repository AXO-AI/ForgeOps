# ForgeOps - Enterprise DevSecOps Platform

GitHub Actions CI/CD replacing Jenkins. Security scanning, Jira sync, email + Teams notifications, and approval gates - fully automated. No Docker, no scripts, no command line.

**Dashboard:** https://askboppana.github.io/ForgeOps

## Quick Start
1. Create branches in your app repo: int, qa, stage (main exists)
2. Copy workflows + scripts from this repo
3. Edit APP_NAME in ci.yml
4. Create GitHub Environments: int, qa, stage, prod
5. Push - pipeline runs automatically

## Workflow
```
feature/* --PR--> int --PR--> qa --PR--> stage --PR--> main (prod)
           Tech Lead    Release Eng   Release Eng    2 Approvals
```
Each promotion: build > scan > deploy > Jira > email > Teams > Splunk.

## Command Center
forgeops-config.json defines all projects, repos, teams, and templates. The generate-dashboard-data workflow fetches status every 15 min. Create issues with label forgeops-dispatch for bulk operations.

## Integrations (all skip gracefully)
| Tool | Status |
|------|--------|
| Gitleaks + Syft | Always active (free) |
| OWASP Dep-Check | Active (free SCA fallback) |
| SonarQube | Add SONAR_HOST_URL + SONAR_TOKEN |
| Jira | Add JIRA_URL + JIRA_TOKEN |
| Email | Add SMTP_SERVER + credentials |
| Teams | Add TEAMS_WEBHOOK |
| Splunk | Add SPLUNK_HEC_URL + SPLUNK_HEC_TOKEN |
| Cherwell | Add CHERWELL_URL + credentials |

## Support
Create an issue: https://github.com/askboppana/ForgeOps/issues/new/choose

## Docs
See docs/ folder and docs/knowledge/ for articles.

## License
MIT
