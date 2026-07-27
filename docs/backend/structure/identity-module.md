# Identity Module Structure

## Purpose

`backend/apps/identity/` owns TEED user identity, authentication entry points,
verification state, onboarding identity fields, credentials, and JWT session
issuance.

## Current organization

```text
identity/
├── api/
│   ├── authentication.py
│   ├── email_verification.py
│   ├── onboarding.py
│   └── registration.py
├── managers/
│   └── user.py
├── migrations/
├── models/
│   ├── email_verification.py
│   └── user.py
├── repositories/
│   ├── email_verification.py
│   └── user.py
├── selectors/
│   ├── email_verification.py
│   └── user.py
├── serializers/
│   ├── authentication.py
│   ├── email_verification.py
│   ├── onboarding.py
│   └── registration.py
├── services/
│   ├── authentication.py
│   ├── email_verification.py
│   ├── onboarding.py
│   ├── registration.py
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
6. issue access and refresh tokens;
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
unverified users, issues a JWT pair, and selects:

- `complete_onboarding` for an incomplete identity;
- `dashboard` for a completed identity.

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
- `email_verification_required`.

## Current test boundary

Registration, verification, token, onboarding, user-manager, selector, and
authentication-service behavior have tests. Login serializer and API tests are
the immediate missing layer.

## Known stabilization work

Before extending identity:

- correct the login URL import namespace;
- add login serializer and API tests;
- run the complete suite;
- make default permissions safe;
- add resend throttling and atomic verification transitions;
- move delivery out of open database transactions;
- add refresh, logout, and current-session contracts;
- implement password recovery;
- document the final refresh-token transport.

These items describe pending work; they are not implemented behavior.
