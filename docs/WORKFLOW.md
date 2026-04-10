# ForgeOps Workflow

## Branch Strategy
| Branch    | Environment | Trigger         | Approval   |
|-----------|-------------|-----------------|------------|
| feature/* | --          | push            | none       |
| develop   | INT         | merge PR        | 1 reviewer |
| release/* | QA          | merge PR        | tech lead  |
| main      | STAGE       | merge PR        | 2 reviewers|
| tag v*    | PROD        | manual dispatch | release eng|

## 10-Step Pipeline Flow
1. Developer creates feature branch, pushes code
2. CI runs: lint, unit test, SAST scan -- Jira set to "Ready for Unit Testing"
3. Developer creates PR to develop -- email sent to reviewers
4. PR merged to develop -- deploy to INT -- Jira set to "In INT"
5. Tech lead creates PR to release branch -- QA notified via email
6. PR merged to release -- deploy to QA -- Jira set to "Ready for SIT"
7. QA signs off -- PR created to main -- Teams notification sent
8. PR merged to main -- deploy to STAGE -- Jira set to "Ready for UAT"
9. UAT signs off -- release engineer creates tag -- approval required
10. Tag created -- deploy to PROD -- Jira set to "Deployed" -- all stakeholders emailed

## Notifications
- Email: build failures, deployment success/failure, PR reviews needed
- Teams: production deployments, critical failures, weekly DORA report
- Splunk: all pipeline logs forwarded for audit
