# How to Register a Repository in ForgeOps
1. Create branches: `git checkout -b int && git push origin int` (repeat for qa, stage)
2. Copy from ForgeOps: `.github/workflows/ci.yml` (pick your tech template) + `_security-scan.yml` + `_deploy.yml` + `_notify.yml`
3. Copy `scripts/` folder
4. Edit `ci.yml` → change `APP_NAME` to your app name
5. Create GitHub Environments: int, qa, stage, prod (Settings → Environments)
6. Push → pipeline runs automatically
