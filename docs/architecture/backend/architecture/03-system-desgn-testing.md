# TEED Frontend Architecture

## Part 3 — Forms, Design System, Accessibility, Internationalization, Performance, and Testing

---

# Form Architecture

Forms are a major part of the TEED frontend and should follow one consistent architecture.

Examples include:

* Login forms
* Registration forms
* Verification forms
* Password reset forms
* Business profile forms
* Workspace forms
* Product forms
* Inventory forms
* Billing forms
* Search and filter forms

Form behavior should remain predictable across the entire platform.

A standard form flow should be:

```text
Page
  │
  ▼
Form Component
  │
  ▼
React Hook Form
  │
  ▼
Zod Schema
  │
  ▼
Module Hook
  │
  ▼
Module API Function
  │
  ▼
Backend API
```

The response flow should be:

```text
Backend Response
       │
       ▼
Module Hook
       │
       ├── Success → Message, Cache Update, Navigation
       │
       └── Failure
              │
              ▼
       Error Normalizer
              │
              ├── Field Errors → Form Fields
              └── General Error → Form Alert or Global Message
```

---

# Form Responsibilities

A form component should manage:

* Form field rendering
* Client-side validation
* Submission events
* Field-level errors
* Form-level errors
* Loading state
* Disabled state
* Accessibility attributes
* Submission feedback

A form component should not manage:

* API base configuration
* Session refresh
* Global error normalization
* Route protection
* Backend authorization
* Business calculations owned by the backend

---

# React Hook Form Standard

React Hook Form should be the standard form-state library.

It should manage:

* Field registration
* Field values
* Validation state
* Dirty state
* Touched state
* Submission state
* Reset behavior
* Backend field-error mapping

A typical form should use a schema resolver.

Example:

```typescript
const form = useForm<LoginFormValues>({
  resolver: zodResolver(loginSchema),
  defaultValues: {
    email: "",
    password: "",
  },
});
```

Form values should be typed.

---

# Schema Validation

Zod should define frontend validation schemas.

A schema should be stored under the appropriate module:

```text
src/schemas/identity/login.schema.ts
src/schemas/identity/registration.schema.ts
src/schemas/business/profile.schema.ts
```

Example:

```typescript
export const loginSchema = z.object({
  email: z
    .string()
    .min(1, "identity.login.errors.emailRequired")
    .email("identity.login.errors.emailInvalid"),

  password: z
    .string()
    .min(1, "identity.login.errors.passwordRequired"),
});
```

Validation messages should preferably use translation keys.

---

# Schema Ownership

Schemas should be grouped based on their responsibility.

## Module schemas

Module schemas belong under:

```text
src/schemas/<module>/
```

Examples:

```text
src/schemas/identity/
├── login.schema.ts
├── registration.schema.ts
└── verification.schema.ts
```

## Global schemas

Schemas reused across multiple modules belong under:

```text
src/global/schemas/
```

Examples:

```text
src/global/schemas/
├── email.schema.ts
├── phone.schema.ts
├── pagination.schema.ts
└── identifier.schema.ts
```

A schema should not be moved to the global foundation simply because it might be reusable in the future.

Reuse should be demonstrated before global ownership is introduced.

---

# Frontend and Backend Validation

Frontend validation improves usability.

Backend validation protects the system.

The frontend should validate:

* Required fields
* Input formats
* Minimum and maximum lengths
* Simple relationships between fields
* Immediate user-feedback rules

The backend should remain authoritative for:

* Uniqueness
* Permissions
* Ownership
* Tenant access
* Current database state
* Complex business rules
* Financial calculations
* State transitions
* Security-sensitive validation

Frontend schemas should align with backend rules where possible, but they should not be treated as the system's final enforcement layer.

---

# Validation Rule Duplication

Some validation rules must exist in both frontend and backend.

Examples include:

* Required email
* Password minimum length
* Supported phone-number format
* Maximum display-name length

This duplication is acceptable because the two layers serve different purposes.

```text
Frontend validation → Fast user feedback
Backend validation  → Security and data integrity
```

Where shared contracts can be generated safely from API schemas, the team may evaluate automation later.

Manual synchronization should remain explicit until such automation is formally adopted.

---

# Backend Field-Error Mapping

Backend validation errors should map cleanly to frontend fields.

Example backend response:

```json
{
  "success": false,
  "message": "Validation failed.",
  "data": null,
  "errors": {
    "code": "VALIDATION_ERROR",
    "fields": {
      "email": [
        "This email is already registered."
      ],
      "password": [
        "This password is too weak."
      ]
    }
  },
  "meta": {}
}
```

The module hook or form utility should map these errors through React Hook Form.

Example:

```typescript
setError("email", {
  type: "server",
  message: "identity.registration.errors.emailExists",
});
```

Raw backend validation structures should not be parsed independently in every form.

---

# Form Submission Rules

Forms should prevent duplicate submissions.

A submit button should:

* Enter a loading state
* Become disabled where appropriate
* Show clear progress
* Prevent repeated identical requests
* Restore usability after failure

Example:

```tsx
<Button
  type="submit"
  loading={isSubmitting}
  disabled={isSubmitting}
>
  {t("identity.login.submit")}
</Button>
```

Idempotency keys should be used for sensitive or duplicate-prone backend operations when required by API standards.

Examples include:

* Payments
* Order creation
* Subscription changes
* Financial adjustments

---

# Multi-Step Forms

Multi-step forms may be used for:

* Registration
* Business onboarding
* Checkout
* Complex configuration
* Product setup

A multi-step flow should define:

* Step order
* Step validation
* Back navigation
* Progress indication
* Temporary state ownership
* Session-expiration behavior
* Draft persistence where required
* Resume behavior

State may be managed through:

* React Hook Form
* Module Context
* URL state
* Temporary storage abstraction

The selected approach should be documented for each complex workflow.

---

# Unsaved Changes

Forms with important edits should protect users from accidental data loss.

Possible controls include:

* Dirty-state detection
* Route-leave confirmation
* Browser-close confirmation
* Draft saving
* Explicit discard action

These controls should be used selectively.

Simple forms such as login should not display unnecessary leave warnings.

---

# Design System Architecture

TEED should use one shared design system.

The design system should define:

* Colors
* Typography
* Spacing
* Borders
* Radius
* Shadows
* Breakpoints
* Motion
* Icons
* Component states
* Accessibility standards

Tailwind CSS and custom CSS should both follow this system.

The design system should prevent arbitrary visual decisions from being introduced independently across modules.

---

# Design Tokens

Design tokens should provide the shared visual vocabulary.

Recommended location:

```text
src/global/styles/tokens.css
```

Example token categories:

```css
:root {
  --color-background: ...;
  --color-surface: ...;
  --color-text-primary: ...;
  --color-text-secondary: ...;
  --color-border: ...;
  --color-primary: ...;
  --color-success: ...;
  --color-warning: ...;
  --color-error: ...;

  --font-family-primary: ...;

  --space-xs: ...;
  --space-sm: ...;
  --space-md: ...;
  --space-lg: ...;

  --radius-sm: ...;
  --radius-md: ...;
  --radius-lg: ...;

  --shadow-sm: ...;
  --shadow-md: ...;

  --transition-fast: ...;
  --transition-normal: ...;
}
```

Actual values should be defined during design-system implementation.

---

# Tailwind CSS Responsibilities

Tailwind CSS should primarily handle:

* Layout
* Flexbox
* Grid
* Spacing
* Width and height
* Responsive behavior
* Typography utilities
* Standard colors
* Standard borders
* Standard shadows
* Common hover and focus states

Example:

```tsx
<div className="flex min-h-screen items-center justify-center px-4">
  ...
</div>
```

Tailwind classes should remain readable.

Very long and repetitive utility strings should be evaluated for extraction into:

* Reusable components
* Shared utility classes
* Custom CSS classes

---

# Custom CSS Responsibilities

Custom CSS should be used for:

* Complex visual behavior
* Specialized layouts
* Shared design patterns
* Animations
* Module-specific presentation
* Styles that are unclear as utility chains
* Browser-specific adjustments
* Advanced responsive behavior

Module styles should remain under:

```text
src/styles/<module>/
```

Example:

```text
src/styles/identity/
├── identity-layout.css
├── login.css
└── registration.css
```

Global styles should remain under:

```text
src/global/styles/
```

---

# Tailwind and Custom CSS Consistency

Tailwind and custom CSS must not define conflicting design systems.

Both should use the same:

* Color system
* Spacing system
* Typography
* Radius scale
* Breakpoints
* Motion rules
* Accessibility states

Developers should avoid introducing arbitrary values without justification.

Examples to avoid:

```tsx
<div className="mt-3.25 rounded-[11px] text-[#123456]">
```

Arbitrary values may be used when a legitimate design requirement exists, but they should not become the default.

---

# CSS Naming

Custom CSS classes should follow predictable names.

Recommended pattern:

```text
<module>-<page-or-component>-<element>
```

Examples:

```css
.identity-login-page {}

.identity-login-form {}

.identity-login-submit {}

.business-profile-card {}

.workspace-member-table {}
```

Global CSS classes should use clear shared names.

Examples:

```css
.app-container {}

.page-header {}

.form-error {}

.offline-banner {}
```

Generic names such as `.box`, `.item`, or `.wrapper2` should be avoided.

---

# Style Import Rules

Global styles should be imported near the application root.

Example:

```typescript
import "@/global/styles/reset.css";
import "@/global/styles/tokens.css";
import "@/global/styles/globals.css";
```

Module styles should be imported by the relevant page, layout, or component.

Example:

```typescript
import "@/styles/identity/login.css";
```

A module should not import another module's private styles.

---

# Theme Architecture

The design system should support theming where required.

Possible themes include:

* Light
* Dark
* System preference

Theme state should be handled through a global provider.

Recommended locations:

```text
src/global/providers/theme-provider.tsx
src/global/hooks/use-theme.ts
src/global/styles/themes.css
```

Theme behavior should support:

* System preference detection
* User preference
* Persistent selection
* PWA display consistency
* Accessible contrast
* Future mobile wrapper compatibility

Theme implementation should avoid flash-of-incorrect-theme where practical.

---

# Responsive Design

TEED should follow a mobile-first responsive approach.

The interface should be usable on:

* Small mobile screens
* Large mobile screens
* Tablets
* Laptops
* Desktop monitors
* Large displays

Base styles should support small screens first.

Larger layouts should progressively enhance the experience.

---

# Responsive Principles

Responsive design should consider:

* Content priority
* Touch targets
* Navigation transformation
* Table behavior
* Form width
* Dialog behavior
* Keyboard visibility
* Safe-area insets
* Portrait and landscape orientation
* Long translated text
* Mobile browser interface behavior

The frontend should not simply shrink desktop layouts.

---

# Responsive Navigation

Navigation may adapt as follows:

```text
Desktop
├── Sidebar
├── Header
└── Full navigation labels

Mobile
├── Compact header
├── Drawer or bottom navigation
└── Touch-friendly actions
```

The chosen pattern should remain consistent across modules.

---

# Responsive Tables

Large data tables require explicit mobile behavior.

Possible strategies include:

* Horizontal scrolling
* Priority-column hiding
* Card transformation
* Expandable rows
* Dedicated mobile detail views

The selected strategy should preserve access to important information.

Information should not disappear solely because the screen is small.

---

# Touch Interaction

Interactive elements should be touch-friendly.

Buttons, inputs, links, and controls should provide:

* Adequate target size
* Clear spacing
* Visible pressed states
* No dependency on hover
* Keyboard and screen-reader support

Hover-only behavior should not be required for essential actions.

---

# Safe Areas

Future mobile wrapping and modern mobile browsers may require safe-area support.

The design system should allow use of:

```css
env(safe-area-inset-top)
env(safe-area-inset-right)
env(safe-area-inset-bottom)
env(safe-area-inset-left)
```

This is particularly relevant for:

* Fixed headers
* Bottom navigation
* Full-screen pages
* Installed PWA mode
* Mobile wrapper mode

---

# Accessibility Architecture

Accessibility is a core requirement.

The frontend should aim to follow recognized accessibility standards and accepted web practices.

Accessibility should be considered during:

* Design
* Component creation
* Form implementation
* Navigation
* Testing
* Content writing
* Internationalization

---

# Semantic HTML

Components should use semantic elements.

Examples include:

```text
header
nav
main
section
article
aside
footer
button
form
label
table
```

Clickable `div` elements should not replace buttons without a valid reason.

---

# Keyboard Accessibility

All interactive behavior should be usable with a keyboard.

This includes:

* Navigation
* Forms
* Modals
* Dropdowns
* Tabs
* Menus
* Tables
* Date pickers
* Language switchers

Focus order should remain logical.

Keyboard traps should be avoided except where properly controlled, such as inside an accessible modal.

---

# Focus Management

Focus should be managed intentionally during:

* Route changes
* Modal opening
* Modal closing
* Form validation failure
* Error-page rendering
* Dynamic content updates

For example, when a form fails validation, focus should move to the first relevant invalid field or error summary where appropriate.

---

# Screen Reader Support

Interactive components should expose clear accessible names.

Where semantic HTML is insufficient, appropriate ARIA attributes may be used.

ARIA should not replace correct semantic elements when native HTML can provide the required behavior.

---

# Color and Contrast

Text and interactive controls should provide sufficient contrast.

Meaning should not depend only on color.

For example, an error state should include:

* Color
* Icon where appropriate
* Text
* Accessible description

---

# Motion and Animation

Animations should be purposeful and restrained.

The frontend should respect reduced-motion preferences.

Example:

```css
@media (prefers-reduced-motion: reduce) {
  *,
  *::before,
  *::after {
    animation-duration: 0.01ms;
    animation-iteration-count: 1;
    transition-duration: 0.01ms;
  }
}
```

Critical information should not depend on animation.

---

# Internationalization Architecture

TEED should support bilingual operation from the beginning.

The frontend should not require structural changes to add or modify languages.

The internationalization architecture should support:

* Language detection
* User-selected language
* Default language
* Fallback language
* Module namespaces
* Translation interpolation
* Pluralization
* Date formatting
* Number formatting
* Currency formatting
* Localized validation
* Localized API errors

---

# Translation File Structure

Translation files should be organized by language and module.

Example:

```text
src/locales/
├── en/
│   ├── global.json
│   ├── identity.json
│   ├── business.json
│   ├── workspace.json
│   └── errors.json
│
└── sw/
    ├── global.json
    ├── identity.json
    ├── business.json
    ├── workspace.json
    └── errors.json
```

This structure mirrors the application modules while keeping languages clearly separated.

---

# Translation Key Standard

Keys should be stable and descriptive.

Recommended pattern:

```text
<module>.<feature>.<element>
```

Examples:

```text
identity.login.title
identity.login.emailLabel
identity.login.passwordLabel
identity.login.submit
identity.registration.success
business.profile.heading
workspace.members.empty
errors.networkUnavailable
```

Keys should describe meaning rather than exact English wording.

Avoid keys such as:

```text
clickHere
textOne
message2
```

---

# Hardcoded Text

User-facing text should not normally be hardcoded inside pages or components.

Preferred:

```tsx
<h1>{t("identity.login.title")}</h1>
```

Avoid:

```tsx
<h1>Login to your account</h1>
```

Exceptions may include:

* Developer-only debug output
* Non-user-facing identifiers
* Technical constants
* Temporary prototypes that must be removed before merge

---

# Language Selection

Language selection should be accessible globally.

The language selector may appear in:

* Public header
* Authentication layout
* User settings
* Mobile navigation

The selected language should persist using the platform storage abstraction.

Language selection should not require a full application rebuild.

---

# Language Detection

Initial language may be selected using:

```text
1. Authenticated user preference
2. Saved local preference
3. Browser or device preference
4. Application default
```

The exact priority should be documented during frontend foundation implementation.

---

# Backend Error Localization

The backend should return machine-readable error codes where possible.

Example:

```json
{
  "errors": {
    "code": "IDENTITY_INVALID_CREDENTIALS"
  }
}
```

The frontend should map the code to a translation key:

```typescript
t("errors.IDENTITY_INVALID_CREDENTIALS");
```

A backend-provided message may be used as a safe fallback.

The frontend should not depend exclusively on parsing English backend text.

---

# Date and Time Formatting

Dates and times should use locale-aware formatting.

The frontend should consider:

* User language
* User timezone
* Server timezone
* Relative time
* Calendar formats
* Mobile display constraints

Date formatting should be centralized.

Components should not independently invent formatting patterns.

---

# Number and Currency Formatting

Number and currency formatting should use locale-aware APIs.

Examples include:

* Product prices
* Invoice totals
* Tax amounts
* Quantities
* Percentages
* Financial reports

Currency values should always preserve the backend-provided currency context.

The frontend should not assume one currency globally unless the business rules explicitly define it.

---

# Text Expansion

Translated text may be longer than English text.

Components should allow:

* Flexible widths
* Text wrapping
* Dynamic button sizes
* Responsive labels
* Expandable navigation
* Larger error messages

Fixed-width designs should be avoided where translated content may overflow.

---

# Right-to-Left Readiness

Even if the initial languages are left-to-right, the architecture should avoid unnecessary assumptions that prevent future right-to-left support.

Examples include:

* Prefer logical CSS properties
* Avoid hardcoded left/right where start/end is appropriate
* Support direction attributes
* Avoid directional icons without context

Examples of logical properties:

```css
margin-inline-start
padding-inline-end
border-inline-start
```

---

# PWA User Experience

PWA behavior should integrate naturally into the application.

The frontend should support:

* Installability
* Offline fallback
* Update notification
* Network-status awareness
* Standalone display
* Mobile icons
* Splash-screen readiness

PWA prompts should not interrupt users excessively.

Install prompts should be presented at an appropriate moment.

---

# Application Updates

When a new service worker version is available, the application should notify the user safely.

Possible flow:

```text
New Version Detected
        │
        ▼
Display Update Message
        │
        ├── Update Now
        └── Later
```

Forced reloads should be avoided while the user is completing sensitive forms unless necessary.

---

# Offline Experience

The application should define what remains available offline.

Possible offline capabilities include:

* Application shell
* Public static content
* Previously cached non-sensitive pages
* Offline fallback page
* Network-status messages

Sensitive authenticated API responses should not be cached without a formal policy.

Offline mutation behavior should not be assumed.

A queued-write system requires documented rules for:

* Conflict detection
* Ordering
* Retry
* User feedback
* Security
* Duplicate prevention

---

# Performance Architecture

Performance should be considered during design and implementation.

Performance goals should include:

* Fast initial load
* Responsive interaction
* Efficient API usage
* Controlled bundle size
* Minimal unnecessary rerenders
* Efficient mobile behavior
* Stable PWA operation

---

# Code Splitting

Route-level code splitting should be used where appropriate.

Example:

```typescript
const LoginPage = lazy(
  () => import("@/pages/identity/login.page"),
);
```

Large modules should not be included in the initial application bundle unless required immediately.

Loading fallbacks should remain consistent.

---

# Lazy Loading

Lazy loading may apply to:

* Route pages
* Large charts
* Rich editors
* Reporting modules
* Heavy third-party integrations
* Rarely used dialogs

Core controls required for immediate interaction should not be delayed unnecessarily.

---

# Bundle Control

Dependencies should be reviewed for:

* Bundle size
* Tree shaking
* Browser compatibility
* Maintenance status
* Security
* Duplicate capabilities

A new dependency should not be introduced when a small existing utility or browser capability can solve the problem clearly.

---

# Image Optimization

Images should use:

* Appropriate dimensions
* Modern formats where supported
* Lazy loading
* Responsive sources
* Compression
* Meaningful alternative text

Large images should not be loaded when smaller variants are sufficient.

---

# Rendering Performance

Developers should avoid premature optimization, but common performance issues should be prevented.

Examples include:

* Recreating expensive values unnecessarily
* Rendering large lists without pagination or virtualization
* Storing derived data redundantly
* Triggering repeated API requests
* Using broad contexts that rerender the entire application
* Loading large modules eagerly

Optimization should be based on evidence where possible.

---

# Query Performance

TanStack Query configuration should reduce unnecessary traffic.

Considerations include:

* Appropriate stale times
* Cache reuse
* Pagination
* Search debouncing
* Request cancellation
* Query enablement
* Background refresh rules
* Cache invalidation

The frontend should not repeatedly fetch data that is already valid and cached.

---

# Perceived Performance

Perceived performance should be improved through:

* Skeletons
* Immediate button feedback
* Non-blocking refresh indicators
* Optimistic updates where safe
* Preserved navigation state
* Predictable loading transitions

Optimistic updates should be used only when rollback and consistency behavior are understood.

---

# Frontend Testing Architecture

Frontend testing should follow multiple levels.

```text
Unit Tests
     ↓
Component Tests
     ↓
Integration Tests
     ↓
End-to-End Tests
```

Each level serves a different purpose.

---

# Unit Tests

Unit tests should cover isolated logic.

Examples include:

* Helpers
* Formatters
* Error normalizers
* Schema behavior
* Permission utilities
* Query-key factories
* Storage abstractions

Recommended tool:

```text
Vitest
```

---

# Hook Tests

Hooks should be tested when they contain meaningful reusable behavior.

Examples include:

* Session behavior
* Permission checks
* Network-state handling
* Mutation coordination
* Query transformation
* Debouncing

Tests should provide required providers through reusable test utilities.

---

# Component Tests

Component tests should cover:

* Rendering
* User interaction
* Accessibility
* Validation display
* Loading states
* Empty states
* Error states
* Translation behavior

Recommended tools:

```text
Vitest
React Testing Library
```

Tests should focus on user-visible behavior rather than private implementation details.

---

# Form Tests

Important forms should test:

* Required fields
* Invalid values
* Successful submission
* Pending state
* Backend field errors
* General backend errors
* Disabled actions
* Keyboard submission
* Translated labels and messages

---

# Integration Tests

Frontend integration tests should verify collaboration between:

* Pages
* Components
* Hooks
* API functions
* Providers
* Routing

External network calls should be controlled through a suitable mocking approach.

Mocks should reflect real API contracts.

---

# End-to-End Tests

Playwright should cover critical user journeys.

Examples include:

* Registration
* Login
* Verification
* Password reset
* Business onboarding
* Workspace creation
* Permission denial
* Session expiration
* Language switching
* PWA-critical navigation

End-to-end tests should validate the frontend and backend together where possible.

---

# Accessibility Testing

Accessibility testing should include:

* Automated checks
* Keyboard navigation
* Screen-reader-oriented review
* Focus behavior
* Color contrast
* Form labels
* Error associations

Automated checks are useful but do not replace manual accessibility review.

---

# Responsive Testing

Critical pages should be tested at representative viewport sizes.

Examples include:

* Small mobile
* Large mobile
* Tablet
* Laptop
* Desktop

Tests should confirm that key actions remain visible and usable.

---

# Internationalization Testing

Internationalization tests should verify:

* Both initial languages load
* Language switching works
* Preferences persist
* Missing keys fall back safely
* Long text does not break layouts
* Validation messages translate
* API error codes map correctly
* Date and number formatting changes by locale

---

# PWA Testing

PWA tests should verify:

* Manifest availability
* Service worker registration
* Installability requirements
* Offline fallback
* Update handling
* Cached static assets
* No unintended caching of sensitive responses

PWA behavior should be tested in production-like builds, not only in development mode.

---

# Test Organization

Tests may be organized under responsibility folders or a central test area, provided navigation remains consistent.

Examples:

```text
src/tests/
├── global/
├── identity/
├── business/
└── workspace/
```

Or colocated test files may be used selectively:

```text
src/global/helpers/normalize-api-error.test.ts
```

The chosen standard should be defined in the Frontend Development Guidelines.

---

# Testing Priorities

The highest testing priority should be given to:

* Authentication
* Authorization presentation
* Session renewal
* Payments
* Financial calculations displayed to users
* Destructive actions
* Business onboarding
* Data submission
* Error handling
* Language switching
* Offline behavior

Visual appearance alone should not receive more attention than business-critical behavior.

---

# Architecture Rules Established in Part 3

The following rules are mandatory:

1. React Hook Form is the standard form-state solution.
2. Zod is the standard frontend schema-validation solution.
3. Module schemas remain under module-specific schema folders.
4. Global schemas require demonstrated cross-module reuse.
5. Frontend validation does not replace backend validation.
6. Backend field errors are mapped through shared utilities.
7. Duplicate form submissions must be prevented.
8. Multi-step forms require explicit state and navigation rules.
9. Tailwind CSS and custom CSS use one design system.
10. Platform-wide design tokens are centralized.
11. Arbitrary visual values should not become the default.
12. Module styles remain isolated from unrelated modules.
13. Responsive design follows a mobile-first approach.
14. Essential actions must not depend on hover.
15. Accessibility is part of component architecture.
16. User-facing text should use translation keys.
17. Translation files are organized by language and module.
18. Backend errors should use machine-readable codes for translation.
19. Dates, numbers, and currencies use locale-aware formatting.
20. PWA updates and offline behavior require explicit user feedback.
21. Sensitive API responses are not cached without a formal policy.
22. Route-level code splitting should be used where appropriate.
23. Dependencies should be reviewed for bundle and maintenance impact.
24. Testing should cover units, components, integrations, and end-to-end flows.
25. Authentication, sessions, permissions, payments, language switching, and PWA behavior receive high testing priority.

---

# Part 3 Summary

The TEED frontend should use a consistent form architecture based on React Hook Form, Zod schemas, module hooks, and normalized backend error mapping.

The visual system should combine Tailwind CSS and custom CSS under one centralized design system. Responsive behavior should be mobile-first, touch-friendly, accessible, and prepared for PWA and future mobile-wrapper environments.

Internationalization should be embedded throughout the application rather than added after implementation. Translation resources should align with business modules, user-facing text should use stable keys, and backend error codes should support localized messages.

Performance should be protected through controlled dependencies, code splitting, efficient queries, optimized assets, and careful rendering behavior.

Testing should validate the application at multiple levels, with particular focus on authentication, sessions, permissions, critical forms, bilingual behavior, responsive layouts, and PWA functionality.

The next section should complete the Frontend Architecture document by defining:

* Frontend security boundaries
* Client-side storage
* Authentication credential handling
* Permission presentation
* Observability
* Dependency governance
* Frontend deployment considerations
* Architectural quality attributes
* Related documents
* Related ADRs
* Final summary
* Implementation checklist