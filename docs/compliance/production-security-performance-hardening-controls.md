# Production security/performance hardening controls

## Security controls
- Rate limit public and authenticated surfaces.
- Apply dual enforcement for sensitive location-data serialization.
- Maintain immutable audit events for administrative overrides.
- Rotate provider secrets through a managed secret store.
- Keep incident playbooks for credential compromise, privacy breach, fraud, and provider outage.

## Performance controls
- Maintain explicit p95 budgets for API, search, geo-search, and chat.
- Track retry and dead-letter backlogs as release-blocking signals.
- Require migration dry-runs before release promotion.
- Gate production deploys on error-budget and high-severity incident state.
