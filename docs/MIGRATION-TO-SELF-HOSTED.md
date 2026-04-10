# Migration to Self-Hosted Runners

ForgeOps workflows are currently configured with GitHub-hosted runners (`ubuntu-latest` / `windows-latest`). When you're ready to switch to self-hosted runners on your own Linux and Windows servers, follow this guide.

## Why Self-Hosted?

- **Corporate network access**: Deploy to internal servers via SSH without exposing them to the internet
- **Pre-installed tools**: SonarQube scanner, Black Duck Detect, UiPath CLI already available
- **Performance**: Persistent caches, faster builds for large codebases
- **Compliance**: Code never leaves your network

## Step 1: Install Runners

### Linux (build, security, deploy)

```bash
sudo ./scripts/setup-runner.sh \
  --url https://github.com/YOUR_ORG \
  --token RUNNER_REG_TOKEN \
  --labels "linux,build,security,deploy" \
  --name runner-linux-01
```

### Windows (UiPath)

```powershell
.\scripts\setup-runner-windows.ps1 `
  -Url https://github.com/YOUR_ORG `
  -Token RUNNER_REG_TOKEN `
  -Labels "windows,uipath" `
  -Name runner-win-01
```

## Step 2: Update Workflow Files

Replace `runs-on: ubuntu-latest` with self-hosted labels:

### Bulk replacement (all workflows)

```bash
# Build jobs
sed -i 's/runs-on: ubuntu-latest  # build/runs-on: [self-hosted, linux, build]/g' .github/workflows/*.yml

# Security jobs
sed -i 's/runs-on: ubuntu-latest  # security/runs-on: [self-hosted, linux, security]/g' .github/workflows/*.yml

# Deploy jobs
sed -i 's/runs-on: ubuntu-latest  # deploy/runs-on: [self-hosted, linux, deploy]/g' .github/workflows/*.yml

# All remaining ubuntu-latest
sed -i 's/runs-on: ubuntu-latest/runs-on: [self-hosted, linux]/g' .github/workflows/*.yml

# Windows (UiPath)
sed -i 's/runs-on: windows-latest/runs-on: [self-hosted, windows, uipath]/g' .github/workflows/*.yml
```

### Per-workflow mapping

| Workflow | Current | Self-Hosted |
|----------|---------|-------------|
| Build jobs | `ubuntu-latest` | `[self-hosted, linux, build]` |
| Security scan jobs | `ubuntu-latest` | `[self-hosted, linux, security]` |
| Deploy jobs | `ubuntu-latest` | `[self-hosted, linux, deploy]` |
| UiPath build | `windows-latest` | `[self-hosted, windows, uipath]` |
| Pipeline summary | `ubuntu-latest` | `[self-hosted, linux]` |

## Step 3: Remove Tool Installation Steps

Self-hosted runners have tools pre-installed. You can remove these steps from `_security-scan.yml`:

```yaml
# Remove these — already installed on self-hosted runners:
# - name: Install Gitleaks
# - name: Install Trivy
# - name: Install Syft
```

## Step 4: Verify

1. Push a test commit to `develop`
2. Check that jobs pick up on your self-hosted runners
3. Verify all security tools work
4. Test a deployment to DEV

## Rollback

If self-hosted runners have issues, revert to GitHub-hosted:

```bash
sed -i 's/runs-on: \[self-hosted.*\]/runs-on: ubuntu-latest/g' .github/workflows/*.yml
sed -i 's/runs-on: \[self-hosted, windows.*\]/runs-on: windows-latest/g' .github/workflows/*.yml
```
