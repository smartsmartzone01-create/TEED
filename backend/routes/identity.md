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
| `POST` | `/api/v1/identity/email-verification/` | Public | Verify a registration email code |
| `POST` | `/api/v1/identity/email-verification/resend/` | Public | Replace and resend a verification challenge |
| `POST` | `/api/v1/identity/onboarding/` | Bearer access token | Complete required identity fields |
| `POST` | `/api/v1/identity/login/email/` | Public | Sign in with email and password |

There are currently no implemented identity `GET` endpoints.

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
- a verification challenge is issued after user creation.

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
      "refresh": "refresh-token",
      "token_type": "Bearer"
    }
  }
}
```

Important failures:

- `400 email_verification_not_found`;
- `400 email_verification_code_invalid`;
- `400 email_verification_code_expired`;
- `429 email_verification_attempt_limit_reached`;
- `400` field validation errors.

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
      "refresh": "refresh-token",
      "token_type": "Bearer"
    }
  }
}
```

For a completed user, `is_onboarding_complete` is `true`, `username` contains the saved username, and `next_step` is `dashboard`.

Important failures:

- `401 invalid_credentials`;
- `403 email_verification_required`;
- `429` per-network or per-account login throttle;
- `400` field validation errors.

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
  "message": "Request failed.",
  "errors": {
    "email": ["Field error message."]
  }
}
```

Frontend behavior should branch on HTTP status and stable error codes, then map them to localized English or Swahili messages.

The identity URL configuration uses the runtime `apps.identity` namespace.
