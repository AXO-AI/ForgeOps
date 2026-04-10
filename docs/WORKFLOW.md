# Workflow

## Branch Strategy

```
feature/* --> int --> qa --> stage --> main
```

## Flow

1. Developer creates a `feature/*` branch from `main`
2. Developer opens a PR targeting `int`
3. CI runs: build, unit tests, SAST, SCA, lint
4. Code review and approval by tech lead
5. Merge to `int` triggers auto-deploy to INT environment
6. QA team validates; PR opened to promote `int` to `qa`
7. QA approval triggers deploy to QA environment
8. UAT team validates; PR opened to promote `qa` to `stage`
9. Stage approval triggers deploy to Stage environment
10. Release engineer approves promotion to `main` (production)

## Approval Matrix

| Target      | Approver         |
|-------------|------------------|
| int         | tech_lead        |
| qa          | qa_team          |
| stage       | uat_team         |
| main (prod) | release_engineer |

## Hotfix Flow

1. Create `hotfix/*` branch from `main`
2. PR directly to `main` with expedited review
3. Back-merge to `int` after production deploy

## Rollback
See [ROLLBACK.md](ROLLBACK.md) for rollback procedures.
