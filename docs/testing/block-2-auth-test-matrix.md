# Block 2 test matrix

## Database lane
- Create entity owner membership on registration.
- Reject any attempt to persist `entity_type = 'individual'`.
- Ensure a user can hold memberships in more than one entity.
- Ensure only one verified primary MFA method can exist per user.

## API lane
- Password login success for a standard member.
- Password login returns `mfa_required` for owner/admin/public-authority admin roles.
- Refresh token rotation invalidates prior refresh secret.
- Invite acceptance fails if the signed-in email does not match invite email.
- Standard-tier guard blocks invite creation for basic-tier users.

## Worker / integration lane
- `auth.member_invited` prepares the correct email envelope.
- `auth.session_risk_detected` escalates the target session to `requires_step_up = true`.
- `auth.scim_sync_requested` resolves the configured SSO connection.

## Frontend lane
- Login form routes to MFA page on `mfa_required` response.
- MFA page completes challenge and reports success state.
- Access dashboard renders sessions, pending invites, and SSO connection status.

## Compliance lane
- Verify owner/admin flows require MFA enrollment or challenge.
- Verify legal-entity-only registration pathway remains the only public onboarding path.
- Verify auth audit event coverage for registration, login, MFA enablement, session revoke, invite create, invite accept, and SSO login.
