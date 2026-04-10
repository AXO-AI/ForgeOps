# How to Create a PR

## Steps

1. Create a feature branch from `main`: `git checkout -b feature/FORGE-123-description`
2. Make your changes and commit with a descriptive message
3. Push your branch: `git push origin feature/FORGE-123-description`
4. Open a PR targeting the `int` branch
5. Fill out the PR template completely
6. Include the Jira ticket ID in the PR title (e.g., `FORGE-123: Add user login`)
7. Request review from the appropriate tech lead
8. Wait for CI checks to pass (build, test, security scan)
9. Address any review comments
10. Once approved, merge the PR

## PR Title Format
```
FORGE-123: Short description of the change
```

## Tips
- Keep PRs small and focused on a single change
- Link the Jira ticket in the description
- Do not include secrets or credentials in code
