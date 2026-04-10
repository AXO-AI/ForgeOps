# Security Policy

## Reporting Vulnerabilities
Create an issue using the "Security Vulnerability" template. Do NOT post details in public channels.

## Security Practices
- Secrets stored in GitHub Organization Secrets (encrypted at rest)
- PAT tokens in browser sessionStorage only (cleared on tab close)
- CSP headers on dashboard prevent XSS
- No secrets ever logged or written to artifacts
- Dependabot auto-updates GitHub Actions dependencies
- Self-healing workflow checks integrity every 6 hours
