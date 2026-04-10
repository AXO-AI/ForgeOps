# How to Setup Teams Notifications

## Overview
Microsoft Teams notifications are sent via incoming webhooks for pipeline events.

## Configuration
1. In Teams, create an Incoming Webhook connector in your target channel
2. Copy the webhook URL
3. Add the URL as `TEAMS_WEBHOOK_URL` in GitHub Org Secrets

## Notification Events
- Pipeline started
- Deploy succeeded
- Deploy failed
- Security findings detected
- Self-healing triggered

## Message Format
Notifications include:
- Repository name
- Branch and environment
- Status (success/failure)
- Link to the workflow run
- Timestamp

## Troubleshooting
- Verify the webhook URL is valid and the connector is active
- Check that the Teams channel allows incoming webhooks
- Review the notify workflow logs for HTTP errors
