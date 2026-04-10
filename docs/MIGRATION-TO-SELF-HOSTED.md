# Migration to Self-Hosted Runners

## Why Self-Hosted

- Faster builds with persistent caches
- Access to internal network resources
- Custom tooling pre-installed
- Cost savings at scale

## Prerequisites

- Linux VM (Ubuntu 22.04+) or container host
- Network access to GitHub and internal registries
- Service account with appropriate permissions

## Steps

1. Provision runner VM or container
2. Install the GitHub Actions runner agent
3. Register the runner with the ForgeOps organization
4. Apply labels: `self-hosted`, `linux`, `x64`
5. Update workflow files to use `runs-on: [self-hosted, linux]`
6. Test with a non-production workflow first
7. Roll out to all pipelines

## Runner Maintenance

- Auto-update is enabled by default
- Monitor runner health via the dashboard
- Self-healing workflow restarts offline runners every 6 hours

## Rollback to GitHub-Hosted

Change `runs-on` back to `ubuntu-latest` in workflow files and push.
