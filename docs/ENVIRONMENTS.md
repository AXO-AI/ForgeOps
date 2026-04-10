# ForgeOps Environments

## Environment Matrix

| Environment | Branch | Auto-deploy | Approval | Jira Status | Email To | Teams Channel |
|-------------|--------|------------|----------|-------------|----------|---------------|
| INT | int | Yes | None | Ready for Unit Testing | Developer | dev-channel |
| QA | qa | Yes | None | Ready for SIT | QA Team | qa-channel |
| STAGE | stage | Yes | Optional (1) | Ready for UAT | UAT Team | uat-channel |
| PROD | main | Yes | Required (2) | Deployed to Production | All | releases |

**Note:** "Unit Testing Complete", "SIT Complete", and "UAT Complete" are set manually by the testing teams from the ForgeOps dashboard.

## Jira Status Flow

```
Backlog → In Development → Ready for Unit Testing → Unit Testing Complete →
Ready for SIT → SIT Complete → Ready for UAT → UAT Complete → Deployed to Production
```

## GitHub Environment Setup

| Environment | Reviewers | Deployment Branches |
|-------------|-----------|---------------------|
| int | None | int |
| qa | None | qa |
| stage | 1 (optional) | stage |
| prod | 2 (required), 15 min wait | main |
