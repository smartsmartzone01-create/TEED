# `docs/frontend/foundation/password-recovery.md`

# Password Recovery

## Purpose

This document defines the password recovery workflow for the TEED frontend.

It covers the complete process of helping users regain access to their accounts through secure password reset mechanisms while maintaining a consistent user experience and adhering to the overall authentication architecture.

Password recovery consists of two independent workflows:

1. Forgot Password
2. Reset Password

Both workflows rely on backend-controlled security policies.

---

# Objectives

The password recovery flow should:

* Allow users to request password reset securely.
* Support reset links received by email.
* Prevent information disclosure.
* Handle expired and invalid reset links.
* Validate new passwords.
* Guide users back to authentication.
* Support accessibility, localization, PWA, and future mobile clients.

---

# Scope

This document covers:

* Forgot Password page
* Reset Password page
* Password reset email request
* Password reset token handling
* Password reset submission
* Success and failure states
* Navigation
* Testing

This document does **not** cover:

* Login
* Registration
* Email verification
* MFA
* Session restoration

---

# Password Recovery Principles

The frontend should:

* Never verify reset tokens locally.
* Never expose whether an account exists.
* Never display security-sensitive backend information.
* Treat reset tokens as opaque values.
* Delegate all password policy enforcement to backend services.

The backend remains the authority for password recovery.

---

# High-Level Flow

```text id="g8d3yk"
Forgot Password
        │
        ▼
User Enters Email
        │
        ▼
Backend Sends Email
        │
        ▼
User Opens Reset Link
        │
        ▼
Reset Password Page
        │
        ▼
Submit New Password
        │
        ▼
Password Updated
        │
        ▼
Login
```

---

# Routes

Recommended routes:

```text id="f0v2np"
/forgot-password

/reset-password

/reset-password/:token
```

The exact URL structure should follow backend API contracts.

---

# Workflow 1 — Forgot Password

## Purpose

The Forgot Password page allows users to request a password reset email.

The page should not indicate whether the submitted email belongs to an existing account.

---

# Page Responsibilities

The page should:

* Collect email address.
* Validate email format.
* Submit recovery request.
* Display confirmation.
* Handle failures gracefully.

The page should not determine whether an account exists.

---

# Page Structure

Recommended composition:

```text id="iwsm0n"
ForgotPasswordPage
        │
        ├── PageHeader
        ├── ForgotPasswordForm
        ├── AuthenticationMessages
        ├── SubmitButton
        └── BackToLoginLink
```

---

# Form Fields

Required fields:

```text id="gw4qeg"
Email Address

Submit Button
```

No additional information should be required.

---

# Client Validation

Validate:

* Required
* Valid email format
* Trim whitespace

Example:

```typescript id="6cf6hd"
const forgotPasswordSchema =
  z.object({
    email: z
      .string()
      .trim()
      .email(),
  });
```

Validation improves usability but does not replace backend validation.

---

# Submission Flow

```text id="h6lmwd"
Enter Email
      │
      ▼
Client Validation
      │
      ▼
Authentication Service
      │
      ▼
Backend
      │
      ▼
Display Confirmation
```

---

# Confirmation Message

Regardless of whether the email exists, the frontend should display a neutral confirmation.

Example:

> If an account exists for this email address, a password reset email has been sent.

This prevents account enumeration.

---

# Duplicate Requests

During submission:

* Disable submit button.
* Prevent repeated requests.
* Show loading indicator.

---

# Resending Requests

Users may request another reset email.

Backend rate limiting determines whether another request is permitted.

The frontend should present appropriate guidance.

---

# Workflow 2 — Reset Password

## Purpose

The Reset Password page allows users to submit a new password using a backend-issued reset token.

---

# Reset Page Responsibilities

The page should:

* Read reset token.
* Validate new password fields.
* Submit reset request.
* Display progress.
* Handle success.
* Handle failures.
* Navigate users back to login.

The page should not validate tokens locally.

---

# Page Structure

Recommended composition:

```text id="lwqspg"
ResetPasswordPage
        │
        ├── PageHeader
        ├── ResetPasswordForm
        ├── AuthenticationMessages
        ├── SubmitButton
        └── BackToLoginLink
```

---

# Form Fields

Required fields:

```text id="m6i90m"
New Password

Confirm Password

Submit Button
```

---

# Validation

Validate:

* Required password
* Password confirmation
* Password format (UI guidance)
* Matching passwords

Example:

```typescript id="aj0lmq"
const resetPasswordSchema =
  z.object({
    password: z.string().min(8),

    confirmPassword:
      z.string(),
  })
  .refine(
    (data) =>
      data.password ===
      data.confirmPassword,
    {
      path: [
        "confirmPassword",
      ],
    },
  );
```

---

# Reset Token

The reset token should:

* Be read from the route.
* Be treated as opaque.
* Never be decoded.
* Never be logged.
* Never be stored unnecessarily.

Token validation belongs to backend services.

---

# Reset Flow

```text id="9l2bgo"
User Opens Link
        │
        ▼
Reset Page
        │
        ▼
Enter Password
        │
        ▼
Authentication Service
        │
        ▼
Backend Validation
        │
   ┌────┴────┐
   │         │
Success   Failure
```

---

# Successful Reset

On success:

Display:

* Success message
* Confirmation
* Continue to Login button

Automatic login should occur only if supported by backend policy.

---

# Failed Reset

Possible reasons:

* Invalid token
* Expired token
* Token already used
* Weak password
* Unexpected backend failure

The frontend should normalize backend responses.

---

# Expired Reset Link

If the link has expired:

Display:

* Explanation
* Request new reset email
* Return to login

Users should not need to manually restart the recovery process.

---

# Invalid Reset Link

If the link is invalid:

Provide:

* Friendly explanation
* Forgot Password link
* Login link

Avoid exposing implementation details.

---

# Already Used Token

If the backend reports that the token has already been consumed:

Display:

* Informational message
* Request another reset option

Do not repeatedly retry the request.

---

# Authentication Service

Both workflows should use the centralized Authentication Service.

```text id="v65bsp"
Forgot Password
Reset Password
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

Pages must never construct HTTP requests directly.

---

# Session Behavior

Password reset does not necessarily establish an authenticated session.

Possible outcomes:

```text id="ch6tw9"
Password Updated
        │
        ├── Login Required
        │
        └── Session Created
```

The frontend should follow backend instructions.

---

# Error Categories

Normalized errors may include:

```text id="1itjlwm"
Invalid Token

Expired Token

Weak Password

Too Many Requests

Unexpected Error

Network Failure
```

---

# Accessibility

Forgot Password and Reset Password pages should support:

* Keyboard navigation
* Screen readers
* Accessible validation
* Accessible loading indicators
* Logical focus management
* Live-region announcements

---

# Internationalization

All interface text should use translation resources.

Including:

* Labels
* Instructions
* Errors
* Success messages
* Buttons
* Password guidance

---

# Responsive Design

Password recovery should work consistently on:

* Desktop
* Tablet
* Mobile
* Installed PWA

Layouts may change, but workflows should remain identical.

---

# Security Considerations

The frontend must never:

* Reveal whether an email exists.
* Decode reset tokens.
* Log reset tokens.
* Store passwords outside controlled input state.
* Include passwords in URLs.
* Display backend security information.

Backend security policies remain authoritative.

---

# Logging

Allowed logs:

* Recovery requested
* Reset started
* Reset completed
* Reset failed

Never log:

* Passwords
* Reset tokens
* Sensitive backend responses

---

# Analytics

Possible events:

```text id="xpk5zw"
password_recovery_requested

password_reset_started

password_reset_completed

password_reset_failed
```

Sensitive information must never be included.

---

# Related Documents

```text id="8hmqew"
authentication-overview.md

login-flow.md

email-verification.md

authentication-errors.md

session-establishment.md
```

---

# Testing Requirements

## Unit Tests

* Validation schemas
* Password confirmation
* Token extraction
* Payload transformation

## Component Tests

* Forgot Password submission
* Reset Password submission
* Loading states
* Success messages
* Error handling
* Accessibility

## Integration Tests

* Authentication Service integration
* Navigation after reset
* Backend error normalization

## End-to-End Tests

* Successful recovery request
* Unknown email submission
* Successful password reset
* Expired token
* Invalid token
* Weak password
* Network failure
* Keyboard-only workflow
* Mobile layout

---

# Acceptance Criteria

The password recovery flow is complete when:

* Forgot Password and Reset Password are independent workflows.
* Account enumeration is prevented.
* Reset tokens are treated as opaque.
* Password confirmation is validated.
* Expired and invalid links are handled gracefully.
* Authentication Service is used consistently.
* Accessibility and localization requirements are satisfied.
* Automated tests cover all major recovery scenarios.

---

# Architecture Rules

1. Password recovery decisions belong exclusively to the backend.
2. The frontend must never reveal whether an account exists.
3. Reset tokens must be treated as opaque values.
4. Password recovery requests must use the centralized Authentication Service.
5. Reset tokens and passwords must never be logged or persisted unnecessarily.
6. Password reset does not imply authentication unless explicitly instructed by the backend.
7. Password recovery interfaces must support accessibility and internationalization.
8. Password recovery workflows must remain consistent across web, PWA, and future mobile clients.
9. Backend responses must be normalized before presentation.
10. Password recovery must remain compatible with future MFA and enhanced identity workflows.
