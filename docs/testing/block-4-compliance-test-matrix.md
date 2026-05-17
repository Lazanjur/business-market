# Block 4 test matrix

## Unit
- compliance tier plan generation for standard, premium, and public-authority cases
- provider routing across EU and UK regimes
- risk-band derivation for sanctions hits, sole traders, and registry-confidence drops
- compliance serializer extraction of target tier and document requirements from timeline events

## Service
- cannot review or manage another entity's compliance workspace
- cannot approve a case while sanctions hits or queued checks remain unresolved
- registry refresh stores provider reference and updates KYB state
- document submission transitions case state and emits outbox events
- beneficial-owner upsert preserves normalized names and activity flags

## Worker
- `compliance.case.opened` triggers registry enrichment
- `compliance.screening.requested` escalates high-risk hits
- `compliance.document.submitted` routes cases into review status
- reverification sweep detects stale verified entities

## Frontend
- compliance dashboard renders open cases, provider badges, and UBO status
- admin queue renders escalations and SLA framing
