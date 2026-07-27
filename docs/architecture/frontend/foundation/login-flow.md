# `docs/frontend/foundation/login-flow.md`

# Login Flow

## Purpose

This document defines the complete login flow for the TEED frontend.

It specifies the responsibilities, user interface behavior, validation, request lifecycle, navigation, session establishment, accessibility, and testing requirements for user authentication.

The goal is to provide a predictable, secure, and consistent login experience across web, PWA, and future mobile clients.

---

# Objectives

The login flow should:

* Authenticate valid users securely.
* Prevent duplicate submissions.
* Display clear validation feedback.
* Handle backend authentication responses consistently.
* Establish the application session.
* Redirect users safely.
* Support accessibility and internationalization.
* Integrate with the shared authentication infrastructure.

---

# Scope

This document covers:

* Login page
* Login form
* Client-side validation
* Login submission
* Authentication API integration
* Successful authentication
* Failed authentication
* Navigation
* Session establishment trigger
* Login testing

It does not cover:

* Registration
* Password recovery
* Email verification
* Multi-factor authentication
* Session restoration

---

# Login Route

Recommended route:

```text
/login
```

The login page should be accessible only through the Identity Layout.

Authenticated users should normally be redirected to their appropriate destination.

---

# Page Responsibilities

The login page should:

* Render the login form.
* Display authentication messages.
* Perform client-side validation.
* Submit credentials.
* Handle loading state.
* Display translated errors.
* Initiate session establishment after successful authentication.
* Redirect users after authentication.

The page should not communicate directly with HTTP clients.

---

# Login Components

Recommended composition:

```text
LoginPage
    │
    ├── PageHeader
    ├── LoginForm
    ├── AuthenticationMessages
    ├── SubmitButton
    ├── ForgotPasswordLink
    ├── RegisterLink
    └── LanguageSwitcher
```

Each component should have a single responsibility.

---

# Login Form Fields

Minimum fields:

```text
Email Address
Password
Remember Me (optional)
Submit Button
```

Optional additions:

* Show password toggle
* Caps Lock indicator
* Device trust option (future)
* Social login buttons (future)

---

# Form State

The form should maintain only UI state.

Example:

```text
Email

Password

Remember Me

Submitting

Validation Errors
```

Authentication state belongs to the Session Provider.

---

# Client Validation

The frontend should validate:

### Email

* Required
* Valid email format
* Trim whitespace

### Password

* Required
* Minimum length if required by UX
* Preserve entered characters

Client validation should improve usability but never replace backend validation.

---

# Validation Schema

Validation should use a centralized schema.

Example:

```typescript
const loginSchema = z.object({
  email: z
    .string()
    .trim()
    .email(),

  password: z
    .string()
    .min(1),
});
```

The same schema should be reused throughout the application where appropriate.

---

# Password Input

Password fields should:

* Hide characters by default.
* Support password managers.
* Allow temporary visibility toggle.
* Preserve entered value after validation failure.
* Never display password contents elsewhere.

---

# Remember Me

If supported, "Remember Me" should influence session persistence according to backend policy.

The frontend should not independently determine session duration.

---

# Initial Page State

When opened, the page should display:

* Empty form
* No validation errors
* Enabled submit button
* Keyboard focus on the email field
* Translated labels

---

# Submission Flow

High-level flow:

```text
User enters credentials
        │
        ▼
Client Validation
        │
        ▼
Authentication Request
        │
        ▼
Backend Response
        │
 ┌──────┴────────┐
 │               │
Success        Failure
 │               │
 ▼               ▼
Session      Display Error
Created
 │
 ▼
Redirect
```

---

# Duplicate Submission Prevention

During submission:

* Disable submit button.
* Prevent repeated requests.
* Display loading indicator.
* Preserve entered values.

The user should not accidentally submit multiple login requests.

---

# Loading State

While authenticating:

* Form remains visible.
* Submit button becomes disabled.
* Loading indicator is shown.
* Password field remains masked.
* Navigation remains predictable.

The loading state should clearly communicate progress.

---

# Authentication Service

The login form should call the centralized Authentication Service.

Example responsibility:

```text
LoginForm
      │
      ▼
AuthenticationService
      │
      ▼
Global API Client
      │
      ▼
Backend
```

The page should not build HTTP requests directly.

---

# Authentication Request

The authentication request should include only the required credentials.

Typical fields:

```text
Email

Password

Remember Me (optional)
```

Additional security metadata should be managed by shared infrastructure when required.

---

# Successful Authentication

On success:

1. Authentication response received.
2. Session established.
3. Current user loaded if required.
4. Session Provider updated.
5. Query cache prepared.
6. Redirect performed.

The login page should not manually populate unrelated application state.

---

# Session Establishment

The login page should delegate session creation to the Session Provider.

It should never update authentication state directly.

The Session Provider remains the single source of truth.

---

# Redirect After Login

Recommended priority:

```text
Validated Return Destination

↓

User Default Landing Page

↓

First Authorized Module

↓

Application Dashboard
```

Unsafe or external redirect targets must be ignored.

---

# Safe Redirects

Redirect destinations must:

* Be internal.
* Match approved routes.
* Avoid redirect loops.
* Exclude external hosts.
* Exclude unsupported protocols.

The login page must never perform open redirects.

---

# Failed Authentication

Authentication failures should:

* Preserve entered email.
* Preserve password unless security policy requires clearing.
* Display translated error.
* Return focus appropriately.
* Allow immediate retry.

The page should remain usable without requiring refresh.

---

# Authentication Error Categories

Possible categories include:

```text
Invalid Credentials

Account Locked

Verification Required

Password Expired

Account Disabled

Too Many Attempts

Unexpected Error
```

Backend responses should be normalized by the Authentication Service.

---

# Displaying Errors

Errors should:

* Be understandable.
* Avoid exposing security details.
* Be translated.
* Be accessible to assistive technologies.
* Remain close to the relevant form.

Raw backend messages should not be displayed directly.

---

# Network Failures

If the request cannot reach the backend:

Display:

* Connection message
* Retry option
* Preserved form values

The user should not lose entered information because of temporary connectivity issues.

---

# Unexpected Errors

Unexpected failures should:

* Display generic translated message.
* Log diagnostic information.
* Avoid exposing internal implementation details.
* Allow retry.

The application should remain stable.

---

# Account Lock Handling

If the backend reports a locked account:

The frontend should:

* Display appropriate explanation.
* Disable repeated automatic retries if instructed.
* Provide recovery guidance when available.

Business rules remain backend controlled.

---

# Verification Required

If email verification is required:

The frontend should navigate to the verification workflow.

It should not independently determine verification status.

---

# Accessibility

The login page should support:

* Keyboard-only interaction.
* Screen readers.
* Visible focus indicators.
* Semantic labels.
* Accessible validation.
* Live-region error announcements.
* Logical tab order.

Password visibility controls must also be accessible.

---

# Internationalization

All text should come from translation resources.

Examples:

* Labels
* Buttons
* Validation
* Errors
* Success messages
* Help text

The page should support runtime language switching.

---

# Responsive Design

The login page should support:

Desktop

Tablet

Mobile

Installed PWA

Layouts should adapt without changing workflow.

---

# Browser Autofill

The login form should work correctly with browser password managers.

Autocomplete attributes should be configured appropriately.

The frontend should not disable password manager functionality without justification.

---

# Security Considerations

The login page should never:

* Log passwords.
* Store passwords outside controlled input state.
* Include passwords in URLs.
* Cache passwords.
* Display passwords in notifications.

Credentials should exist only as long as necessary to complete authentication.

---

# Logging

Client logging may include:

* Login started
* Login completed
* Login failed
* Network failure

Logs must never contain:

* Passwords
* Authentication secrets
* Sensitive personal information

---

# Analytics

If analytics are enabled, events may include:

```text
login_attempt

login_success

login_failure
```

Analytics must not contain credentials or sensitive backend messages.

---

# Login Completion

Authentication is considered complete only after:

* Session Provider reports authenticated.
* Required initialization finishes.
* Navigation completes.

Receiving a successful HTTP response alone does not complete the login process.

---

# Related Documents

See also:

```text
authentication-overview.md

session-establishment.md

authentication-errors.md

logout-and-session-expiration.md
```

---

# Testing Requirements

The login flow should include:

## Unit Tests

* Validation schema
* Request transformation
* Error normalization

## Component Tests

* Successful submission
* Validation errors
* Loading state
* Disabled button
* Error rendering
* Accessibility

## Integration Tests

* Authentication Service integration
* Session Provider updates
* Redirect behavior

## End-to-End Tests

* Successful login
* Invalid credentials
* Network failure
* Session creation
* Safe redirect
* Authenticated user redirected away from login
* Keyboard-only login
* Mobile layout

---

# Acceptance Criteria

The login flow is complete when:

* Validation is centralized.
* Duplicate submissions are prevented.
* Authentication uses the shared service.
* Session Provider owns authentication state.
* Successful login redirects safely.
* Authentication errors are translated.
* Network failures are handled gracefully.
* Accessibility requirements are satisfied.
* Password managers function correctly.
* Automated tests cover critical behavior.

---

# Architecture Rules

1. The login page communicates only through the Authentication Service.
2. Credentials are validated before submission.
3. Session state is managed exclusively by the Session Provider.
4. Duplicate submissions must be prevented.
5. Redirects must be validated before navigation.
6. Passwords must never be logged or persisted outside controlled input state.
7. Backend responses must be normalized before presentation.
8. All login interfaces must support accessibility and internationalization.
9. Successful authentication is complete only after session establishment.
10. Login behavior must remain consistent across web, PWA, and future mobile clients.
