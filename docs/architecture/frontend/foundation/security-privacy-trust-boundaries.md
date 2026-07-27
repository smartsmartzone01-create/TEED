# `docs/frontend/foundation/security-privacy-and-frontend-trust-boundaries.md`

# Security, Privacy, and Frontend Trust Boundaries

## Purpose

This document defines the frontend security, privacy, and trust-boundary architecture for TEED.

It establishes which data and decisions the frontend may trust, which controls must remain authoritative on the backend, how sensitive information should be handled, how browser and platform capabilities should be isolated, and how frontend code should respond to security-relevant failures.

The frontend is an untrusted client operating on a user-controlled device. It may improve usability, enforce presentation rules, and reduce accidental misuse, but it must never be treated as an authoritative security boundary.

---

# Objectives

The architecture should:

* Define explicit frontend trust boundaries.
* Keep authorization and security decisions authoritative on the backend.
* Minimize exposure and persistence of sensitive information.
* Standardize secure handling of sessions, credentials, files, URLs, and user content.
* Prevent unsafe rendering and injection.
* Define privacy-safe telemetry and analytics behavior.
* Isolate third-party integrations.
* Support secure PWA and future mobile-wrapper behavior.
* Provide predictable handling for authentication, authorization, and security failures.
* Make security requirements clear enough for developers and AI-assisted implementation.

---

# Scope

This document covers:

* Frontend trust boundaries
* Authentication-related frontend responsibilities
* Authorization presentation
* Session and credential handling
* Sensitive data classification
* Browser storage
* Cookies
* Cross-site request protections
* Injection prevention
* Unsafe HTML
* URL and navigation security
* File security
* Third-party scripts and services
* Content Security Policy readiness
* Privacy and telemetry
* Logging and error reporting
* User consent
* Permissions and platform APIs
* PWA security
* Supply-chain risk
* Security testing
* Incident and failure behavior

Backend authentication, authorization, data validation, and audit requirements remain authoritative and should be documented separately.

---

# Core Principle

The frontend must assume that all client-controlled state can be inspected, modified, replayed, or bypassed.

```text
Frontend Control
    │
    ├── Improves usability
    ├── Guides valid interaction
    ├── Hides unavailable actions
    └── Prevents accidental misuse

Backend Control
    │
    ├── Authenticates identity
    ├── Authorizes actions
    ├── Validates data
    ├── Protects resources
    └── Enforces business rules
```

Frontend behavior must never be the only enforcement mechanism for a protected operation.

---

# Threat Model

The frontend should assume that an attacker may:

* Modify JavaScript at runtime.
* Change application state in developer tools.
* Call backend APIs directly.
* Replay requests.
* Change hidden or disabled values.
* Manipulate URLs and route parameters.
* Alter browser storage.
* Upload malicious files.
* Inject untrusted content.
* Use an outdated application version.
* Run the application in a compromised browser environment.
* Automate interaction outside expected UI flows.

Architecture decisions must remain safe under these assumptions.

---

# Trust Boundaries

The primary frontend trust boundaries are:

1. Backend API boundary
2. Browser runtime boundary
3. User-input boundary
4. Stored-data boundary
5. Third-party integration boundary
6. Cross-window and cross-tab boundary
7. Service-worker boundary
8. Future native-wrapper boundary

Each boundary should have explicit validation and ownership.

---

# Backend API Boundary

All backend responses should be treated as external input.

Even trusted backend services may return:

* Unexpected values
* Partial responses
* Deprecated fields
* Unknown enum values
* Malformed error payloads
* Stale authorization state
* Content originally supplied by other users

Frontend code should normalize and validate data at appropriate boundaries.

---

# Backend Authority

The backend must remain authoritative for:

* User identity
* Session validity
* Permissions
* Resource ownership
* Data visibility
* Business constraints
* Uniqueness
* Rate limits
* File acceptance
* Payment state
* Subscription state
* Audit state
* Security-sensitive feature availability

Frontend state may represent these decisions but cannot replace them.

---

# User-Input Boundary

All user-entered values are untrusted.

This includes:

* Form fields
* Search terms
* Rich text
* Filenames
* Uploaded files
* Query parameters
* Route parameters
* Clipboard content
* Dragged content
* Imported files
* Browser extension input
* Data received through platform sharing

Frontend validation improves usability but does not make input trusted.

---

# Stored-Data Boundary

Data read from browser storage must be treated as untrusted.

Possible risks include:

* Manual modification
* Data from an older application version
* Corruption
* Cross-tab races
* Partial writes
* Browser extensions
* Shared-device access

Stored values should be parsed, validated, versioned, and safely rejected when invalid.

---

# Third-Party Boundary

Third-party code and services operate outside direct TEED control.

Examples include:

* Analytics providers
* Error-reporting providers
* Payment components
* Mapping services
* File viewers
* Authentication providers
* Customer-support widgets
* Embedded media

Each integration should receive only the minimum data required.

---

# Service Worker Boundary

The service worker runs separately from the visible application and may outlive individual page sessions.

It should be treated as privileged infrastructure with limited responsibilities.

It must not:

* Store unrestricted sensitive application data.
* contain business authorization logic.
* cache protected responses indiscriminately.
* replay non-idempotent requests without explicit queue rules.
* expose private content across users on shared devices.

---

# Native-Wrapper Boundary

A future mobile wrapper may expose platform capabilities such as:

* Secure storage
* Biometrics
* Filesystem access
* Push notifications
* Camera access
* Native sharing
* Deep linking

Frontend modules should access these capabilities through approved abstractions.

Platform availability must not be confused with authorization.

---

# Authentication Responsibilities

The frontend may:

* Collect credentials.
* Submit authentication requests.
* Display session state.
* Redirect based on authentication status.
* Clear local application state on logout.
* Respond to expiration and revocation.
* Guide verification or recovery workflows.

The frontend must not:

* Authenticate a user independently.
* infer session validity from stored profile data.
* generate authorization claims.
* extend session validity locally.
* trust a decoded token without backend enforcement.
* treat route access as proof of authentication.

---

# Session Establishment

Session establishment should rely on an authoritative backend response.

The frontend should only enter an authenticated state after the approved session contract succeeds.

A stored user profile, cached route, or previously rendered page must not establish authentication.

---

# Session Restoration

On startup, the frontend may restore session state through the approved session endpoint or credential mechanism.

During restoration, the application should use an explicit state such as:

```text
unknown

restoring

authenticated

unauthenticated

failed
```

Protected routes should not render sensitive content before restoration completes.

---

# Session Expiration

When the backend reports an expired or invalid session, the frontend should:

* Stop protected requests where appropriate.
* Clear sensitive in-memory state.
* Clear approved user-scoped caches.
* remove prohibited persisted state.
* preserve only safe recoverable drafts where policy allows.
* redirect or present reauthentication.
* explain the effect on unsaved work where possible.

The frontend must not repeatedly retry invalid credentials.

---

# Logout

Logout should coordinate:

* Backend session termination
* Query-cache cleanup
* User-scoped storage cleanup
* Cross-tab propagation
* Service-worker and offline-cache policy
* Notification cleanup
* Route transition
* Future mobile session adapters

A visual redirect alone is not sufficient logout behavior.

---

# Cross-Tab Session Behavior

Authentication changes should propagate across tabs where supported.

Examples include:

* Logout
* Session expiration
* Account suspension
* Workspace access change

Cross-tab events are notifications, not trusted authorization evidence.

Each tab should still rely on backend responses.

---

# Credentials

Credentials include:

* Passwords
* One-time codes
* Recovery codes
* Session identifiers
* Access tokens
* Refresh tokens
* API secrets
* Signed upload credentials
* Payment authorization values

Credentials should have the shortest practical lifetime and narrowest exposure.

---

# Password Handling

Password fields should:

* Use appropriate password input semantics.
* avoid logging and analytics capture.
* avoid unnecessary local state duplication.
* avoid persistence.
* support approved password-manager behavior.
* clear when workflow security requires it.
* never appear in URLs.
* never be included in error diagnostics.

Password strength guidance must not imply that frontend validation is authoritative.

---

# One-Time Codes

One-time codes should:

* Be treated as sensitive temporary credentials.
* have limited display lifetime.
* not be persisted.
* not be logged.
* not be included in analytics.
* be cleared after success or invalidation.
* remain protected from accidental reuse where practical.

The backend must enforce expiration and attempt limits.

---

# Token Handling

Token strategy must follow the approved authentication architecture.

The frontend should avoid exposing tokens to application code when a safer backend-controlled cookie strategy is available.

Where tokens are used, the architecture must explicitly define:

* Storage location
* Lifetime
* Renewal
* Revocation
* Audience
* Scope
* Cross-tab behavior
* Logout cleanup
* XSS implications

No module should invent its own token storage mechanism.

---

# Token Decoding

Decoded token contents may be used as non-authoritative display hints only when the architecture explicitly permits it.

They must not be used as the sole basis for:

* Permission enforcement
* Resource ownership
* Session validity
* Subscription access
* Administrative status

Claims may be stale, forged in local state, or invalidated by the backend.

---

# Cookies

Cookies used for authentication should be backend-controlled and configured according to the approved security policy.

Relevant attributes may include:

* `HttpOnly`
* `Secure`
* `SameSite`
* Narrow path
* Appropriate domain
* Explicit expiration

Frontend JavaScript should not attempt to read `HttpOnly` cookies.

---

# Cross-Site Request Protection

When authentication uses cookies, state-changing requests must follow the approved CSRF protection model.

Possible mechanisms include:

* Same-site cookie policy
* CSRF tokens
* Origin validation
* Custom request headers
* Backend framework protections

The shared API client should centralize any required CSRF behavior.

Pages and services
