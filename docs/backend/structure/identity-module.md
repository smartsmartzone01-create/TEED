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
│   ├── registration.py
│   ├── session.py
│   └── session_cookies.py
├── authentication/
│   └── session.py
├── managers/
│   └── user.py
├── migrations/
├── models/
│   ├── email_verification.py
│   ├── session.py
│   └── user.py
├── repositories/
│   ├── email_verification.py
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
│   ├── registration.py
│   └── session.py
├── services/
│   ├── authentication.py
│   ├── email_verification.py
│   ├── onboarding.py
│   ├── registration.py
│   ├── session.py
│   └── token.py
├── tests/
├── admin.py
├── apps.py
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
4. verification service creates and sends a challenge;
5. the transaction rolls back if the current synchronous delivery fails;
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
3. reject missing, expired, or attempt-limited challenges;
4. compare the submitted code with the stored hash;
5. atomically consume the challenge and mark the email verified;
6. create a server-side session and issue an access token plus refresh cookie;
7. return `next_step: complete_onboarding`.

Resend returns a generic success and only issues a challenge for an existing
unverified user.

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

## Error codes

Current stable identity errors include:

- `email_already_registered`;
- `email_verification_not_found`;
- `email_verification_code_invalid`;
- `email_verification_code_expired`;
- `email_verification_attempt_limit_reached`;
- `identity_verification_required`;
- `username_already_taken`;
- `phone_number_already_registered`;
- `onboarding_already_completed`;
- `invalid_credentials`;
- `email_verification_required`;
- `session_invalid`;
- `session_expired`;
- `refresh_token_invalid`;
- `refresh_token_reuse_detected`.

## Current test boundary

Registration, verification, token, session lifecycle, onboarding, user-manager,
selector, email-login serializer, service, API, CSRF, cookie, replay, revocation,
and throttle behavior have tests.

## Known stabilization work

Before extending identity further:

- add resend throttling and atomic verification transitions;
- move delivery out of open database transactions;
- implement password recovery;
- add auditable security-event recording.

These remaining items describe pending work; they are not implemented
behavior.
