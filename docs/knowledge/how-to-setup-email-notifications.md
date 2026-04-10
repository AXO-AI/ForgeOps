# How to Setup Email Notifications

## Overview
Email notifications are sent on deploy success, deploy failure, and security findings.

## Configuration
1. Add these secrets to GitHub Org Secrets:
   - `EMAIL_SMTP_HOST` -- SMTP server address
   - `EMAIL_SMTP_PORT` -- SMTP port (typically 587)
   - `EMAIL_SMTP_USER` -- SMTP username
   - `EMAIL_SMTP_PASSWORD` -- SMTP password
   - `EMAIL_FROM_ADDRESS` -- sender address

2. Add recipient email addresses to `forgeops-config.json` under `email_groups`

## Notification Types
- **Deploy Success** -- sent to `deploy_notifications` group
- **Deploy Failure** -- sent to `platform_alerts` group
- **Security Alert** -- sent to `security_alerts` group

## Customization
Edit the email templates in the notify workflow to change the message format.

## Troubleshooting
- Verify SMTP credentials are correct
- Check that the SMTP host allows connections from GitHub runners
- Review the notify workflow logs for errors
