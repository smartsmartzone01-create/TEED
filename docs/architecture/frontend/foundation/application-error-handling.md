# `docs/frontend/foundation/application-error-handling.md`

# Application Error Handling Architecture

## Purpose

This document defines the error handling architecture for the TEED frontend.

Its purpose is to ensure that every error—whether caused by user input, backend validation, network failures, application bugs, or unexpected runtime conditions—is handled consistently, predictably, and recoverably.

The error architecture should improve user experience, simplify debugging, support observability, and prevent duplicated error-handling logic throughout the application.

---

# Objectives

The error handling architecture should:

* Centralize error handling.
* Normalize errors into a common application model.
* Distinguish between user-facing and diagnostic information.
* Support graceful recovery.
* Prevent application crashes where possible.
* Integrate with routing, state management, and API services.
* Support web, PWA, and future mobile clients.

---

# Scope

This document covers:

* Error classification
* Error ownership
* Error propagation
* Error recovery
* Global error boundaries
* API errors
* Validation errors
* Runtime exceptions
* Async failures
* Logging
* Observability
* Testing

This document complements, but does not replace, `authentication-errors.md`, which focuses specifically on authentication workflows.

---

# Core Principle

Errors should be handled at the lowest layer capable of resolving them.

```text
Component
      │
      ▼
Page
      │
      ▼
Module
      │
      ▼
Global Handler
```

An error should only propagate upward if the current layer cannot recover safely.

---

# Error Categories

All application errors should belong to one primary category.

Recommended categories:

```text
Validation

Authentication

Authorization

Network

Timeout

Conflict

Not Found

Rate Limited

Server

Runtime

Configuration

Offline

Unexpected
```

A normalized category allows the UI to behave consistently regardless of backend implementation.

---

# Error Ownership

Each layer owns specific error types.

| Layer         | Responsibility              |
| ------------- | --------------------------- |
| Component     | Local interaction failures  |
| Page          | Workflow recovery           |
| Module        | Business operation failures |
| Service Layer | API normalization           |
| Runtime       | Global failures             |

Error ownership should remain explicit.

---

# Error Lifecycle

```text
Failure

↓

Detection

↓

Normalization

↓

Recovery Decision

↓

User Feedback

↓

Logging

↓

Optional Retry
```

Every recoverable error should follow the same lifecycle.

---

# Error Model

All recoverable application errors should follow a common interface.

Example:

```typescript
interface ApplicationError {
  category: string;
  code?: string;
  messageKey: string;
  retryable: boolean;
  requestId?: string;
  details?: unknown;
}
```

This model should be shared across the application.

---

# User Message vs Diagnostic Data

Errors should separate:

User-facing information

from

Developer diagnostics.

Example:

```text
User

↓

"Unable to save project."

Developer

↓

ValidationError
PROJECT_NAME_EXISTS
Request ID
HTTP 409
```

Raw backend messages should generally not be shown directly to end users.

---

# Error Propagation

Errors should propagate only when necessary.

Example:

```text
API Client

↓

Service

↓

Mutation

↓

Page

↓

Global Boundary
```

Each layer should have the opportunity to recover before passing the error upward.

---

# Recoverable Errors

Recoverable examples include:

* Validation failures
* Temporary network failures
* Retryable server errors
* Expired sessions
* Missing permissions
* Offline state

The application should remain usable.

---

# Non-Recoverable Errors

Examples:

* Corrupted runtime state
* Invalid application configuration
* Rendering failures
* Critical provider initialization failure

These may require application-level recovery or reload.

---

# Runtime Exceptions

Unexpected runtime exceptions should be captured by global error boundaries.

Examples include:

* Rendering exceptions
* Hook misuse
* Unexpected null references
* Provider failures

Individual pages should not crash the entire application.

---

# Global Error Boundary

The root application should include an error boundary.

Responsibilities:

* Catch rendering failures.
* Display fallback UI.
* Preserve diagnostics.
* Allow safe recovery.
* Prevent blank screens.

Example:

```text
Runtime Exception

↓

Error Boundary

↓

Fallback UI

↓

Optional Reload
```

---

# Route-Level Error Boundaries

Large route groups may implement additional boundaries.

Example:

```text
Application Layout

↓

Workspace Module

↓

Workspace Boundary
```

This limits failures to the affected module.

---

# API Errors

The API layer should normalize transport failures before exposing them.

Possible outcomes:

```text
Validation

Authentication

Authorization

Conflict

Server

Timeout

Offline
```

Pages should consume normalized errors only.

---

# Validation Errors

Validation errors should support:

* Field-specific messages
* Form-level messages
* Server validation
* Client validation

Validation errors should never appear as generic application failures.

---

# Authentication Errors

Authentication failures should follow the dedicated authentication architecture.

Examples:

* Invalid credentials
* Expired session
* MFA required
* Verification required

Session recovery should remain centralized.

---

# Authorization Errors

Authorization failures should normally result in:

* Hidden UI
* Disabled actions
* Access denied pages
* Navigation redirects

They should not appear as unexpected application failures.

---

# Network Errors

Possible causes:

* Connection loss
* DNS failure
* Gateway unavailable
* Temporary outage

Network failures should provide retry opportunities when appropriate.

---

# Timeout Errors

Timeouts should be distinguished from general network failures.

Possible recovery:

* Retry
* Background refresh
* Contact support
* Retry later

Timeout messaging should clearly explain that the request exceeded the allowed duration.

---

# Offline Errors

Offline mode should be handled separately.

Possible behaviors:

* Display cached data.
* Disable unavailable actions.
* Queue eligible operations.
* Notify users when connectivity returns.

Offline should not be treated as an unexpected error.

---

# Conflict Errors

Conflict errors indicate concurrent state changes.

Examples:

* Updated resource
* Deleted resource
* Version mismatch

Possible recovery:

```text
Refresh

↓

Review Changes

↓

Retry
```

---

# Rate Limiting

Rate-limited operations should:

* Prevent repeated submissions.
* Respect backend retry timing.
* Display remaining wait time if provided.

Repeated retries should not occur automatically.

---

# Configuration Errors

Critical startup failures include:

* Missing API URL
* Invalid environment
* Broken configuration schema

These should fail during application initialization rather than later during user interaction.

---

# Error Recovery

Possible recovery actions include:

* Retry
* Refresh data
* Refresh page
* Reauthenticate
* Return to previous page
* Contact support

Recovery should be specific to the error category.

---

# Retry Policy

Retry should be available only when appropriate.

Suitable examples:

* Temporary network failure
* Retryable server error
* Background synchronization

Not appropriate:

* Validation failure
* Permission failure
* Malformed requests

Retry behavior should remain consistent throughout the application.

---

# Duplicate Errors

Repeated identical errors should not overwhelm users.

The notification system should:

* Merge duplicates.
* Prevent notification spam.
* Respect cooldown periods.

Diagnostics may still record each occurrence.

---

# Notifications

Error presentation depends on scope.

Examples:

| Scope  | Presentation      |
| ------ | ----------------- |
| Form   | Inline validation |
| Page   | Page alert        |
| Global | Toast or banner   |
| Fatal  | Error boundary    |

Presentation should match user impact.

---

# Background Errors

Background refresh failures should not unnecessarily interrupt users.

Examples:

* Silent retry
* Small status indicator
* Non-blocking notification

Visible content should remain usable whenever possible.

---

# Loading Recovery

Loading indicators should transition cleanly into:

* Success
* Empty
* Error
* Retry

Loading screens should never persist indefinitely after failure.

---

# Accessibility

Error handling must support:

* Screen-reader announcements
* Focus management
* Accessible validation
* Keyboard recovery
* Proper ARIA attributes

Users should always understand what went wrong and how to recover.

---

# Internationalization

All user-facing error messages should use translation resources.

Translation keys should remain stable.

Example:

```text
errors.network

errors.validation.required

errors.sessionExpired
```

Dynamic backend text should be minimized.

---

# Security

Errors must never expose:

* Stack traces
* SQL errors
* Internal identifiers
* Secrets
* Tokens
* Passwords

Diagnostics belong in logs—not user interfaces.

---

# Logging

Application logs may include:

* Error category
* Request ID
* Module
* Route
* Stack trace (development)
* Correlation ID

Sensitive information must always be excluded.

---

# Observability

The error architecture should integrate with observability.

Useful metrics:

```text
Runtime Errors

API Failures

Validation Failures

Retry Count

Crash Frequency

Recovery Success Rate
```

These metrics support operational monitoring without affecting user experience.

---

# Analytics

Business analytics should record only meaningful product failures.

Examples:

```text
checkout_failed

project_creation_failed

workspace_switch_failed
```

Transport-level failures belong to observability rather than product analytics.

---

# Folder Structure

Recommended placement:

```text
src/
    services/
        global/
            errorMapper.ts

    hooks/
        global/

    types/
        global/
            errors.ts

    components/
        global/
            ErrorBoundary/
            ErrorAlert/
            RetryPanel/
```

Feature modules should reuse shared infrastructure instead of creating independent error systems.

---

# Testing Requirements

## Unit Tests

Test:

* Error normalization
* Category mapping
* Retry policy
* Translation mapping
* Recovery helpers

## Component Tests

Test:

* Error boundary
* Inline validation
* Toast presentation
* Retry panel
* Accessibility

## Integration Tests

Test:

* API failure recovery
* Authentication expiration
* Offline behavior
* Route boundaries
* Duplicate suppression

## End-to-End Tests

Test:

* Validation errors
* Network failures
* Server failures
* Offline mode
* Timeout recovery
* Session expiration
* Route crashes
* Retry workflows
* Mobile error handling

---

# Acceptance Criteria

The application error architecture is complete when:

* All errors are normalized into a shared application model.
* Error ownership is clearly defined across architectural layers.
* Runtime exceptions are isolated through error boundaries.
* API, validation, network, and configuration errors are handled consistently.
* User-facing messages remain localized and accessible.
* Diagnostics are separated from user-visible content.
* Retry behavior follows documented policies.
* Duplicate errors do not overwhelm users.
* Logging and observability capture sufficient diagnostic information without exposing sensitive data.
* Recovery paths are available wherever technically feasible.

---

# Architecture Rules

1. Every recoverable error must be normalized into the shared `ApplicationError` model.
2. Errors must be handled at the lowest layer capable of resolving them.
3. User-facing messages must remain separate from diagnostic information.
4. Runtime exceptions must be isolated using global and route-level error boundaries.
5. Validation, authentication, authorization, and transport failures must remain distinct error categories.
6. Retry behavior must be consistent and limited to eligible operations.
7. Duplicate user notifications must be suppressed or consolidated.
8. Error messages must support accessibility and internationalization.
9. Sensitive implementation details must never be exposed in the UI or logs.
10. Error handling must integrate with routing, state management, API services, and observability while remaining compatible with web, PWA, and future mobile clients.

