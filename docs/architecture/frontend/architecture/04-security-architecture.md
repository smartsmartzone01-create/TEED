# TEED Frontend Architecture

## Part 4 — Security, Storage, Observability, Deployment, Governance, and Implementation Readiness

---

# Frontend Security Boundaries

The frontend is responsible for presenting secure user experiences, protecting locally handled data, and avoiding insecure implementation patterns.

However, the frontend must never be treated as the final enforcement layer for security.

The backend remains authoritative for:

* Authentication
* Authorization
* Permission enforcement
* Tenant isolation
* Data ownership
* Business rules
* Financial integrity
* State transitions
* Sensitive validation
* Audit requirements

Frontend security controls improve usability and reduce accidental misuse, but they do not replace backend enforcement.

---

# Frontend Security Objectives

The TEED frontend should:

* Minimize exposure of sensitive information
* Avoid storing secrets unnecessarily
* Use centralized session handling
* Prevent accidental credential leakage
* Avoid unsafe HTML rendering
* Handle authentication expiration safely
* Respect permission information from the backend
* Protect sensitive routes
* Use secure browser capabilities
* Remain compatible with future secure mobile storage
* Avoid logging confidential information
* Support secure deployment practices

---

# Trust Boundaries

The frontend should treat all external input as untrusted.

This includes:

* API responses
* URL parameters
* Search parameters
* Form input
* Uploaded files
* Browser storage
* Third-party library output
* Deep-link data
* PWA cached data
* Mobile wrapper messages
* External redirect parameters

Even when data originates from the backend, it should be handled according to the expected contract.

Unexpected data should fail safely.

---

# Client-Side Authorization

The frontend may use backend-provided permissions to:

* Hide unavailable navigation items
* Disable unauthorized actions
* Protect routes
* Avoid displaying inaccessible pages
* Improve user guidance
* Reduce unnecessary API requests

Example:

```tsx
const { can } = usePermission();

if (!can("workspace.member.invite")) {
  return null;
}
```

This is a presentation control only.

The backend endpoint must independently enforce the same permission.

---

# Permission Architecture

Permissions should be represented using stable backend-defined identifiers.

Examples:

```text
workspace.view
workspace.update
workspace.member.invite
workspace.member.remove
product.create
product.update
product.delete
billing.invoice.view
billing.payment.manage
```

The frontend should not invent independent permission names for the same backend capability.

Permission checks should use shared utilities.

Recommended locations:

```text
src/global/hooks/use-permission.ts
src/global/helpers/permissions.ts
src/global/types/permission.types.ts
```

---

# Permission Check Standard

Permission checks should be explicit.

Example:

```typescript
const canInviteMember = can("workspace.member.invite");
```

Avoid unclear checks such as:

```typescript
if (user.isAllowed) {
  ...
}
```

Permission identifiers should communicate the exact capability being checked.

---

# Role and Permission Separation

The frontend should prefer permission-based checks over hardcoded role-name checks.

Preferred:

```typescript
can("product.update");
```

Avoid:

```typescript
user.role === "admin";
```

Roles may change while permissions remain the stable capability contract.

Role checks may be used only when the backend explicitly defines role identity as part of the user experience.

---

# Sensitive Data Rendering

Sensitive data should be displayed only when required.

Examples include:

* Personal details
* Financial information
* Payment references
* Session information
* Audit data
* Private workspace information
* Secret configuration values
* Internal identifiers

Sensitive fields should support:

* Permission checks
* Masking where appropriate
* Explicit reveal actions
* Accessible labels
* Safe clipboard behavior
* No accidental inclusion in logs

The frontend should avoid displaying internal secrets even if they appear in an API response unexpectedly.

---

# Unsafe HTML

Raw HTML should not be rendered from untrusted content.

React’s default escaping behavior should be preserved.

The use of:

```tsx
dangerouslySetInnerHTML
```

should require explicit review.

When rich HTML content is necessary, it should be sanitized using an approved sanitization strategy.

Markdown or rich-content rendering libraries should also be evaluated for injection risks.

---

# Cross-Site Scripting Protection

Frontend code should reduce cross-site scripting risks by:

* Avoiding unsafe HTML injection
* Escaping user-controlled content
* Sanitizing approved rich-text input
* Avoiding JavaScript URL execution
* Avoiding string-generated event handlers
* Using secure third-party rendering libraries
* Restricting dynamic script loading
* Supporting a Content Security Policy

The backend and deployment platform should provide compatible security headers.

---

# Cross-Site Request Forgery

The frontend authentication model should align with backend CSRF requirements.

If authentication uses cookies, the frontend should support:

* CSRF token handling
* Same-site cookie rules
* Credentialed requests
* Trusted-origin configuration

If bearer credentials are used, token handling should follow the frontend security standard.

The selected authentication mechanism must be documented clearly.

---

# Authentication Credential Handling

Credential handling should be centralized.

Individual pages, components, and module API functions should not:

* Read raw tokens directly
* Write tokens directly
* Refresh sessions independently
* Build authentication headers manually
* Clear only part of a session
* Decide credential storage behavior

These responsibilities belong to the session and API infrastructure.

---

# Credential Storage Strategy

The final storage strategy should be defined in the Frontend Security document.

Possible storage mechanisms include:

* Secure HTTP-only cookies
* In-memory access credentials
* Browser storage abstractions
* Mobile secure storage
* Platform-managed sessions

The architecture should avoid assuming that one browser storage mechanism will work securely across web, PWA, Android, and iOS environments.

---

# Access Credentials

Short-lived access credentials should be preferred where token-based authentication is used.

Access credentials should:

* Expire quickly
* Be refreshed centrally
* Be cleared on logout
* Not be written to logs
* Not be exposed through URLs
* Not be embedded in static configuration
* Not be shared between unrelated applications

---

# Refresh Credentials

Refresh credentials require stronger protection because they may create new access credentials.

Where supported, the system should use:

* Rotation
* Revocation
* Device or session tracking
* Reuse detection
* Expiration
* Logout invalidation

The frontend should prevent multiple simultaneous refresh attempts from creating request loops.

---

# Session Coordination

When multiple API requests fail because an access credential expired, the frontend should coordinate one refresh process.

Conceptual flow:

```text
Multiple Requests Fail
         │
         ▼
Detect Expired Access Session
         │
         ▼
Start One Refresh Request
         │
         ├── Refresh Succeeds
         │       │
         │       ▼
         │   Retry Eligible Requests
         │
         └── Refresh Fails
                 │
                 ▼
           End Local Session
```

Requests that are unsafe to retry automatically should not be repeated without explicit rules.

---

# Logout Architecture

Logout should clear all session-related frontend state.

This may include:

* Access credentials
* Refresh-session state
* Authenticated user cache
* Permission cache
* Protected query cache
* Temporary onboarding state
* Sensitive draft data
* Device-session identifiers where applicable

The backend logout or revocation endpoint should be called where required.

Local cleanup should still occur if the network request fails.

---

# Session Expiration

Session expiration should produce a consistent experience.

The frontend should:

* Stop protected requests
* Clear protected state
* Notify the user
* Redirect to authentication
* Preserve a safe intended destination where appropriate
* Avoid infinite redirect loops
* Avoid repeatedly displaying the same message

Sensitive unsaved work should not be silently retained without a defined policy.

---

# Client-Side Storage Architecture

All browser or device storage should be accessed through shared abstractions.

Recommended structure:

```text
src/global/platform/
├── storage/
│   ├── storage.interface.ts
│   ├── web-storage.service.ts
│   └── storage.service.ts
│
├── notifications/
├── network/
├── files/
└── device/
```

This supports future replacement of web implementations with mobile implementations.

---

# Storage Categories

Frontend data should be classified before storage.

Suggested categories:

```text
Public Preferences
Non-Sensitive Application State
Temporary Workflow Data
Sensitive User Data
Authentication Credentials
Cached Server Data
```

Each category should have explicit rules.

---

## Public Preferences

Examples:

* Theme
* Language
* Table density
* Non-sensitive layout preferences

These may be stored persistently through the platform storage abstraction.

---

## Non-Sensitive Application State

Examples:

* Dismissed onboarding hints
* Selected dashboard view
* Preferred page size

This data may be persisted when useful.

---

## Temporary Workflow Data

Examples:

* Multi-step form progress
* Temporary filters
* Unsaved drafts

Storage should depend on:

* Sensitivity
* Expected lifetime
* Resume requirements
* Cross-device expectations

Temporary data should have cleanup rules.

---

## Sensitive User Data

Examples:

* Personal information
* Financial values
* Private business data
* Confidential workspace content

Sensitive data should not be persisted locally without an explicit business and security requirement.

---

## Authentication Credentials

Authentication credentials should use the approved session strategy.

Developers should not choose storage independently per feature.

---

## Cached Server Data

TanStack Query may hold server data in memory.

Persistent query caching should not be introduced until the project defines:

* Data classification
* Encryption expectations
* Expiration
* User switching
* Logout cleanup
* Offline access
* Tenant isolation
* Cache invalidation

---

# Storage Key Naming

Storage keys should be centralized.

Example:

```typescript
export const STORAGE_KEYS = {
  language: "teed.language",
  theme: "teed.theme",
  installPromptDismissed: "teed.pwa.install-prompt-dismissed",
} as const;
```

Modules should not create uncontrolled key names.

Versioning may be used where stored formats may change.

Example:

```text
teed.v1.language
```

---

# Storage Cleanup

Storage cleanup should occur when appropriate.

Triggers may include:

* Logout
* Session expiration
* User switch
* Tenant switch
* Application migration
* Storage schema change
* Security incident
* Feature removal

Public preferences may remain after logout unless the product rules state otherwise.

Sensitive state should be removed.

---

# URL Security

Sensitive values must not be placed in URLs.

Avoid using URLs for:

* Access tokens
* Refresh tokens
* Passwords
* Private personal information
* Full payment details
* Secret configuration
* Long-lived verification credentials

Short-lived verification or reset tokens may appear in URLs when required by the backend flow, but they should be:

* Time-limited
* Single-use where appropriate
* Removed from visible history when practical
* Exchanged safely
* Never logged intentionally

---

# Redirect Security

Redirect parameters should be validated.

Example:

```text
/login?next=/workspace
```

The frontend should not redirect users to arbitrary external URLs based only on untrusted query parameters.

Allowed internal destinations should be validated.

External redirects should use an explicit allowlist where needed.

---

# File Upload Security

File upload interfaces should validate:

* File presence
* File size
* Expected extension
* Expected MIME type
* Maximum count
* User feedback

Frontend validation is only advisory.

The backend must inspect and validate uploads independently.

The frontend should not assume that a file is safe because the browser reports an expected MIME type.

---

# Clipboard Security

Sensitive clipboard actions should be deliberate.

The frontend should:

* Clearly label copied content
* Avoid copying secrets automatically
* Provide confirmation
* Avoid logging copied values
* Consider automatic masking
* Support permission checks

Clipboard availability may differ across browser, PWA, and mobile environments and should use an abstraction where necessary.

---

# Third-Party Integration Boundaries

Third-party scripts and SDKs should be introduced carefully.

Examples include:

* Analytics
* Error reporting
* Payment widgets
* Maps
* Customer support
* Rich editors
* Push notifications

Each integration should be reviewed for:

* Data collection
* Privacy
* Script execution
* Bundle impact
* Browser permissions
* Mobile compatibility
* Maintenance
* Security history
* Content Security Policy requirements
* Failure behavior

Third-party integrations should not receive more user data than required.

---