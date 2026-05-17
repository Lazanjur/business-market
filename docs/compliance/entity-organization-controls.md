# Entity and organization controls

## Objectives
- Keep organization-level data explainable and auditable.
- Prevent orphaned ownership or invisible governance changes.
- Distinguish private suppliers from public authorities without weakening the verified-only model.

## Controls implemented in Block 3

1. **Last-owner protection**
   - A membership cannot demote or remove the last active owner for an entity.

2. **Authority-profile scoping**
   - `entity_authority_profiles` can be written only for `public_authority` entities.

3. **Trust-score explainability**
   - Every manual recomputation stores `score_before`, `score_after`, `delta`, and a structured breakdown in `trust_score_events`.

4. **Profile completeness as a governed signal**
   - Commercial profile quality is measured consistently and stored, avoiding opaque admin-only judgments.

5. **Unit-level procurement readiness**
   - Organization units can be marked `is_procurement_eligible` to support tender scoping and separation of duties.

## Recommended operating controls
- Quarterly review of high-privilege memberships.
- Expiry monitoring for certifications and insurance evidence.
- Manual review workflow for authority metadata before external publishing.
- Notification on trust-score drops greater than 10 points.
