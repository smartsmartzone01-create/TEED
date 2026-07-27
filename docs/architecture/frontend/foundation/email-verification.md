# `docs/frontend/foundation/email-verification.md`

# Email Verification

## Purpose

This document defines the email verification workflow for the TEED frontend.

Email verification confirms that a user controls the email address associated with their account before access to protected functionality is granted.

This document describes the frontend responsibilities, user experience, navigation, token handling, error handling, accessibility, and testing requirements.

---

# Objectives

The email verification flow should:

* Verify user email ownership.
* Guide users through verification clearly.
* Support verification links from emails.
* Handle expired and invalid verification links.
* Allow verification email resending.
* Integrate with the authentication architecture.
* Support web, PWA, and future mobile clients.

---

# Scope

This document covers:

* Verification page
* Verification links
* Verification request
* Verification success
* Verification failure
* Expired verification links
* Resend verification email
* Navigation
* Testing

This document does **not** cover:

* Registration
* Login
* Password recovery
* MFA
* Session restoration

---

# Verification Principles

Email verification should:

* Be initiated by the backend.
* Be completed by the backend.
* Never expose verification secrets.
* Remain idempotent where possible.
* Guide users clearly through the process.

The frontend is responsible only for the user experience.

---

# Verification Route

Recommended routes:

```text
/verify-email

/verify-email/:token
```

The exact URL structure should follow backend API contracts.

---

# Verification Entry Points

Users may arrive through:

```text
Registration Complete
        │
        ▼
Verification Screen

OR

Verification Email Link
        │
        ▼
Verification Route

OR

Resend Verification
        │
        ▼
Verification Screen
```

All entry points should converge on the same verification workflow.

---

# Verification Page Responsibilities

The verification page should:

* Explain why verification is required.
* Handle verification links.
* Display verification progress.
* Display verification results.
* Allow email resend when appropriate.
* Guide users to the next authentication step.

The page should not verify tokens locally.

---

# Verification States

Recommended UI states:

```text
Waiting For Verification

Verifying

Verified

Verification Failed

Verification Expired

Already Verified

Resending Email

Network Error
```

Each state should have a dedicated interface.

---

# Waiting State

When awaiting verification:

Display:

* Explanation
* Registered email (when appropriate)
* Resend option
* Return to login
* Change email option (if supported)

The page should clearly explain the next step.

---

# Verification Link

Verification emails should contain a backend-generated verification link.

Example:

```text
https://example.com/verify-email/<token>
```

The frontend should treat the token as opaque.

It should never inspect or decode verification tokens.

---

# Verification Flow

```text
User Opens Verification Link
            │
            ▼
Verification Page
            │
            ▼
Authentication Service
            │
            ▼
Backend Verification API
            │
      ┌─────┴─────┐
      │           │
 Success       Failure
      │           │
      ▼           ▼
Verified     Display Error
```

Verification decisions belong exclusively to the backend.

---

# Automatic Verification

If a verification token exists in the URL:

The frontend should automatically begin verification after page initialization.

Users should not need to manually press a verification button.

---

# Verification Progress

While verification is running:

* Show progress indicator.
* Prevent duplicate requests.
* Keep layout stable.
* Avoid unnecessary navigation.

The page should remain accessible.

---

# Successful Verification

On success:

Display:

* Success message
* Confirmation icon
* Next step guidance

Possible next actions include:

```text
Continue to Login

Continue to Application

Continue to Onboarding
```

The backend determines the appropriate outcome.

---

# Already Verified

If the backend reports that the account is already verified:

Display:

* Informational message
* Continue button

This should not be treated as an application error.

---

# Verification Failure

Failures may include:

* Invalid token
* Expired token
* Already used token
* User unavailable
* Backend failure

The frontend should present translated, user-friendly messages.

---

# Invalid Verification Link

If the verification link is invalid:

Display:

* Explanation
* Resend verification option
* Return to login
* Return to registration

Avoid displaying backend implementation details.

---

# Expired Verification Link

Expired links should guide the user toward requesting another verification email.

Recommended actions:

* Resend verification
* Return to login

Expired links should not require the user to restart registration.

---

# Resend Verification Email

The verification page should allow users to request another verification email.

Flow:

```text
User Requests Resend
        │
        ▼
Authentication Service
        │
        ▼
Backend
        │
   Success/Failure
```

The backend determines whether resend is permitted.

---

# Resend Button

During resend:

* Disable button.
* Show loading state.
* Prevent duplicate requests.

The interface should indicate when another request may be attempted.

---

# Resend Rate Limiting

If resend is temporarily unavailable:

Display:

* Friendly explanation
* Retry guidance

The frontend should respect backend rate-limiting responses.

---

# Navigation

Possible navigation options:

```text
Login

Registration

Resend Verification

Continue

Contact Support
```

Navigation should remain consistent with the authentication architecture.

---

# Authentication Service

Verification requests should use the centralized Authentication Service.

```text
Verification Page
        │
        ▼
Authentication Service
        │
        ▼
Global API Client
        │
        ▼
Backend
```

Verification pages should never construct HTTP requests directly.

---

# Session Behavior

Verification does not necessarily establish an authenticated session.

Possible backend outcomes:

```text
Verified
      │
      ├── Login Required
      │
      ├── Session Created
      │
      └── Continue Registration
```

The frontend must follow backend responses.

---

# Error Categories

Possible normalized errors:

```text
Invalid Token

Expired Token

Already Verified

Too Many Requests

Verification Failed

Unexpected Error

Network Failure
```

Raw backend messages should not be displayed.

---

# Network Failures

If the verification request cannot be completed:

Display:

* Network message
* Retry action
* Return navigation

Users should not be left in an undefined state.

---

# Accessibility

Verification pages should support:

* Keyboard navigation
* Screen readers
* Accessible progress indicators
* Accessible success messages
* Live-region status updates
* Logical focus management

Verification status changes should be announced appropriately.

---

# Internationalization

All interface text should come from translation resources.

Including:

* Instructions
* Buttons
* Success messages
* Error messages
* Retry guidance

---

# Responsive Design

The verification workflow should support:

* Desktop
* Tablet
* Mobile
* Installed PWA

The verification process should remain identical across platforms.

---

# Security Considerations

The frontend should never:

* Decode verification tokens.
* Log verification tokens.
* Persist verification tokens unnecessarily.
* Display backend security information.
* Attempt local verification.

Verification authority belongs exclusively to backend services.

---

# Logging

Permitted logs:

* Verification started
* Verification completed
* Verification failed
* Resend requested

Sensitive tokens must never appear in client logs.

---

# Analytics

Possible events:

```text
verification_started

verification_success

verification_failed

verification_resend
```

Analytics must exclude verification tokens and sensitive backend information.

---

# Related Documents

See also:

```text
authentication-overview.md

registration-flow.md

login-flow.md

authentication-errors.md

session-establishment.md
```

---

# Testing Requirements

## Unit Tests

* Token extraction
* Request transformation
* Error normalization

## Component Tests

* Verification progress
* Success state
* Failure state
* Expired state
* Resend behavior
* Accessibility

## Integration Tests

* Authentication Service integration
* Navigation after verification
* Backend error handling

## End-to-End Tests

* Valid verification link
* Invalid token
* Expired token
* Already verified account
* Successful resend
* Rate-limited resend
* Network failure
* Mobile layout
* Keyboard-only navigation

---

# Acceptance Criteria

The verification flow is complete when:

* Verification uses the Authentication Service.
* Tokens are treated as opaque values.
* Automatic verification occurs when appropriate.
* Success and failure states are clearly presented.
* Expired links support resend.
* Duplicate resend requests are prevented.
* Accessibility requirements are satisfied.
* Translation is complete.
* Automated tests cover all major verification paths.

---

# Architecture Rules

1. Email verification decisions belong exclusively to the backend.
2. Verification tokens must be treated as opaque values.
3. Verification requests must use the centralized Authentication Service.
4. Verification tokens must never be logged or persisted unnecessarily.
5. Verification pages must support automatic verification from valid links.
6. Resend requests must prevent duplicate submissions.
7. Verification interfaces must support accessibility and internationalization.
8. Verification behavior must follow backend responses rather than frontend assumptions.
9. Verification workflows must remain consistent across web, PWA, and future mobile clients.
10. Verification completion does not automatically imply session establishment unless instructed by the backend.
