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

Validation failures may contain field keys. Domain exceptions use stable codes
from `TEEDException` subclasses. Unexpected exceptions are logged internally
and must not expose stack traces or sensitive internals.

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

JWT bearer authentication is currently used for protected APIs. Access tokens
authenticate requests; refresh tokens must be rotated and tracked through the
blacklist application.

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
incorrect password. Resend returns a generic success whether or not the
account exists. Similar anti-enumeration behavior should apply to password
recovery.

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

Required production hardening:

- per-account and per-network throttling;
- resend cooldowns and daily limits;
- atomic consumption and attempt accounting;
- delivery after database commit;
- security event logging without recording the code;
- abuse monitoring.

## CORS and CSRF

CORS controls which browser origins may call the API; it is not authentication.
Allowed origins must be explicit in production.

The final refresh-token transport determines CSRF requirements. If refresh
credentials use secure cookies, state-changing endpoints require appropriate
CSRF defenses. If tokens are sent in authorization payloads, storage and XSS
risks must be addressed explicitly.

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
