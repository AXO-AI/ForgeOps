# Cherwell Integration Setup

## Overview

Cherwell is used for change management. Production deployments require a Cherwell change ticket.

## Configuration

1. Obtain a Cherwell API key from the service desk team
2. Add the following secrets to GitHub Org Secrets:
   - `CHERWELL_API_URL` -- Cherwell instance URL
   - `CHERWELL_API_KEY` -- API authentication key
   - `CHERWELL_TEMPLATE_ID` -- change request template ID

## How It Works

1. When a production promotion is approved, the pipeline creates a Cherwell change ticket
2. The ticket is auto-populated with deployment details (version, environment, approver)
3. On successful deploy, the ticket is closed with status "Completed"
4. On failure or rollback, the ticket is updated with status "Failed"

## Manual Ticket Creation

If automatic creation fails:
1. Log into Cherwell
2. Create a new Change Request using the ForgeOps template
3. Fill in the deployment details
4. Link the ticket ID in the PR description

## Troubleshooting

- Verify the API URL and key are correct
- Check that the template ID exists in Cherwell
- Review the deploy workflow logs for Cherwell API errors
