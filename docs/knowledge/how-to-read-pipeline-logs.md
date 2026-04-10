# How to Read Pipeline Logs

## Accessing Logs
1. Go to the repository in GitHub
2. Click the "Actions" tab
3. Select the workflow run you want to inspect
4. Click on the job name to expand it
5. Click on individual steps to see their logs

## Log Structure
Each pipeline run has these stages:
- **Checkout** -- clones the code
- **Build** -- compiles the application
- **Test** -- runs unit tests
- **Security Scan** -- SAST and SCA analysis
- **Deploy** -- deploys to the target environment
- **Notify** -- sends notifications

## Finding Errors
- Failed steps are marked with a red X
- Expand the failed step to see the error message
- Search the log output for "error" or "failed"

## Tips
- Download the full log using the gear icon at the top right
- Logs are retained for 90 days
- Splunk receives a copy of all pipeline logs for long-term storage
