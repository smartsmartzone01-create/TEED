# Frontend API, State, and Security

## Status

The browser identity session foundation is implemented. This document defines
its current contract and the boundaries future authenticated modules must
follow.

## API client responsibility

One shared API client should own:

- backend base URL construction;
- JSON serialization;
- locale and request headers;
- timeouts and cancellation;
- standard envelope parsing;
- normalized network and API errors;
- authentication integration;
- safe retry rules.

Components and route files must not each invent their own request behavior.


In local desktop development, the frontend and backend must use one canonical
site host: `http://localhost:3000` and `http://localhost:8000`. Do not mix
`localhost`, `127.0.0.1`, or a LAN address in one browser flow because
SameSite cookies are site-bound. LAN testing is a separate configuration and
must use the same LAN hostname for both servers with explicit Next.js, CORS, and
CSRF allowlists.

## Services

Services live under `src/services/{module}/` and expose product-oriented
operations:

```text
initializeCsrf
registerWithEmail
verifyEmail
resendVerification
loginWithEmail
completeOnboarding
requestPasswordReset
verifyPasswordResetCode
confirmPasswordReset
refreshSession
getCurrentSession
logout
logoutAll
```

They call the shared client, validate external responses, normalize DTOs, and
return typed results. Services do not render UI or navigate.

## Schemas and types

- schemas validate untrusted API payloads and user input;
- DTO types describe transport contracts;
- domain/UI types describe normalized frontend data;
- TypeScript types alone do not validate runtime data.

The schema library must be selected as the first frontend integration decision.
Every backend envelope remains untrusted until validated at runtime.

## State ownership

### Server state

Backend-derived resources, loading, errors, freshness, and invalidation belong
in an approved server-state mechanism or server-rendered flow.

### Session state

The session provider owns only:

- initialization;
- authenticated/unauthenticated state;
- safe current-user summary;
- refresh coordination;
- logout and expiration events.

It must not become a general application store.

### Form state

Forms own field values, validation, submission, and field error display.
Backend errors are mapped into field or form-level localized messages.

### Local state

Dropdowns, dialogs, selected tabs, and temporary interaction state stay local
unless multiple independent consumers require promotion.

### Persistent state

Theme and locale preferences may persist. Tokens and sensitive business data
must follow the approved session/security design rather than generic local
storage.

## Authentication flow

The current backend contract indicates:

```text
register → verify_email → complete_onboarding → dashboard
login ─────────────────→ complete_onboarding or dashboard
password_reset → verify_reset_code → choose_new_password → sign_in
```

Frontend navigation follows the backend `next_step` result but validates route
access again through restored session state. A route guard is a user-experience
control, not authorization.

## Credential transport decision

The browser session contract is finalized:

- the refresh token is a host-only, HttpOnly cookie and is never readable by
  frontend JavaScript;
- the access token is held in memory only;
- neither token is stored in `localStorage` or `sessionStorage`;
- credentialed API requests use `credentials: "include"`;
- the client bootstraps CSRF protection and sends `X-CSRFToken` on
  session-creating or session-mutating requests;
- refresh rotation is coordinated so only one refresh request is active;
- failed refresh settles queued requests and clears authenticated state;
- logout clears memory state after the backend revokes the session.

The implemented provider coordinates same-tab refreshes through one shared
promise and uses the browser Web Locks API, when available, to serialize refresh
rotation across tabs. A `BroadcastChannel` session-ended event clears in-memory
credentials in other open TEED tabs after logout or local invalidation. No token
or personal data is written into that channel or browser storage.

Logout only clears the browser's authenticated state after the backend confirms
that the refresh session was revoked. A network failure leaves the visible
session active and gives the user a retry action; it must not pretend that an
HttpOnly server credential was removed.

Password-reset verification creates a separate short-lived, device-bound,
single-use HttpOnly grant cookie. The frontend never reads or stores that grant.
The implemented three-page flow validates the backend `next_step` contract,
keeps request responses non-enumerating, and retries CSRF only through the
shared identity service. Successful password confirmation revokes every
session, clears the reset grant, clears in-memory identity state across tabs,
and returns the user to sign-in.

## Completed identity endpoint contract

The first integration uses these backend endpoints:

| Operation | Endpoint | Browser credential rule |
| --- | --- | --- |
| Initialize CSRF | `GET /api/v1/identity/session/csrf/` | Include cookies |
| Register | `POST /api/v1/identity/registration/email/` | Public |
| Verify email | `POST /api/v1/identity/email-verification/` | Include cookies and CSRF |
| Resend verification | `POST /api/v1/identity/email-verification/resend/` | Include cookies |
| Login | `POST /api/v1/identity/login/email/` | Include cookies and CSRF |
| Complete onboarding | `POST /api/v1/identity/onboarding/` | Bearer access token |
| Restore access | `POST /api/v1/identity/session/refresh/` | Include cookies and CSRF |
| Current session | `GET /api/v1/identity/session/me/` | Bearer access token |
| Logout | `POST /api/v1/identity/session/logout/` | Include cookies and CSRF |
| Logout all | `POST /api/v1/identity/session/logout-all/` | Bearer, cookies, and CSRF |
| Request reset | `POST /api/v1/identity/password-reset/request/` | Include cookies |
| Verify reset | `POST /api/v1/identity/password-reset/verify/` | Include cookies and CSRF |
| Confirm reset | `POST /api/v1/identity/password-reset/confirm/` | Include cookies and CSRF |

Frontend navigation may use the backend `next_step` values
`verify_email`, `complete_onboarding`, `dashboard`,
`verify_reset_code`, `choose_new_password`, and `sign_in`. Unknown values
must fail safely instead of producing an arbitrary redirect.

The initial authenticated dashboard is only an integration destination.
Profile editing, image uploads, verified-phone flows, social login,
high-assurance account recovery, and device-management screens remain outside
the completed API contract.

## Route access decisions

The shared identity access boundary applies these rules after session
initialization:

| Route category | Unauthenticated | Incomplete onboarding | Complete onboarding |
| --- | --- | --- | --- |
| Guest identity | allow | onboarding | dashboard |
| Onboarding | login | allow | dashboard |
| Dashboard | login | onboarding | allow |

Pages render a neutral restoration or redirect state until that decision is
settled, preventing protected or inappropriate content from flashing. These
redirects are usability controls; backend permissions remain authoritative.

## Error model

Frontend errors should normalize:

- offline/network failure;
- timeout;
- cancelled request;
- field validation;
- unauthenticated;
- forbidden;
- conflict;
- throttled;
- unexpected server failure.

Stable backend error codes map to localized user messages and recovery actions.
Do not display stack traces or raw provider errors.

## Retry rules

Safe reads may retry with bounded backoff. Mutations, registration, verification,
payments, and other side effects must not retry automatically unless the
operation has an idempotency contract.

Only one refresh attempt should run at a time. Failed refresh must settle the
session and queued requests predictably.

## Browser security

- Never ship server secrets.
- Treat all browser input and stored state as untrusted.
- Avoid unsafe HTML.
- Prefer framework escaping and safe URL handling.
- Apply a production Content Security Policy.
- Redact credentials and personal data from client logs.
- Third-party scripts require explicit approval and minimal privileges.

## Privacy

Collect and retain only information needed for the user-facing operation.
Analytics must not capture passwords, tokens, verification codes, or sensitive
form values. Consent and regional requirements must be reviewed before adding
tracking.

## Testing targets

- envelope and runtime-schema parsing;
- locale and authentication headers;
- error normalization;
- duplicate-submission prevention;
- registration/login/verification/onboarding routing;
- password-reset request, verification, confirmation, and forced sign-in;
- reset resend cooldown, invalid/expired code, attempt limit, expired grant,
  backend password-validation fields, and cross-tab forced sign-out;
- generic anti-enumeration responses;
- session initialization and expiration;
- refresh concurrency;
- logout;
- offline and timeout states;
- backend field-error mapping.
