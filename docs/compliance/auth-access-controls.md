# Auth and access control controls

## Scope
This control set applies to the verified-only B2B/B2G access layer for IB Marketplace.

## Core controls
1. **No consumer enrollment** — onboarding flows only create legal-entity-backed accounts and memberships. Database migration adds a check constraint preventing `entity_type = 'individual'`.
2. **Role-based delegation** — organization roles resolve to explicit permission sets. High-risk roles require stronger authentication posture.
3. **Verification-tier gating** — sensitive operations such as member invitation and street-level business-location access require `standard` tier or above.
4. **Step-up authentication** — elevated roles, high-risk sessions, and higher-tier organizations require MFA challenge completion before full session issuance.
5. **Session traceability** — every refresh-capable session carries device, IP, agent, geo-country, risk score, and revocation metadata.
6. **Enterprise SSO** — entity-managed SSO connection records support OIDC or SAML today and SCIM synchronization triggers for enterprise customers.
7. **Auditability** — auth-domain events are written to `auth_audit_events` and mirrored into the outbox for downstream processing.

## Privacy and regulatory notes
- The verified-only access model supports the B2B/B2G-only enforcement in the v4 specification.
- Sole traders should remain on the most privacy-protective defaults until entity verification and location disclosure choices are explicit.
- Access to street-level business-location data is restricted to authenticated members with sufficient verification tier.
- UK and EU entities can share the same technical auth stack while keeping `regulatory_regime` in the session context for downstream policy decisions.

## Operational recommendations
- Require MFA for all owners, admins, finance managers, compliance managers, and public-authority admins.
- Alert on repeated invite creation, repeated failed MFA attempts, and bursts of new sessions without device fingerprints.
- Run quarterly role-review attestations for enterprise customers and contracting authorities.
- Keep SCIM disabled until the customer has completed SSO metadata validation and fallback break-glass access is configured.
