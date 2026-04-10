# ForgeOps Setup Guide

## Prerequisites
- GitHub organization or personal account
- GitHub Actions enabled
- At least one repository with code to deploy

## Step 1: Clone ForgeOps (5 minutes)
The ForgeOps repo contains all workflow templates, scripts, and the dashboard.

## Step 2: Register a repository (10 minutes per repo)
1. Create branches: `int`, `qa`, `stage` (main already exists)
2. Copy workflow files from ForgeOps to `.github/workflows/`
3. Copy `scripts/` folder
4. Edit `ci.yml` — change `APP_NAME`
5. Create GitHub Environments (int, qa, stage, prod)
6. Push — pipeline runs automatically

## Step 3: Configure integrations
Add as GitHub Organization Secrets:

### Email notifications
| Secret | Example |
|--------|---------|
| SMTP_SERVER | smtp.office365.com |
| SMTP_PORT | 587 |
| SMTP_USERNAME | svc-forgeops@company.com |
| SMTP_PASSWORD | (service account password) |
| NOTIFY_EMAIL_TO | team@company.com |

### Teams notifications
| Secret | How to get |
|--------|-----------|
| TEAMS_WEBHOOK | Teams → channel → Connectors → Incoming Webhook |

### Jira (optional)
| Secret | How to get |
|--------|-----------|
| JIRA_URL | https://yourcompany.atlassian.net |
| JIRA_TOKEN | Jira → Profile → Personal Access Tokens |

### SonarQube (optional, free)
| Secret | How to get |
|--------|-----------|
| SONAR_HOST_URL | http://sonar.internal:9000 |
| SONAR_TOKEN | SonarQube → My Account → Security |

### Splunk (optional)
| Secret | How to get |
|--------|-----------|
| SPLUNK_HEC_URL | https://splunk.internal:8088 |
| SPLUNK_HEC_TOKEN | Splunk → Settings → HEC |

## Step 4: Install VS Code extensions
1. GitHub Actions (by GitHub)
2. GitHub Copilot (by GitHub)
3. GitHub Pull Requests (by GitHub)

## Step 5: Access the dashboard
https://askboppana.github.io/ForgeOps
