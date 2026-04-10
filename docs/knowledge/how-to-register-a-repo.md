# How to Register a Repo

## Steps
1. Open forgeops-config.json in the ForgeOps repo.
2. Find the project your repo belongs to (or create a new project entry).
3. Add the repo name to the "repos" array for that project.
4. Commit and push to main.
5. The dashboard data workflow will pick up the new repo within 15 minutes.

## Example
```json
"java-backend": {
  "repos": ["api-gateway", "user-service", "payment-service", "NEW-REPO-HERE"],
  "template": "java-webapp",
  "team": "Backend Team",
  "environments": ["int", "qa", "stage", "prod"]
}
```

## After Registration
- Copy the appropriate workflow template from templates/ to the new repo.
- Configure environment protection rules in the repo settings.
- Add CODEOWNERS file (use templates/CODEOWNERS.template as a starting point).
