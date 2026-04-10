# Troubleshooting

## Common Issues

### Pipeline fails at build step
- Check that all dependencies are declared in the build file
- Verify the correct runtime version is specified
- Review the build logs in the Actions tab

### Pipeline fails at security scan
- SAST findings block the PR if severity is High or Critical
- Review findings in the security scan output
- See [How to Read Security Results](knowledge/how-to-read-security-results.md)

### Deploy fails with permission error
- Verify secrets are configured in GitHub Org Secrets
- Check that the environment protection rules allow the deployer
- Confirm the service account has target environment access

### Notifications not sending
- Check the webhook URL secret is set and valid
- Verify the SMTP credentials for email
- Review the notify workflow logs

### Self-healing not triggering
- Confirm the cron schedule is active (every 6 hours)
- Check that the self-healing workflow is not disabled
- Review the self-heal workflow run history

## Getting Help

1. Check this guide and the [Knowledge Base](knowledge/)
2. Search existing [Issues](https://github.com/askboppana/ForgeOps/issues)
3. Open a [Support Request](https://github.com/askboppana/ForgeOps/issues/new?template=support-request.md)
