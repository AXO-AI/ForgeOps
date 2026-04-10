# How to Read Security Results

## Scan Types
- **SAST** -- Static Application Security Testing (code analysis)
- **SCA** -- Software Composition Analysis (dependency vulnerabilities)

## Where to Find Results
1. Open the PR in GitHub
2. Click the "Checks" tab
3. Find the security scan job
4. Review the output log for findings

## Severity Levels
- **Critical** -- must fix before merge, blocks the pipeline
- **High** -- must fix before merge, blocks the pipeline
- **Medium** -- should fix, does not block
- **Low** -- informational, fix when possible

## What to Do
1. Review each finding and its description
2. Check if it is a true positive or false positive
3. Fix true positives in your code
4. For false positives, add a suppression comment with justification
5. Re-push to trigger a new scan

## Help
See [Troubleshooting](../TROUBLESHOOTING.md) or open a Support Request.
