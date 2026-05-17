
# KYB/KYC/compliance controls

## Objectives
- Preserve the verified-only B2B/B2G access model.
- Route compliance checks according to the entity's country and regulatory regime.
- Prevent sanctions, PEP, or ownership red flags from bypassing manual review.
- Maintain an auditable record of all compliance decisions.

## Core controls
1. **Provider routing**
   - EU entities route primary registry validation to Creditsafe.
   - UK entities route primary registry validation to Companies House.
   - Director or authorised-officer identity checks route to Onfido.
   - Entity, beneficial owner, and officer screening route to ComplyAdvantage.

2. **Beneficial ownership**
   - Standard tier and above require declared beneficial owners or an explicit ownership attestation.
   - Ownership records must capture control-person flags and PEP indicators.
   - Any PEP indicator automatically creates a manual review task.

3. **Sanctions handling**
   - Exact or near-exact matches on EU, OFSI, OFAC, or UN lists block approval.
   - Ambiguous matches and PEP signals require analyst disposition before the case can be approved.
   - Sanctions status must be re-screened after ownership changes and on reverification cycles.

4. **Reverification cadence**
   - Trigger reverification on ownership changes, address changes, unusually risky orders, or periodic review windows.
   - High-risk entities should not auto-renew trust posture without analyst review.

5. **Sole trader safeguards**
   - Treat sole-trader addresses as potentially home-linked personal data.
   - Compliance approval must never auto-promote sole-trader address visibility.
   - Analysts must document the legal basis and privacy impact for any exception.

## Evidence and audit
- All compliance cases, checks, documents, sanctions hits, and review tasks must be retained in immutable audit history.
- Resolution notes should capture the reviewer, the reason, and the evidence used.
- Review queues require separation of duties: the submitter of a case should not be the sole approver of that same case where avoidable.
