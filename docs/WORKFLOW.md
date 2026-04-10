# ForgeOps Development Workflow

## Branch Strategy

| Branch | Purpose | Deploys to | Triggered by |
|--------|---------|-----------|-------------|
| feature/* | Developer work | None (CI only) | Developer push |
| int | Integration testing | INT environment | Merge from feature |
| qa | System integration testing | QA environment | Merge from int |
| stage | User acceptance testing | STAGE environment | Merge from qa |
| main | Production | PROD environment | Merge from stage (2 approvals) |

## Step-by-Step Workflow

### Step 1: Developer creates feature branch
Branch from `int`: `feature/JIRA-123-short-description`

### Step 2: Developer pushes code
CI runs: build → unit tests → SCA → SAST → secret scan → SBOM

### Step 3: PR to INT
Developer creates PR: feature → int. Tech Lead reviews + approves.

### Step 4: Deploy to INT
Auto-deploy on merge. Jira → "Ready for Unit Testing". Email → developer.

### Step 5: Unit testing
Developer tests in INT. Marks "Unit Testing Complete" on dashboard.

### Step 6: Promote to QA
Release Engineer: PR int → qa. Auto-deploy. Jira → "Ready for SIT". Email → QA team.

### Step 7: SIT in QA
QA team tests. Marks "SIT Complete" on dashboard.

### Step 8: Promote to STAGE
Release Engineer: PR qa → stage. Auto-deploy. Jira → "Ready for UAT". Email → UAT team.

### Step 9: UAT in STAGE
UAT team tests. Marks "UAT Complete" on dashboard.

### Step 10: Deploy to PRODUCTION
Release Engineer: PR stage → main. 2 approvals required. Auto-deploy. Jira → "Deployed to Production". Email → all stakeholders. Git tag + GitHub Release created.
