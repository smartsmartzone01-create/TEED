# Identity Module Structure

## Purpose

`backend/apps/identity/` owns TEED user identity, authentication entry points,
verification state, onboarding identity fields, credentials, and JWT session
lifecycle.

## Current organization

```text
identity/
├── api/
│   ├── authentication.py
│   ├── email_verification.py
│   ├── onboarding.py
│   ├── password_reset.py
│   ├── registration.py
│   ├── session.py
│   └── session_cookies.py
├── authentication/
│   └── session.py
├── email/
│   └── providers.py
├── management/commands/
│   ├── process_email_deliveries.py
│   ├── purge_email_deliveries.py
│   └── purge_expired_security_events.py
├── managers/
│   └── user.py
├── migrations/
├── models/
│   ├── email_delivery.py
│   ├── email_verification.py
│   ├── password_reset.py
│   ├── security_event.py
│   ├── session.py
│   └── user.py
├── repositories/
│   ├── email_delivery.py
│   ├── email_verification.py
│   ├── password_reset.py
│   ├── security_event.py
│   ├── session.py
│   └── user.py
├── selectors/
│   ├── email_verification.py
│   ├── session.py
│   └── user.py
├── serializers/
│   ├── authentication.py
│   ├── email_verification.py
│   ├── onboarding.py
│   ├── password_reset.py
│   ├── registration.py
│   └── session.py
├── services/
│   ├── authentication.py
│   ├── email_delivery.py
│   ├── email_delivery_crypto.py
│   ├── email_templates.py
│   ├── email_verification.py
│   ├── onboarding.py
│   ├── password_reset.py
│   ├── registration.py
│   ├── security_event.py
│   ├── session.py
│   └── token.py
├── throttles/
│   ├── authentication.py
│   ├── email_verification.py
│   └── password_reset.py
├── tests/
├── admin.py
├── apps.py
├── checks.py
└── urls.py
```

## User model

`User` combines Django authentication behavior with `BaseModel`. It currently
supports email or phone-oriented identity while Django authentication uses
email as `USERNAME_FIELD`.

Important state:

- `is_active` controls account authentication eligibility;
- `is_staff` and `is_superuser` support Django administration;
- `is_email_verified` and `is_phone_verified` record verified channels;
- `onboarding_completed_at` determines onboarding completion;
- optional username, phone, country, and name fields complete the profile.

The manager normalizes emails, hashes passwords, supports unusable passwords,
and enforces an email or phone identity at creation.

## Registration flow

Route:

```text
POST /api/v1/identity/registration/email/
```

Flow:

1. serializer normalizes email and validates the password;
2. service checks for an existing active account;
3. repository creates the user;
4. verification service creates the challenge transactionally;
5. delivery runs after commit and records success or provider failure;
6. API returns `201` and `next_step: verify_email`.

Password and verification code are never returned.

## Email verification

Routes:

```text
POST /api/v1/identity/email-verification/
POST /api/v1/identity/email-verification/resend/
```

Verification:

1. normalize email and validate the numeric code shape;
2. locate the user and latest active challenge;
3. lock and reject missing, expired, or attempt-limited challenges;
4. compare the submitted code with the stored hash;
5. atomically account for failures or consume the challenge and mark the email
   verified;
6. create a server-side session and issue an access token plus refresh cookie;
7. return `next_step: complete_onboarding`.

Resend returns a generic success and only issues a challenge for an existing
unverified user. It applies a cooldown, rolling daily limit, per-network
throttle, and hashed-email throttle. Persisted blocks keep the generic response
so they cannot be used for account discovery.

`IdentitySecurityEvent` records challenge issuance, delivery outcomes,
verification outcomes, and blocked resends. It stores no plaintext code, token,
email address, or raw user agent.

## Onboarding

Route:

```text
POST /api/v1/identity/onboarding/
Authorization: Bearer {access_token}
```

The serializer currently supports Tanzania, Kenya, and Uganda and normalizes
accepted national formats to E.164-style values. The service requires a
verified identity, rejects repeated onboarding, checks username and phone
conflicts, and persists:

- lowercase username;
- normalized phone;
- two-letter country code;
- completion timestamp.

Success returns `next_step: dashboard`.

## Login

Route:

```text
POST /api/v1/identity/login/email/
```

The service normalizes email, authenticates the password, rejects inactive or
unverified users, creates a server-side session, issues an access token and
HttpOnly refresh cookie, and selects:

- `complete_onboarding` for an incomplete identity;
- `dashboard` for a completed identity.

## Session lifecycle

Routes:

```text
GET  /api/v1/identity/session/csrf/
POST /api/v1/identity/session/refresh/
POST /api/v1/identity/session/logout/
POST /api/v1/identity/session/logout-all/
GET  /api/v1/identity/session/me/
```

`UserSession` records the session family, absolute expiry, current refresh JTI,
revocation state, IP address, and a SHA-256 user-agent fingerprint. Refresh
tokens rotate under a database row lock. A replayed or stale refresh token
revokes the family and blacklists its outstanding token. Session-aware JWT
authentication checks the server-side record on every protected request, so
logout and security revocation invalidate access immediately.

Browser refresh credentials use a host-only HttpOnly cookie scoped to the
session routes. The response body contains only the short-lived access token,
which the frontend must keep in memory. Login, verification, refresh, logout,
and logout-all require CSRF protection.

## Password reset and security audit

Password reset is an internal three-stage flow: request an email code, verify
the code, then confirm a new password using a short-lived HttpOnly grant cookie.
The grant is persisted only as a digest, bound to the requesting device
identifier, and consumed once. Completion revokes all sessions and requires a
fresh sign-in.

`IdentitySecurityEvent` records login, registration, email-challenge, and
password-reset outcomes. It may reference a user, session, challenge, and
server-issued device ID and stores event time, IP, hashed user agent, hashed
submitted identity, outcome, and safe reason. It never stores passwords, codes,
tokens, cookies, authorization headers, or raw email addresses. The device ID
supports correlation only; it is not proof of identity. Retention is
configurable and enforced by `purge_expired_security_events`.

## Email delivery outbox

Identity services no longer call an email provider directly. They create an
`EmailDelivery` row in the same database transaction as the identity change.
The outbox supports verification codes, password-reset codes, and
password-change notifications.

Each job has a unique idempotency key, status, attempt count, retry time,
provider reference, expiry, and terminal error code. Sensitive template
payloads are encrypted with Fernet and are erased after delivery or dead-letter
termination. Recipient addresses are resolved from the user only while sending;
the outbox stores a recipient hash rather than another plaintext copy.

Development processes jobs after transaction commit with Django's configured
email backend. Production disables automatic processing and runs
`process_email_deliveries` through the operations scheduler. Temporary failures
use bounded exponential retry, permanent failures and expired jobs move to
dead-letter, stale processing locks are reclaimable, and row locking prevents
two workers from claiming the same job.

`DjangoEmailProvider` is the local provider. SendGrid will implement the same
provider contract after deployment; no identity service will need refactoring.

## Error codes

Current stable identity errors include:

- `email_already_registered`;
- `email_verification_not_found`;
- `email_verification_code_invalid`;
- `email_verification_code_expired`;
- `email_verification_attempt_limit_reached`;
- `email_verification_resend_cooldown` (internal/generic at the resend API);
- `email_verification_daily_limit_reached` (internal/generic at the resend API);
- `identity_verification_required`;
- `username_already_taken`;
- `phone_number_already_registered`;
- `onboarding_already_completed`;
- `invalid_credentials`;
- `email_verification_required`;
- `session_invalid`;
- `session_expired`;
- `refresh_token_invalid`;
- `refresh_token_reuse_detected`;
- `password_reset_challenge_invalid`;
- `password_reset_attempt_limit_reached`;
- `password_reset_grant_invalid`.

## Current test boundary

The current suite contains 129 tests covering registration, verification,
password reset, email delivery, token and session lifecycle, onboarding,
security audit, managers, selectors, serializers, services, APIs, CSRF, cookies,
refresh replay and revocation, throttling, encryption, retry, dead-letter, and
retention behavior.

## Integration readiness and remaining scope

The email-based identity journey is ready for frontend integration:
registration, verification and resend, login, onboarding, session restoration,
refresh, logout, password reset, and entry into a protected dashboard.

The following capabilities remain deliberately outside the completed contract:

- verified-phone ownership, SMS delivery, and phone authentication;
- social identity providers;
- high-assurance account recovery when normal email recovery is unavailable;
- user-facing trusted-device and session management;
- a deployed provider adapter and continuously scheduled production worker.

These deferred capabilities extend identity through the existing service and
provider boundaries. They do not require a change to the modular-monolith
principles or the current frontend session contract.
