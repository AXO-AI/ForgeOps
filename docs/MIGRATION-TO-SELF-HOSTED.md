# Migrating to Self-Hosted Runners

## When to Migrate
- Corporate network access needed (Cherwell, SonarQube, deploy servers)
- Faster builds with dedicated hardware
- Windows runners for UiPath

## Steps
1. Linux: `bash scripts/setup-runner.sh --url https://github.com/yourorg --token TOKEN --labels build,security,deploy`
2. Windows: `.\scripts\setup-runner-windows.ps1 -Url "https://github.com/yourorg" -Token "TOKEN"`
3. Replace `ubuntu-latest` with `[self-hosted, linux, build]` in workflow files
4. Replace `windows-latest` with `[self-hosted, windows, uipath]`

## Quick Replace
```bash
sed -i 's/runs-on: ubuntu-latest/runs-on: [self-hosted, linux, build]/g' .github/workflows/*.yml
```
