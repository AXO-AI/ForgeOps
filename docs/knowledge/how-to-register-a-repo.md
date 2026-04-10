# How to Register a Repo

## Steps

1. Open `forgeops-config.json` in the ForgeOps repo
2. Add your repository entry under the appropriate section
3. Copy `templates/CODEOWNERS.template` to your repo root as `CODEOWNERS`
4. Configure branch protection rules on `main`, `stage`, `qa`, `int`
5. Set up GitHub Environments (int, qa, stage, prod) with protection rules
6. Add required secrets to GitHub Org Secrets or repo-level secrets
7. Open a PR to ForgeOps with your config changes
8. Once merged, your repo is active on the platform

## Required Information
- Repository name and URL
- Technology stack (Java, .NET, Node.js, Python)
- Team members and their roles
- Deployment targets per environment
