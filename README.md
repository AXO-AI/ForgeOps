# ForgeOps — Enterprise DevSecOps Platform

GitHub Actions-based CI/CD replacing CloudBees Jenkins. No Docker, no external servers. Release engineers promote code through environments using buttons — no scripts, no git knowledge needed.

**Dashboard:** [askboppana.github.io/ForgeOps](https://askboppana.github.io/ForgeOps)

## Quick Start
1. Create branches in your app repo: `int`, `qa`, `stage`
2. Copy workflows + scripts from this repo
3. Edit `APP_NAME` in `ci.yml`
4. Create GitHub Environments: `int`, `qa`, `stage`, `prod`
5. Push → pipeline runs. See [Setup Guide](docs/SETUP.md).

## Workflow
```
feature/* ──PR──► int ──PR──► qa ──PR──► stage ──PR──► main (prod)
              Tech Lead     Release Eng    Release Eng    2 Approvals
```
Each promotion: build → scan → deploy → Jira → email → Teams → Splunk.

## Integrations (all skip gracefully if not configured)
| Tool | Status | Enable |
|------|--------|--------|
| Gitleaks + Syft | ✅ Always active | Free, no setup |
| OWASP Dep-Check | ✅ Active | Free SCA fallback |
| SonarQube | ⏭️ Optional | Add SONAR_HOST_URL + SONAR_TOKEN |
| Jira | ⏭️ Optional | Add JIRA_URL + JIRA_TOKEN |
| Email | ⏭️ Optional | Add SMTP_SERVER + credentials |
| Teams | ⏭️ Optional | Add TEAMS_WEBHOOK |
| Splunk | ⏭️ Optional | Add SPLUNK_HEC_URL + SPLUNK_HEC_TOKEN |
| Cherwell | ⏭️ Optional | Add CHERWELL_URL + credentials |

## File Structure
```
ForgeOps/
├── .github/workflows/       # 13 workflow files
├── .github/ISSUE_TEMPLATE/  # 4 support templates
├── dashboard/index.html     # Preact dashboard (GitHub Pages)
├── scripts/                 # 7 automation scripts
├── docs/                    # 10 docs + 12 knowledge articles
├── templates/               # App repo templates
└── README.md
```

## Documentation
| Doc | For |
|-----|-----|
| [Vision](docs/VISION.md) | What ForgeOps is |
| [Workflow](docs/WORKFLOW.md) | 10-step dev-to-prod |
| [Setup](docs/SETUP.md) | How to onboard a repo |
| [Environments](docs/ENVIRONMENTS.md) | Branch → env mapping |
| [Troubleshooting](docs/TROUBLESHOOTING.md) | Common issues |
| [Knowledge Base](docs/knowledge/) | 12 how-to articles |

## Support
[Create an issue](https://github.com/askboppana/ForgeOps/issues/new/choose) using the templates.

## License
MIT
