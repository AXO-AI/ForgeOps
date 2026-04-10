# App Repo Setup Template

## Checklist for onboarding a new application repository

### 1. Repository Configuration
- [ ] Repository created in the ForgeOps GitHub organization
- [ ] Default branch set to `main`
- [ ] Branch protection enabled on `main`, `stage`, `qa`, `int`
- [ ] CODEOWNERS file added (copy from `templates/CODEOWNERS.template`)

### 2. Platform Registration
- [ ] Repo added to `forgeops-config.json`
- [ ] Technology stack specified (Java, .NET, Node.js, Python)
- [ ] Team members and roles assigned

### 3. Secrets
- [ ] Deployment credentials added to GitHub Secrets
- [ ] Environment-specific variables configured

### 4. Environments
- [ ] GitHub Environments created (int, qa, stage, prod)
- [ ] Protection rules configured with required approvers

### 5. Branches
- [ ] `int` branch created
- [ ] `qa` branch created
- [ ] `stage` branch created

### 6. Verification
- [ ] Test PR opened to `int` branch
- [ ] Pipeline runs successfully (build, test, security, deploy)
- [ ] Notifications received (email and/or Teams)
