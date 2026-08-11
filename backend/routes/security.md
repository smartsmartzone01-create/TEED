# Security and access routes

All routes require an authenticated, onboarding-complete user. Mutating routes also require the TEED CSRF cookie/header contract.

| Method | Route | Purpose |
| --- | --- | --- |
| `GET` | `/api/v1/security/me/overview/` | Verified contacts, recovery readiness, active-session count, recent activity |
| `POST` | `/api/v1/security/me/password/` | Change password and revoke every other session |
| `GET` | `/api/v1/security/me/sessions/` | List the user's active sessions and identify the current session |
| `DELETE` | `/api/v1/security/me/sessions/{session_id}/` | Revoke one owned, non-current session |
| `POST` | `/api/v1/security/me/sessions/revoke-others/` | Revoke every active session except the current one |
| `GET` | `/api/v1/security/me/activity/` | Return a bounded, sanitized security-event history |

Session responses expose a coarse device/browser/OS description and the user's own IP address. They never expose refresh identifiers, token families, raw user-agent strings, hashes, codes, credentials, or internal audit metadata.

Primary email/phone replacement, phone verification, two-factor authentication, and passkeys remain deliberately outside this contract until their verification/provider flows are defined.
