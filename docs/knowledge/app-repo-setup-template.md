# App Repo Setup Template
Copy these files from ForgeOps to your app repo:

```
your-app/
├── .github/workflows/
│   ├── ci.yml              ← copy your tech template, rename
│   ├── _security-scan.yml  ← copy as-is
│   ├── _deploy.yml         ← copy as-is
│   └── _notify.yml         ← copy as-is
├── scripts/
│   ├── forgeops-log.sh     ← copy as-is
│   ├── forgeops-summary.sh ← copy as-is
│   ├── jira-integration.py ← copy as-is
│   └── cherwell-integration.py ← copy as-is
```

Then: edit APP_NAME in ci.yml, create branches (int, qa, stage), create Environments.
