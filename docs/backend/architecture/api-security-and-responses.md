# Backend API, Security, and Responses

## API namespace

Application endpoints use:

```text
/api/v1/{module}/
```

The current identity base is `/api/v1/identity/`. Admin and API schema
interfaces are operational endpoints and are not part of the public business
API namespace.

## Request handling

- JSON is the default request format.
- Serializers validate and normalize external input.
- Unknown or invalid input returns the standard error envelope.
- Views call services with keyword arguments.
- Services return domain results rather than DRF responses.
- API views select transport fields deliberately; model objects are not
  serialized implicitly.

## Success envelope

Successful responses use:

```json
{
  "success": true,
  "message": "Human-readable result.",
  "data": {}
}
```

`data` may be an object, list, or `null`. The HTTP status remains authoritative
and must match the operation.

## Error envelope

Failures use:

```json
{
  "success": false,
  "message": "Human-readable summary.",
  "errors": {
    "code": "stable_machine_code"
  }
}
```

Domain exceptions use stable codes from `TEEDException` subclasses.
Validation failures use `validation_error` and preserve each serializer field
path as structured `{code, message}` entries:

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
      ]
    }
  }
}
```

Frontend behavior branches on the stable codes and maps them to localized UX
copy. Backend messages remain useful diagnostics and fallbacks but are not the
localization contract. Unexpected exceptions are logged with their traceback
and return only `internal_server_error`; stack traces and sensitive internals
never enter the response.

## Status conventions

- `200` successful read or state transition;
- `201` resource creation;
- `204` successful operation without a representation;
- `400` malformed or invalid request;
- `401` missing or invalid authentication;
- `403` authenticated but not permitted, or a required verified state is
  absent;
- `404` resource not found when disclosure is safe;
- `409` uniqueness or state conflict;
- `429` throttling or attempt limit;
- `500` unexpected server failure.

## Authentication

Protected APIs use short-lived JWT bearer access tokens. Every access token is
bound to a server-side `UserSession`; authentication rejects a revoked, expired,
missing, or inactive-user session. This makes logout and security revocation
effective immediately instead of waiting for the access token to expire.

Browser refresh tokens are never returned in JSON. They use a host-only,
HttpOnly cookie scoped to `/api/v1/identity/session/`, with `SameSite=Lax` and
`Secure` enabled in production. Refresh rotation replaces the cookie, blacklists
the consumed token, and preserves an absolute session expiry. Reuse of an older
refresh token revokes the entire session family.

The frontend keeps the access token in memory only. Neither access nor refresh
tokens belong in `localStorage` or `sessionStorage`.

Authentication answers who the requester is. Authorization separately decides
what that identity may do.

## Permission defaults

The target configuration is default authenticated access. Public views must
declare `AllowAny` explicitly:

- registration;
- email verification;
- verification resend;
- login;
- future password-recovery initiation.

Every protected business endpoint must declare or inherit an intentional
permission policy.

## Identity privacy

Login returns the same invalid-credentials outcome for an unknown email and an
incorrect password. Resend and password-reset request return a generic success
whether or not the account exists.

Login applies two independent throttles:

- a per-network limit to reduce concentrated abuse;
- a per-account limit keyed by a hash of the normalized email address.

The defaults are configured through `LOGIN_IP_THROTTLE_RATE` and
`LOGIN_EMAIL_THROTTLE_RATE`. Development uses Django's local-memory cache;
production uses the required shared Redis cache so every application instance
enforces the same counters.

`THROTTLE_NUM_PROXIES` defaults to `0`, which ignores forwarded client-IP
headers and uses the direct peer address. Set it to the exact number of trusted
reverse proxies only when the deployment network guarantees that clients
cannot bypass those proxies.

Registration may return a conflict for an existing account because the product
contract currently treats duplicate registration as an explicit conflict.
Changing that behavior requires a deliberate privacy/product decision.

## Verification security

- Codes are generated with `secrets`.
- Only password-hashed digests are stored.
- Codes expire.
- Attempts are limited.
- A successful challenge is consumed.
- A resend invalidates outstanding challenges.
- Challenge selection, failed-attempt accounting, consumption, and the verified
  user transition are serialized under database locks.
- Resends enforce a user-specific cooldown, rolling daily limit, per-network
  throttle, and hashed-account throttle.
- Registration applies a per-network throttle to constrain initial
  verification-email abuse.
- Cooldown and daily-limit blocks preserve the generic public success response
  to prevent account enumeration.
- Delivery is registered after database commit. Provider failure cannot roll
  back the user or challenge and is recorded for operational follow-up.
- Security events store identifiers, outcomes, request metadata, and
  non-sensitive reason codes without storing email addresses, plaintext codes,
  tokens, or raw user agents.

Future production work includes background delivery workers, provider-specific
retry/dead-letter handling, and alerting.

Security audit events are server-side, append-oriented records containing event
time, outcome, IP, opaque device ID, hashed user agent, and a hashed submitted
identity when the account may be unknown. Passwords, codes, reset grants, JWTs,
cookies, authorization headers, and raw email addresses are forbidden. Device
correlation may inform risk but never proves identity. Retention is configured
with `IDENTITY_SECURITY_EVENT_RETENTION_DAYS` and enforced by the
`purge_expired_security_events` operation.

Password reset uses one email verification interaction. Internal assurance
labels the request as known-device, familiar-network, or standard and applies
rate limits without demanding a second code. Successful verification produces
a short-lived, device-bound, single-use HttpOnly grant. Confirmation validates
the new password, revokes all sessions, sends a notification, and requires a
fresh sign-in.

Email delivery uses a transactional database outbox. Provider calls never run
inside the identity transaction. Delivery payloads containing short-lived codes
are encrypted at rest, decrypted only by the worker, and erased on sent or
dead-letter status. Production requires an independent Fernet key so rotating
the Django secret does not make queued deliveries unreadable. Idempotency keys,
row locks, stale-lock recovery, bounded retries, expiry, and terminal retention
are mandatory provider-independent behavior.

## CORS and CSRF

CORS controls which browser origins may call the API; it is not authentication.
Allowed origins must be explicit in production. Credentialed CORS is enabled so
approved frontend origins can send the refresh cookie; wildcard origins are not
permitted.

The browser first calls `GET /api/v1/identity/session/csrf/`, then sends the
returned CSRF token in `X-CSRFToken`. CSRF is required for login, email
verification, refresh, logout, and logout-all because these operations create,
rotate, or destroy cookie-backed browser sessions. The CSRF cookie remains
JavaScript-readable by design; the refresh cookie does not.

## API documentation

`drf-spectacular` generates OpenAPI schema and interactive documentation.
Public contracts should include:

- request and response schemas;
- status codes;
- authentication requirements;
- stable error codes;
- examples that contain no secrets.

Schema generation must be part of verification so undocumented or invalid
views are caught before deployment.
