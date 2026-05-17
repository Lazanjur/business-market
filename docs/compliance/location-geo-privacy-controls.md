# Location Geo-Privacy Controls

## Objective
Protect business-location data while still enabling verified supplier discovery, dispatch intelligence, and procurement geo-eligibility.

## Core controls
1. **Default hidden disclosure**
   - new locations default to `hidden`
   - sole traders are never auto-promoted into public precision

2. **Dual enforcement**
   - SQL filters exclude hidden and unverified rows from search
   - response serialization masks or strips precise coordinates based on viewer tier

3. **Consent capture**
   - every non-hidden visibility state records a disclosure-consent event
   - withdrawing disclosure closes active consent with `withdrawn_at`

4. **Sole trader hardening**
   - registered addresses are normalized away from exact street-level visibility
   - UI and API both surface a warning when sole traders attempt city-level or stronger disclosure

5. **Reviewable geocoding**
   - low-confidence geocodes create manual review tasks
   - manual reviewer decisions can write approved coordinates and resolve the queue item

6. **Postcard evidence orchestration**
   - postcard verification creates both a verification request and a postal dispatch record
   - delivery confirmation and code entry remain auditable

## Reviewer checklist
- confirm the evidence points to a commercial premises, not a residence
- reject or downgrade disclosure where sole-trader home-address exposure is possible
- prefer city-level visibility when the commercial benefit of exact pins is low
- ensure geocode overrides reflect the actual business premises, not a nearby centroid

## Retention guidance
- location history remains immutable for audit purposes
- disclosure consents retain `captured_at` and `withdrawn_at`
- review tasks remain queryable after resolution for SLA and privacy audits
