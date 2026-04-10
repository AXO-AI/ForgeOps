# ForgeOps - Enterprise DevSecOps Platform

GitHub Actions CI/CD platform replacing legacy Jenkins pipelines. Supports Java/Maven, .NET, Node.js, and Python with reusable workflows, self-healing, and DORA metrics.

## Quick Start

1. Clone this repository
2. Copy `templates/CODEOWNERS.template` to your app repo as `CODEOWNERS`
3. Register your repo in `forgeops-config.json`
4. Create a feature branch and push your code
5. Open a PR -- the pipeline runs automatically

## Workflow

```
feature --> int --> qa --> stage --> main (production)
```

Each promotion requires approval from the appropriate role. Rollback is available at every stage.

## Dashboard

[https://askboppana.github.io/ForgeOps](https://askboppana.github.io/ForgeOps)

Light theme by default with 4 switchable themes (light, dark, cobalt, dracula).

## File Structure

```
ForgeOps/
  .github/
    ISSUE_TEMPLATE/       # Issue templates (support, bug, feature, security)
    PULL_REQUEST_TEMPLATE.md
    dependabot.yml
  docs/
    knowledge/            # 12 how-to articles
    VISION.md
    WORKFLOW.md
    ENVIRONMENTS.md
    SETUP.md
    TROUBLESHOOTING.md
    ROLLBACK.md
    MIGRATION-TO-SELF-HOSTED.md
    CHERWELL-SETUP.md
    BACKLOG.md
  templates/
    CODEOWNERS.template
  forgeops-config.json
  CHANGELOG.md
  CODEOWNERS
  SECURITY.md
```

## Integrations

| Integration | Purpose                  | Status  |
|-------------|--------------------------|---------|
| Jira        | Ticket linking           | Active  |
| Teams       | Chat notifications       | Active  |
| Email       | Deploy/failure alerts    | Active  |
| Splunk      | Log aggregation          | Active  |
| Cherwell    | Change management        | Active  |
| Dependabot  | Dependency auto-updates  | Active  |

## Support

Open a [Support Request](https://github.com/askboppana/ForgeOps/issues/new?template=support-request.md) issue for help.

Browse the [Knowledge Base](docs/knowledge/) for self-service guides.

## License

MIT -- see [LICENSE](LICENSE).
