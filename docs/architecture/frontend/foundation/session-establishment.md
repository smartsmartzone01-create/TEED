# `docs/frontend/foundation/session-establishment.md`

# Session Establishment and Lifecycle

## Purpose

This document defines how the TEED frontend establishes, restores, manages, refreshes, and terminates authenticated user sessions.

The session infrastructure is responsible for maintaining authentication state throughout the lifetime of the application while remaining secure, predictable, and independent of UI components.

This document builds on the authentication architecture and integrates with the API client, routing, and provider infrastructure.

---

# Objectives

The session infrastructure should:

* Establish authenticated sessions consistently.
* Restore existing sessions during application startup.
* Coordinate token or session refresh.
* Prevent duplicate refresh operations.
* Maintain a single source of truth for authentication state.
* Handle session expiration gracefully.
* Support web, PWA, and future mobile clients.

---

# Scope

This document covers:

* Session lifecycle
* Session Provider
* Session states
* Session establishment
* Session restoration
* Session refresh
* Session expiration
* Session termination
* API client integration
* Routing integration
* Testing

It does **not** define:

* Login UI
* Registration
* Email verification
* Password recovery
* Permission management

---

# Session Principles

The session infrastructure should follow these principles:

* The backend is the source of truth.
* Authentication state is centralized.
* Only one active session state exists.
* Components never own authentication state.
* Session transitions are explicit.
* Session restoration completes before route protection decisions.

---

# Session Ownership

Only the Session Provider owns:

* Authentication status
* Current authenticated user
* Session initialization
* Session restoration
* Refresh coordination
* Logout
* Session expiration

No page or component should duplicate these responsibilities.

---

# High-Level Architecture

```text id="l4kpt7"
Application
      │
      ▼
Session Provider
      │
      ▼
Authentication Service
      │
      ▼
Global API Client
      │
      ▼
Backend Identity APIs
```

The Session Provider coordinates the lifecycle but delegates network communication to the Authentication Service and API Client.

---

# Session Lifecycle

The complete lifecycle is:

```text id="o2f8wj"
Application Starts
        │
        ▼
Initialize Session
        │
        ▼
Attempt Restoration
        │
 ┌──────┴──────┐
 │             │
Found       Not Found
 │             │
 ▼             ▼
Authenticated  Guest
 │
 ▼
Application Usage
 │
 ▼
Refresh When Needed
 │
 ▼
Logout / Expired
```

---

# Session States

The Session Provider should expose explicit states.

Recommended values:

```text id="v4dgr8"
Initializing

Authenticated

Refreshing

Unauthenticated

Expired

Error
```

These states should be represented as an explicit union or enum rather than boolean flags.

---

# Initializing

During initialization:

* Application starts.
* Existing session is checked.
* Protected routes remain suspended.
* Session restoration occurs.

No authentication redirects should happen during this state.

---

# Authenticated

Authenticated means:

* Backend recognizes the current session.
* User information is available.
* Protected routes may render.
* Authorized API requests may proceed.

---

# Refreshing

Refreshing indicates:

* Session renewal is in progress.
* Existing protected UI may remain visible.
* Duplicate refresh operations must be prevented.

Refreshing should be transparent whenever possible.

---

# Unauthenticated

Unauthenticated indicates:

* No valid session exists.
* Protected routes are unavailable.
* Guest routes may render.

---

# Expired

Expired indicates:

* Session previously existed.
* Backend no longer accepts it.
* User authentication must be re-established.

The user should be redirected according to the routing architecture.

---

# Error

Error indicates:

* Session initialization failed.
* Session restoration failed unexpectedly.
* Authentication infrastructure cannot determine the current state.

This state should present a controlled recovery interface.

---

# Session Provider Responsibilities

The Session Provider should expose:

* Session status
* Current user
* Current tenant or workspace context (if applicable)
* Authentication helpers
* Logout function
* Session initialization status

Business-specific state should not be stored here.

---

# Session Context

Example interface:

```typescript id="i4x0db"
interface SessionContext {
  status: SessionStatus;

  user?: CurrentUser;

  initialize(): Promise<void>;

  logout(): Promise<void>;

  refresh(): Promise<void>;
}
```

The exact implementation may evolve, but the public contract should remain stable.

---

# Session Establishment

Session establishment begins after successful authentication.

High-level flow:

```text id="u7n2jk"
Successful Login
        │
        ▼
Authentication Service
        │
        ▼
Backend Response
        │
        ▼
Session Provider
        │
        ▼
Authenticated State
```

Pages should never establish sessions directly.

---

# Session Initialization

Initialization occurs once during application startup.

Responsibilities include:

* Determine current authentication state.
* Restore previous session when available.
* Load authenticated user information if required.
* Prepare application providers.

Initialization should complete before route guards evaluate authentication.

---

# Session Restoration

Restoration attempts to recover an existing authenticated session.

Possible outcomes:

```text id="crdz4s"
Valid Session

No Session

Expired Session

Initialization Failure
```

The backend determines whether restoration succeeds.

---

# Startup Flow

```text id="kdfzsv"
Application Boot
        │
        ▼
Session Initialization
        │
        ▼
Route Rendering
```

Application rendering should wait for session resolution where protected routes are involved.

---

# Current User Loading

After authentication is confirmed, the application may request current user information.

Typical sequence:

```text id="qu0okv"
Session Valid
      │
      ▼
Load Current User
      │
      ▼
Update Session Provider
```

Current user loading should not be duplicated across pages.

---

# Refresh Coordination

Refreshing should be coordinated centrally.

If multiple requests detect session renewal simultaneously:

```text id="jlwm2v"
Request A
Request B
Request C
      │
      ▼
Single Refresh Operation
      │
      ▼
Resume Requests
```

The Session Provider or API Client should ensure only one refresh operation occurs at a time.

---

# Duplicate Refresh Prevention

The application must never issue multiple concurrent refresh requests for the same session.

Concurrent requests should wait for the active refresh operation.

---

# Refresh Success

If refresh succeeds:

* Session state remains authenticated.
* Waiting requests resume.
* No user-visible interruption occurs.

---

# Refresh Failure

If refresh fails:

* Session becomes expired.
* Authentication state updates.
* Pending protected requests fail appropriately.
* User is redirected according to routing rules.

---

# Session Expiration

Sessions may expire because of:

* Timeout
* Manual logout
* Backend revocation
* Security policy
* Credential changes

The frontend should react consistently regardless of the cause.

---

# Session Timeout

If the backend reports timeout:

The frontend should:

* Update session state.
* Clear authenticated context.
* Redirect appropriately.
* Display translated guidance when appropriate.

---

# Manual Logout

Logout begins when the user explicitly requests it.

Flow:

```text id="h6gzkw"
User Requests Logout
        │
        ▼
Authentication Service
        │
        ▼
Backend Logout
        │
        ▼
Session Cleanup
        │
        ▼
Guest State
```

Session cleanup should occur even if the backend logout request cannot be completed.

---

# Session Cleanup

Cleanup should remove:

* Current user
* Cached authenticated state
* Protected query data
* Session-specific providers
* Temporary authentication data

Cleanup should occur centrally.

---

# Query Cache Integration

When authentication changes:

The Query Client should invalidate or remove authenticated queries as appropriate.

Example:

```text id="cqu4zn"
Authenticated

↓

Logout

↓

Clear Protected Queries
```

Cached data belonging to one user must not remain visible to another.

---

# Routing Integration

The Session Provider integrates with:

* Session Guard
* Guest Guard
* Protected layouts
* Authentication redirects

Routing remains responsible for navigation.

The Session Provider remains responsible for authentication state.

---

# API Client Integration

The API Client should:

* Include authentication information.
* Detect unauthorized responses.
* Coordinate refresh requests.
* Notify the Session Provider of expiration.

The Session Provider should not perform HTTP requests directly.

---

# Storage Strategy

Session persistence should use the approved storage strategy defined by the platform architecture.

The Session Provider should not depend directly on browser storage APIs.

Storage implementation should remain abstracted to support:

* Web
* PWA
* Future mobile clients

---

# Cross-Tab Synchronization

Where supported, authentication changes should synchronize across browser tabs.

Examples:

```text id="ayuwmf"
Logout

↓

Other Tabs Become Guest
```

Synchronization mechanisms should remain platform-appropriate and abstracted from business logic.

---

# Offline Behavior

When offline:

* Existing authenticated state may remain available.
* Session validation cannot be assumed.
* Protected API requests may fail.
* Session expiration should not be guessed locally.

Connectivity recovery should trigger appropriate validation.

---

# Session Error Recovery

Unexpected session failures should provide:

* Generic translated message
* Retry option
* Reload application option
* Return to login option

Internal implementation details should not be exposed.

---

# Accessibility

Session transitions should support:

* Focus management
* Accessible loading indicators
* Live-region announcements where appropriate
* Predictable navigation

Session changes should not confuse keyboard or screen-reader users.

---

# Internationalization

All session-related messages should use translation resources.

Examples include:

* Session expired
* Logging out
* Restoring session
* Authentication required
* Retry

---

# Logging

Permitted client logs:

* Session initialized
* Session restored
* Refresh started
* Refresh completed
* Logout
* Session expired

Sensitive authentication information must never be logged.

---

# Analytics

Possible analytics events:

```text id="v08hfh"
session_initialized

session_restored

session_refreshed

session_expired

logout
```

Analytics must exclude authentication secrets and personal credentials.

---

# Related Documents

```text id="nkkd4l"
authentication-overview.md

login-flow.md

logout-and-session-expiration.md

authentication-errors.md

routing.md
```

---

# Testing Requirements

## Unit Tests

* Session state transitions
* Session reducer/state logic
* Refresh coordination
* Cleanup logic

## Component Tests

* Session Provider initialization
* Loading state
* Expiration handling
* Logout behavior

## Integration Tests

* API Client integration
* Route guard integration
* Query cache cleanup
* Session restoration

## End-to-End Tests

* Fresh application startup
* Session restoration
* Expired session
* Successful refresh
* Failed refresh
* Logout
* Multiple protected requests during refresh
* Cross-tab logout (where supported)

---

# Acceptance Criteria

The session infrastructure is complete when:

* Session Provider is the single source of authentication state.
* Session initialization occurs before authentication redirects.
* Session restoration is supported.
* Duplicate refresh requests are prevented.
* Expired sessions are handled consistently.
* Protected query data is cleaned during logout.
* Routing integrates with session state.
* Accessibility and localization requirements are satisfied.
* Automated tests cover all critical session transitions.

---

# Architecture Rules

1. The Session Provider is the only owner of authentication state.
2. Components must never duplicate session state.
3. Session initialization must complete before protected routing decisions.
4. Session restoration must follow backend validation.
5. Refresh operations must be centrally coordinated.
6. Only one refresh request may execute at a time.
7. Session cleanup must remove protected application state.
8. Storage implementation must remain abstracted from browser APIs.
9. Session behavior must remain compatible with web, PWA, and future mobile clients.
10. Session lifecycle events must be predictable, testable, and independent of page components.
