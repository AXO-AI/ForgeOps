# Changelog

All notable changes to this project will be documented in this file.

## [6.0.0] - 2026-04-10

### Added
- Complete platform rebuild from Jenkins to GitHub Actions
- 4 technology pipelines (Java/Maven, .NET, Node.js, Python)
- 7 reusable workflows (build, test, security, deploy, notify, rollback, self-heal)
- Light theme dashboard with 4 switchable themes
- Email + Teams + Splunk notifications
- 12 knowledge articles for developer self-service
- Support ticketing via GitHub Issues
- Self-healing with automatic remediation
- DORA metrics tracking (lead time, deploy frequency, MTTR, change failure rate)
- Role-based access control (admin, release_engineer, developer, tech_lead, qa_team, uat_team)
- Environment promotion workflow (int > qa > stage > prod)
- Cherwell integration for change management
