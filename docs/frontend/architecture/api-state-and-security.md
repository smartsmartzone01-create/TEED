# Frontend API, State, and Security

## Status

The shared authenticated-data stack is planned, not yet implemented. This
document defines the boundaries it must follow.

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

## Services

Services live under `src/services/{module}/` and expose product-oriented
operations:

```text
registerWithEmail
verifyEmail
resendVerification
loginWithEmail
completeOnboarding
refreshSession
logout
```

They call the shared client, validate external responses, normalize DTOs, and
return typed results. Services do not render UI or navigate.

## Schemas and types

- schemas validate untrusted API payloads and user input;
- DTO types describe transport contracts;
- domain/UI types describe normalized frontend data;
- TypeScript types alone do not validate runtime data.

The schema-library decision will be made before the first identity form.

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
```

Frontend navigation follows the backend `next_step` result but validates route
access again through restored session state. A route guard is a user-experience
control, not authorization.

## Credential transport decision

The final refresh-token design is not yet decided in code. Before identity UI:

1. choose secure cookie or another explicit transport;
2. document CSRF and XSS implications;
3. define refresh rotation and logout;
4. define multi-tab coordination;
5. define server-component access;
6. test expiration and recovery.

Avoid persisting long-lived credentials in general-purpose browser storage.

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
- session initialization and expiration;
- refresh concurrency;
- logout;
- offline and timeout states;
- backend field-error mapping.
