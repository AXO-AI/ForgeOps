# How to Promote to Production

## Promotion Path
```
int --> qa --> stage --> main (production)
```

## Steps

1. Verify your change is deployed and tested in INT
2. Open a PR from `int` to `qa` for QA promotion
3. QA team validates and approves the PR
4. Merge triggers deploy to QA environment
5. After QA sign-off, open a PR from `qa` to `stage`
6. UAT team validates and approves
7. Merge triggers deploy to Stage environment
8. After UAT sign-off, open a PR from `stage` to `main`
9. Release engineer approves the production promotion
10. Merge triggers production deploy with Cherwell ticket creation

## Requirements
- All CI checks must pass at each stage
- Appropriate approver must sign off
- No critical security findings
- Cherwell change ticket auto-created for production
