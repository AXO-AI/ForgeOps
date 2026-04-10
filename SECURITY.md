# Security Policy

## Reporting

Use the **Security Vulnerability** issue template to report any security concerns.
All reports are triaged within 24 hours.

## Practices

- Secrets stored in GitHub Org Secrets (encrypted at rest)
- No secrets logged or included in artifacts
- Dependabot auto-updates GitHub Actions dependencies
- Self-healing checks run every 6 hours
- SAST and SCA scans on every pull request
- Container image scanning before deployment
- Branch protection enforced on all environments
