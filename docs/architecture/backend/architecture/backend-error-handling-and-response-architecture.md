# `docs/backend/backend-error-handling-and-response-architecture.md`

# TEED Backend Error Handling and Response Architecture

## Purpose

This document defines how the TEED backend identifies, classifies, handles, logs, and returns errors.

Its purpose is to ensure that all backend modules produce consistent, secure, predictable, and client-friendly responses regardless of where an error originates.

This architecture applies to:

- HTTP APIs
- Application services
- Domain services
- Repositories
- Background jobs
- External integrations
- File-processing operations
- Authentication and authorization flows
- Scheduled tasks
- Internal administrative operations

The backend must never expose raw exceptions, infrastructure details, database messages, stack traces, credentials, or sensitive internal data to clients.

---

# Core Principles

Backend error handling follows these principles:

1. Errors are classified before they are returned.
2. Clients receive stable error contracts.
3. Internal exceptions are never exposed directly.
4. Business errors are separated from technical failures.
5. Validation errors are structured by field where possible.
6. Authentication and authorization failures are handled consistently.
7. Unexpected failures are logged with correlation information.
8. Sensitive data is excluded from logs and responses.
9. Error handling remains centralized.
10. Every error response is suitable for web, PWA, and future mobile clients.

---

# Error Lifecycle

The general error lifecycle is:

```text
Failure Occurs
    ↓
Exception or Error Object Created
    ↓
Error Classified
    ↓
Known Error Mapped to Application Error
    ↓
HTTP Status and Error Code Selected
    ↓
Safe Client Message Created
    ↓
Operational Context Logged
    ↓
Standard API Error Response Returned
```

Known business and application errors should be handled intentionally.

Unknown errors should be treated as internal server failures and processed by the global exception handler.

---

# Error Categories

All backend errors should belong to a defined category.

## Validation Errors

Validation errors occur when input does not satisfy request requirements.

Examples:

- Missing required field
- Invalid email format
- Invalid date
- Unsupported file type
- Value outside an allowed range
- Invalid request structure

Typical status:

```text
400 Bad Request
```

Where semantic validation is clearly separated from malformed requests, the backend may use:

```text
422 Unprocessable Entity
```

The project should choose one consistent policy and apply it across all modules.

---

## Authentication Errors

Authentication errors occur when the backend cannot establish a valid identity.

Examples:

- Missing credentials
- Invalid credentials
- Expired session
- Invalid session token
- Revoked session
- Invalid verification token
- Invalid password-reset token

Typical status:

```text
401 Unauthorized
```

Authentication responses should avoid revealing unnecessary account information.

For example, password recovery should not reveal whether a submitted email address exists unless the product explicitly accepts that risk.

---

## Authorization Errors

Authorization errors occur when an authenticated user lacks permission to perform an operation.

Examples:

- Insufficient role
- Missing workspace permission
- Tenant access denied
- Administrative action denied
- Resource belongs to another user
- Feature unavailable to the user

Typical status:

```text
403 Forbidden
```

The backend must enforce authorization even when the frontend hides or disables an action.

---

## Resource Errors

Resource errors occur when a requested object cannot be found or accessed.

Examples:

- User not found
- Workspace not found
- File not found
- Report not found
- Route resource identifier does not exist

Typical status:

```text
404 Not Found
```

Where exposing resource existence would create a security risk, the backend may intentionally return the same not-found response for both missing and inaccessible resources.

---

## Conflict Errors

Conflict errors occur when a request conflicts with current system state.

Examples:

- Duplicate email
- Duplicate workspace name
- Resource already exists
- Version conflict
- State transition is no longer valid
- Concurrent update conflict
- Invitation already accepted

Typical status:

```text
409 Conflict
```

---

## Business Rule Errors

Business rule errors occur when input is technically valid but the requested action violates domain rules.

Examples:

- Subscription limit reached
- Invalid workflow transition
- Workspace cannot be deleted while active resources remain
- User cannot remove the final administrator
- Billing action not allowed in current account state
- Report cannot be generated before required data exists

Typical statuses may include:

```text
400 Bad Request
409 Conflict
422 Unprocessable Entity
```

The chosen status should reflect the nature of the failure and remain consistent across similar cases.

---

## Rate-Limit Errors

Rate-limit errors occur when a client exceeds an allowed request threshold.

Examples:

- Too many login attempts
- Too many password-reset requests
- Excessive API requests
- Upload frequency exceeded

Typical status:

```text
429 Too Many Requests
```

Where practical, responses should include retry information.

---

## External Service Errors

External service errors occur when a dependency fails.

Examples:

- Payment provider unavailable
- Email provider failure
- Cloud storage failure
- Identity provider timeout
- Notification provider failure

These errors should be translated into stable internal error categories.

Clients should not receive vendor-specific messages or identifiers unless intentionally included for support purposes.

Typical statuses may include:

```text
502 Bad Gateway
503 Service Unavailable
504 Gateway Timeout
```

---

## Infrastructure Errors

Infrastructure errors include failures in systems such as:

- Database
- Cache
- Queue
- File storage
- Network
- Secret provider
- Configuration service

These errors are usually not recoverable by the client.

Typical status:

```text
500 Internal Server Error
```

Or, where temporary unavailability is known:

```text
503 Service Unavailable
```

---

## Unexpected Errors

Unexpected errors are failures not represented by a known application error.

Examples:

- Programming defects
- Unhandled null values
- Unexpected library failures
- Broken assumptions
- Unknown runtime exceptions

These must be:

- Captured centrally
- Logged with diagnostic context
- Assigned a correlation identifier
- Returned as a generic internal error
- Reported to monitoring where appropriate

Clients must never receive stack traces or raw exception text.

---

# Standard Error Response

All API errors should use one normalized response structure.

Example:

```json
{
  "success": false,
  "error": {
    "code": "WORKSPACE_NOT_FOUND",
    "message": "The requested workspace could not be found.",
    "details": null,
    "fieldErrors": null,
    "correlationId": "01JXYZ123ABC456DEF"
  }
}
```

Recommended fields:

| Field | Purpose |
|---|---|
| `success` | Indicates that the request failed |
| `error.code` | Stable machine-readable application code |
| `error.message` | Safe user-facing or client-facing message |
| `error.details` | Optional structured non-field information |
| `error.fieldErrors` | Optional field-level validation failures |
| `error.correlationId` | Identifier used for tracing and support |

The exact envelope should remain stable across all modules.

---

# Validation Error Response

Validation errors should identify affected fields where possible.

Example:

```json
{
  "success": false,
  "error": {
    "code": "VALIDATION_FAILED",
    "message": "One or more fields are invalid.",
    "details": null,
    "fieldErrors": {
      "email": [
        "Enter a valid email address."
      ],
      "password": [
        "Password must contain at least eight characters."
      ]
    },
    "correlationId": "01JXYZ123ABC456DEF"
  }
}
```

Field names should correspond to public API contract names rather than internal database or domain-property names.

---

# Stable Error Codes

Every expected application error should have a stable machine-readable code.

Examples:

```text
VALIDATION_FAILED
AUTHENTICATION_REQUIRED
INVALID_CREDENTIALS
SESSION_EXPIRED
ACCESS_DENIED
RESOURCE_NOT_FOUND
WORKSPACE_NOT_FOUND
EMAIL_ALREADY_REGISTERED
SUBSCRIPTION_LIMIT_REACHED
INVALID_STATE_TRANSITION
RATE_LIMIT_EXCEEDED
EXTERNAL_SERVICE_UNAVAILABLE
INTERNAL_SERVER_ERROR
```

Error codes should:

- Use uppercase snake case
- Remain stable over time
- Avoid implementation details
- Be documented
- Be unique where client behavior differs
- Be broad where client behavior is identical

Clients should rely primarily on error codes and HTTP statuses, not exact message text.

---

# Error Messages

Client-facing messages should be:

- Clear
- Safe
- Concise
- Non-technical
- Localizable where necessary
- Consistent across modules

Messages should not expose:

- Stack traces
- SQL
- Database table names
- File-system paths
- Environment variables
- Provider credentials
- Internal class names
- Internal service topology
- Authorization rules that reveal sensitive structure

The backend should distinguish between:

- Internal diagnostic messages
- Public API messages
- Localized user-facing messages

These should not automatically be the same value.

---

# Exception Hierarchy

The backend should define a shared application exception hierarchy.

A conceptual structure may include:

```text
ApplicationError
├── ValidationError
├── AuthenticationError
├── AuthorizationError
├── NotFoundError
├── ConflictError
├── BusinessRuleError
├── RateLimitError
├── ExternalServiceError
└── InfrastructureError
```

Each application error should carry enough structured information to support:

- Error code
- Safe message
- HTTP status
- Optional details
- Optional field errors
- Logging severity
- Retry guidance
- Whether the error is expected

Framework-specific exceptions should be converted at the application boundary rather than being used throughout the domain.

---

# Global Exception Handler

A centralized exception handler should process all uncaught errors.

Its responsibilities include:

1. Detect known application errors.
2. Convert framework validation errors.
3. Convert authentication and authorization failures.
4. Normalize infrastructure exceptions.
5. Generate a correlation identifier.
6. Select the correct HTTP status.
7. Produce the standard error response.
8. Log diagnostic context.
9. Report unexpected failures.
10. Prevent sensitive information from reaching clients.

Controllers and route handlers should not duplicate this behavior.

---

# Domain and Application Errors

Domain logic should return or raise meaningful business errors.

Examples:

```text
CannotRemoveFinalAdministrator
WorkspaceSubscriptionLimitReached
InvitationAlreadyAccepted
ReportGenerationNotAllowed
InvalidWorkspaceStateTransition
```

These domain errors should be mapped into public application error codes.

The mapping layer prevents internal domain naming from becoming a permanent external API contract.

---

# Repository and Database Errors

Repositories should not leak database exceptions to application services or clients.

Database failures should be translated.

Examples:

```text
Unique constraint violation
    ↓
EMAIL_ALREADY_REGISTERED

Missing foreign key target
    ↓
RELATED_RESOURCE_NOT_FOUND

Deadlock or temporary database failure
    ↓
TEMPORARY_PERSISTENCE_FAILURE
```

Unexpected persistence failures should become infrastructure errors and be logged with diagnostic context.

Raw SQL and provider-specific error messages must not appear in API responses.

---

# External Integration Errors

External integration adapters should normalize vendor failures.

For example:

```text
Payment Provider Timeout
    ↓
PaymentGatewayUnavailable

Email Provider Rejected Request
    ↓
EmailDeliveryFailed

Cloud Storage Timeout
    ↓
FileStorageUnavailable
```

Business modules should depend on stable internal abstractions rather than provider-specific exceptions.

The error model should indicate whether an operation is:

- Safe to retry
- Unsafe to retry
- Already completed
- In an unknown state
- Pending reconciliation

This is particularly important for payments, file processing, and message delivery.

---

# Retry Behavior

Only transient failures should be retried automatically.

Potentially retryable failures include:

- Network timeout
- Temporary provider unavailability
- Queue-delivery failure
- Rate-limited dependency
- Temporary database connection failure

Errors that should generally not be retried include:

- Validation errors
- Authentication failures
- Authorization failures
- Business rule violations
- Missing resources
- Permanent provider rejection

Retries should use:

- Maximum-attempt limits
- Exponential backoff
- Jitter
- Idempotency safeguards
- Logging and metrics

---

# Idempotency

Operations that may be repeated due to retries should support idempotency where necessary.

Examples:

- Payment creation
- Subscription changes
- File-processing requests
- Invitation acceptance
- Report generation
- Webhook processing
- Background job execution

Idempotency prevents duplicate side effects when a client, worker, or external provider retries an operation.

---

# Background Job Errors

Background jobs cannot rely on HTTP responses, but they should use the same error classification system.

A job failure should record:

- Job name
- Job identifier
- Attempt number
- Error code
- Correlation or trace identifier
- Related business resource
- Retry eligibility
- Failure timestamp
- Safe diagnostic context

Permanent failures should be moved to a dead-letter or failed-job mechanism for investigation.

Sensitive payload data should not be stored unnecessarily.

---

# Logging

Error logs should be structured.

Recommended fields include:

```text
timestamp
severity
errorCode
exceptionType
message
correlationId
traceId
requestId
userId
workspaceId
route
httpMethod
statusCode
service
module
operation
duration
retryAttempt
environment
```

Not every field is required for every event.

Logs must not contain:

- Passwords
- Session tokens
- Access tokens
- API keys
- Full payment details
- Private file contents
- Sensitive personal information
- Raw request bodies without filtering

---

# Logging Severity

Suggested severity levels:

| Severity | Use |
|---|---|
| Debug | Development diagnostics |
| Info | Expected operational events |
| Warning | Recoverable or suspicious conditions |
| Error | Failed operation requiring attention |
| Critical | Severe system or security failure |

Expected client errors such as validation failures should not normally be logged as critical backend failures.

Unexpected exceptions should usually be logged at error or critical severity.

---

# Correlation and Trace Identifiers

Every request should have a correlation or request identifier.

The identifier should:

- Be created at the application boundary when absent
- Be passed through internal service calls
- Be propagated to jobs and integrations where practical
- Be included in error responses
- Be included in logs
- Be searchable in monitoring systems

This allows support and engineering teams to trace a client-visible failure through the backend.

---

# Security Considerations

Error handling must not reveal information useful to attackers.

Important rules include:

- Use generic login failures.
- Do not reveal whether protected resources exist.
- Do not expose internal authorization logic.
- Do not expose database or provider messages.
- Sanitize logged request data.
- Treat repeated authentication failures as a security signal.
- Rate-limit sensitive endpoints.
- Record suspicious patterns in security monitoring.
- Avoid different responses that permit account enumeration.

Security-sensitive errors may require separate audit events in addition to operational logs.

---

# Localization

Stable error codes should remain language-neutral.

Message localization may occur:

- In the backend
- In the frontend using the error code
- Through a combined strategy

The selected strategy must remain consistent.

For TEED, frontend localization based on stable backend error codes is generally preferred for interactive user interfaces, while the backend should always provide a safe fallback message.

The same API contract should support English, Swahili, and future languages.

---

# HTTP Status Standards

Recommended general mapping:

| Situation | Status |
|---|---:|
| Invalid request syntax or input | 400 |
| Authentication required or invalid | 401 |
| Authenticated but not permitted | 403 |
| Resource unavailable or hidden | 404 |
| State or uniqueness conflict | 409 |
| Semantic validation failure | 422 |
| Request limit exceeded | 429 |
| Unexpected backend failure | 500 |
| Upstream service failure | 502 |
| Temporary service unavailability | 503 |
| Upstream timeout | 504 |

Statuses should not be selected arbitrarily by individual modules.

---

# Success Response Consistency

Although this document focuses on errors, successful responses should also follow shared API conventions.

Example:

```json
{
  "success": true,
  "data": {
    "id": "workspace_123",
    "name": "Example Workspace"
  },
  "meta": null
}
```

Using compatible success and error envelopes can simplify client processing, but the project should avoid unnecessary response nesting where it provides no practical value.

---

# Frontend Contract

The frontend should receive enough structured information to:

- Display a global message
- Attach errors to form fields
- Redirect after session expiration
- Show permission-denied states
- Retry transient operations
- Display conflict-resolution UI
- Record a correlation identifier for support
- Translate known error codes
- Fall back safely for unknown errors

The frontend must not parse raw exception messages to determine behavior.

---

# Testing Requirements

Error handling should be covered through:

- Unit tests for error classes
- Unit tests for error mapping
- Validation response tests
- Authentication error tests
- Authorization tests
- Business-rule tests
- Repository translation tests
- External integration failure tests
- Global exception-handler tests
- Security leakage tests
- Retry tests
- Idempotency tests
- Background-job failure tests
- API contract tests

Tests should verify both status codes and response bodies.

---

# Operational Monitoring

The backend should monitor:

- Internal error rate
- Error rate by module
- Error rate by endpoint
- Authentication failure rate
- Authorization failure rate
- External provider failures
- Database failures
- Background-job retries
- Dead-letter queue growth
- Rate-limit activity
- Response latency during failures
- Repeated errors by correlation pattern

Alerts should focus on actionable operational conditions rather than every expected client error.

---

# Development Rules

Developers must follow these rules:

1. Do not return raw exceptions.
2. Do not create ad hoc error response formats.
3. Do not expose infrastructure messages.
4. Use shared application errors.
5. Use stable error codes.
6. Preserve the original error as internal diagnostic context when appropriate.
7. Log unexpected failures centrally.
8. Include correlation identifiers.
9. Keep client messages safe.
10. Write tests for new error conditions.
11. Document publicly observable error codes.
12. Keep backend and frontend error contracts synchronized.

---

# Acceptance Criteria

The error-handling architecture is correctly implemented when:

- Every API error uses the standard response contract.
- Expected errors have stable machine-readable codes.
- Validation errors support field-level information.
- HTTP statuses are selected consistently.
- Raw exceptions never reach clients.
- Unexpected failures receive correlation identifiers.
- Logs contain useful structured context.
- Sensitive information is excluded from logs and responses.
- Repository and provider exceptions are normalized.
- Background jobs use the same error taxonomy.
- Retry behavior is restricted to transient failures.
- Critical side-effect operations support idempotency.
- Frontend clients do not depend on raw message text.
- Error behavior is covered by automated tests.

---

# Architecture Summary

The TEED backend uses centralized, structured, and secure error handling.

All failures move through a shared classification and mapping process before they reach clients, logs, monitoring systems, background workers, or external integrations.

The public contract consists of:

- An appropriate HTTP status
- A stable application error code
- A safe message
- Optional structured details
- Optional field errors
- A correlation identifier

This architecture ensures predictable client behavior, safer diagnostics, clearer operations, and consistent error handling across all backend modules.