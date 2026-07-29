# Identity Routes

## Base path

```text
/api/v1/identity/
```

All current identity endpoints accept and return JSON.

## Route summary

| Method | Path | Authentication | Purpose |
| --- | --- | --- | --- |
| `POST` | `/api/v1/identity/registration/email/` | Public | Register with email and password |
| `POST` | `/api/v1/identity/email-verification/` | Public + CSRF | Verify a registration email code |
| `POST` | `/api/v1/identity/email-verification/resend/` | Public | Replace and resend a verification challenge |
| `POST` | `/api/v1/identity/onboarding/` | Bearer access token | Complete required identity fields |
| `POST` | `/api/v1/identity/login/email/` | Public + CSRF | Sign in with email and password |
| `POST` | `/api/v1/identity/password-reset/request/` | Public | Request an email reset code; response is always generic |
| `POST` | `/api/v1/identity/password-reset/verify/` | Public + CSRF | Verify the code and set a short-lived reset grant cookie |
| `POST` | `/api/v1/identity/password-reset/confirm/` | Reset grant cookie + CSRF | Set a validated password and revoke all existing sessions |
| `GET` | `/api/v1/identity/session/csrf/` | Public | Bootstrap browser CSRF protection |
| `POST` | `/api/v1/identity/session/refresh/` | Refresh cookie + CSRF | Rotate the session and return a new access token |
| `POST` | `/api/v1/identity/session/logout/` | Refresh cookie + CSRF | Revoke the current browser session |
| `POST` | `/api/v1/identity/session/logout-all/` | Bearer access token + CSRF | Revoke every session for the user |
| `GET` | `/api/v1/identity/session/me/` | Bearer access token | Read the current user and session identifier |

## Register with email

```http
POST /api/v1/identity/registration/email/
Content-Type: application/json
```

Request:

```json
{
  "email": "user@example.com",
  "password": "StrongPassword123!"
}
```

Success: `201 Created`

```json
{
  "success": true,
  "message": "Registration successful. Verify your email to continue.",
  "data": {
    "user_id": "uuid",
    "email": "user@example.com",
    "next_step": "verify_email"
  }
}
```

Important failures:

- `400` field validation errors;
- `409 email_already_registered`.

Notes:

- email is normalized to lowercase;
- password is validated and never returned;
- a verification challenge is issued after user creation;
- per-network registration throttling limits initial verification-email abuse.

## Verify email

```http
POST /api/v1/identity/email-verification/
Content-Type: application/json
```

Request:

```json
{
  "email": "user@example.com",
  "code": "123456"
}
```

The code length comes from backend configuration and is currently six digits by default.

Success: `200 OK`

```json
{
  "success": true,
  "message": "Email verified successfully.",
  "data": {
    "user_id": "uuid",
    "email": "user@example.com",
    "is_email_verified": true,
    "next_step": "complete_onboarding",
    "tokens": {
      "access": "access-token",
      "token_type": "Bearer",
      "expires_in": 300
    }
  }
}
```

The refresh token is set as an HttpOnly cookie and is never included in JSON.
Bootstrap CSRF protection before calling this endpoint from a browser.

Important failures:

- `400 email_verification_not_found`;
- `400 email_verification_code_invalid`;
- `400 email_verification_code_expired`;
- `429 email_verification_attempt_limit_reached`;
- `400` field validation errors.

Throttle policy is layered rather than treating one network address as one
identity:

- request uses independent IP and normalized-email-hash budgets;
- verification uses separate IP and normalized-email-hash budgets plus the
  persisted challenge attempt limit;
- confirmation uses its own IP budget while the device-bound, expiring,
  single-use grant remains the primary authorization control.

The stages do not consume one shared IP counter. Device IDs support assurance,
grant binding, and audit correlation but are not trusted as a sole throttle key
because a client can clear a device cookie.

## Resend verification

```http
POST /api/v1/identity/email-verification/resend/
Content-Type: application/json
```

Request:

```json
{
  "email": "user@example.com"
}
```

Success: `200 OK`

```json
{
  "success": true,
  "message": "If an unverified account exists for that email, a new verification code has been sent.",
  "data": null
}
```

The response is intentionally the same when no matching unverified account exists. Frontend code must not use this endpoint to detect whether an account exists.

Resend behavior:

- a user-specific cooldown prevents immediate replacement;
- a rolling 24-hour limit counts initial and replacement challenges;
- per-network and hashed-email throttles constrain distributed abuse;
- cooldown and daily-limit blocks return stable `429` error codes for focused
  frontend guidance when the submitted email belongs to an unverified account;
- a successful resend invalidates the previous challenge;
- delivery occurs only after the challenge transaction commits.

Repeated callers may receive `429` from the transport throttle regardless of
whether the submitted email belongs to an account.

## Password reset

The UI uses three internal steps:

1. request with `{"email": "user@example.com"}`;
2. verify with `{"email": "user@example.com", "code": "123456"}`;
3. confirm with matching `new_password` and `new_password_confirm`.

All three calls use `credentials: "include"`. Bootstrap CSRF before the verify
and confirm calls. The request route always returns the same success message,
including for unknown or ineligible accounts, so the UI must always show the
same next step.

A successful verification sets a short-lived, device-bound, single-use
HttpOnly cookie scoped only to the password-reset routes. The grant is never
accepted or returned in JSON. Confirmation validates the password using
Django's configured validators and rejects the account's current password. An
unchanged-password rejection leaves the grant usable and sessions active so the
user can retry within the grant lifetime. Successful confirmation consumes the
grant, revokes every existing session, queues a password-change notification,
and returns `next_step: sign_in`.

Important failures:

- `400 password_reset_challenge_invalid` (invalid, missing, or expired code);
- `429 password_reset_attempt_limit_reached`;
- `401 password_reset_grant_invalid`;
- `400 password_reset_password_unchanged`;
- `429` request throttling;
- `400` field validation errors.

## Complete onboarding

```http
POST /api/v1/identity/onboarding/
Authorization: Bearer {access_token}
Content-Type: application/json
```

Request:

```json
{
  "username": "teedmember",
  "country_code": "TZ",
  "phone_number": "0712345678"
}
```

Current country choices are `TZ`, `KE`, and `UG`. Accepted phone input is normalized to an international value.

Success: `200 OK`

```json
{
  "success": true,
  "message": "Onboarding completed successfully.",
  "data": {
    "user_id": "uuid",
    "email": "user@example.com",
    "username": "teedmember",
    "phone_number": "+255712345678",
    "country_code": "TZ",
    "is_onboarding_complete": true,
    "next_step": "dashboard"
  }
}
```

Important failures:

- `401` missing, invalid, or expired access token;
- `403 identity_verification_required`;
- `409 username_already_taken`;
- `409 phone_number_already_registered`;
- `409 onboarding_already_completed`;
- `400` field validation errors.

## Login with email

```http
POST /api/v1/identity/login/email/
Content-Type: application/json
```

Request:

```json
{
  "email": "user@example.com",
  "password": "StrongPassword123!"
}
```

Success: `200 OK`

```json
{
  "success": true,
  "message": "Signed in successfully.",
  "data": {
    "user_id": "uuid",
    "email": "user@example.com",
    "username": null,
    "is_onboarding_complete": false,
    "next_step": "complete_onboarding",
    "tokens": {
      "access": "access-token",
      "token_type": "Bearer",
      "expires_in": 300
    }
  }
}
```

The refresh token is set as an HttpOnly cookie and is never included in JSON.
Bootstrap CSRF protection before calling this endpoint from a browser.

For a completed user, `is_onboarding_complete` is `true`, `username` contains the saved username, and `next_step` is `dashboard`.

Important failures:

- `401 invalid_credentials`;
- `403 email_verification_required`;
- `429` per-network or per-account login throttle;
- `400` field validation errors.

## Browser session lifecycle

Call the CSRF bootstrap endpoint before login, email verification, refresh, or
logout:

```http
GET /api/v1/identity/session/csrf/
```

Send the returned token as `X-CSRFToken` and include browser credentials on
subsequent requests. The refresh token cookie is HttpOnly, host-only, scoped to
`/api/v1/identity/session/`, `SameSite=Lax`, and `Secure` in production.

Refresh:

```http
POST /api/v1/identity/session/refresh/
X-CSRFToken: {csrf_token}
```

Success returns the current user and a new memory-only access token. It also
rotates the refresh cookie. Reuse of an older token returns
`401 refresh_token_reuse_detected` and revokes that session family.

Current session:

```http
GET /api/v1/identity/session/me/
Authorization: Bearer {access_token}
```

Success returns the safe current-user summary and `session_id`.

Current-device logout:

```http
POST /api/v1/identity/session/logout/
X-CSRFToken: {csrf_token}
```

The operation is idempotent, revokes the cookie-bound session when present, and
clears the refresh cookie.

All-device logout:

```http
POST /api/v1/identity/session/logout-all/
Authorization: Bearer {access_token}
X-CSRFToken: {csrf_token}
```

Success returns the number of revoked sessions and clears the current refresh
cookie. Because access authentication checks the server-side session record,
revoked access tokens fail immediately.

## Standard error shape

Domain failure:

```json
{
  "success": false,
  "message": "Human-readable summary.",
  "errors": {
    "code": "stable_machine_code"
  }
}
```

Field validation:

```json
{
  "success": false,
  "message": "Request validation failed.",
  "errors": {
    "code": "validation_error",
    "fields": {
      "email": [
        {
          "code": "invalid",
          "message": "Enter a valid email address."
        }
      ],
      "password": [
        {
          "code": "password_too_short",
          "message": "This password is too short."
        }
      ]
    }
  }
}
```

Unexpected server failure:

```json
{
  "success": false,
  "message": "An unexpected error occurred.",
  "errors": {
    "code": "internal_server_error"
  }
}
```

Frontend behavior branches on HTTP status and stable error codes, maps them to
localized English or Swahili instructions, and uses backend messages only as
safe fallbacks. Cookie-backed requests refresh CSRF once and retry once when
Django returns `csrf_failed`; a second failure is shown to the user. Server diagnostics and tracebacks remain in server logs.

## Frontend integration boundary

The completed email identity contract supports:

```text
register → verify_email → complete_onboarding → dashboard
login ─────────────────→ complete_onboarding or dashboard
password_reset → verify_reset_code → choose_new_password → sign_in
```

The frontend keeps the access token in memory only. It must never persist the
access token, refresh token, reset grant, verification code, or password in web
storage. All cookie-aware identity requests use `credentials: "include"`.
Protected calls send `Authorization: Bearer {access_token}`.

The first dashboard integration may be a minimal authenticated destination.
Profile editing, picture uploads, phone verification, social identity,
high-assurance account recovery, and user-facing device management do not yet
have completed APIs and must not be simulated as implemented.

The global URL configuration owns `/api/v1/identity/`; the identity URL
configuration owns the relative paths and uses the runtime `apps.identity`
namespace.
