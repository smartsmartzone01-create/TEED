# TEED Frontend Architecture

## Part 1 — Foundation, Principles, and Source Organization

---

# Document Information

| Field                | Value                                                                                                                    |
| -------------------- | ------------------------------------------------------------------------------------------------------------------------ |
| Document             | Frontend Architecture                                                                                                    |
| Project              | TEED — Technical Ecommerce Environment Development                                                                       |
| Document Type        | Architecture Standard                                                                                                    |
| Status               | Draft                                                                                                                    |
| Primary Audience     | Frontend Developers, Backend Developers, Technical Leads, Architects, QA Engineers, AI Coding Assistants                 |
| Scope                | TEED frontend application and its integration with backend services                                                      |
| Related Architecture | System Overview, Backend Architecture, Platform Foundation, API Standards, Security Architecture, Development Guidelines |

---

# Purpose

This document defines the architectural standards for the TEED frontend application.

It establishes how the frontend should be structured, how frontend modules should align with backend modules, how reusable functionality should be shared, and how the application should remain maintainable as the system grows.

The frontend architecture is designed to support:

* Modern and professional user interfaces
* Clear and predictable source-code navigation
* Concurrent frontend and backend development
* Backend-aligned business modules
* Consistent API communication
* Centralized error and success messaging
* Shared hooks, providers, and reusable components
* Bilingual user experiences
* Progressive Web App capabilities
* Responsive mobile-first behavior
* Future mobile application packaging
* Long-term scalability and maintainability

The frontend should not be treated as a separate implementation that is added after the backend is complete.

Frontend and backend behavior should be designed and validated together as complete user-facing features.

---

# Scope

This document applies to the TEED frontend application and covers:

* Frontend architectural principles
* Frontend technology direction
* Source-code organization
* Module alignment with the backend
* Responsibility-based directory structure
* Global reusable infrastructure
* Component ownership
* Hook ownership
* Provider ownership
* Schema and type organization
* Styling organization
* Internationalization readiness
* PWA readiness
* Future mobile compatibility
* Frontend and backend integration boundaries

Detailed implementation rules will be defined in supporting documents, including:

* Frontend Foundation
* Frontend Development Guidelines
* Frontend Security
* Frontend Internationalization
* PWA Architecture
* Mobile Readiness
* Full-Stack Development Workflow

---

# Frontend Vision

The TEED frontend should provide a modern, professional, reliable, and accessible interface for all platform users.

The application should present backend capabilities through clear and consistent user experiences while preserving the backend as the authoritative source of business rules, permissions, and data integrity.

The frontend should be:

* Easy to navigate
* Easy to extend
* Easy to debug
* Consistent across modules
* Reusable across features
* Responsive across device sizes
* Installable as a PWA
* Prepared for future mobile packaging
* Compatible with bilingual content
* Secure by design
* Closely aligned with backend APIs

The architecture should allow a developer to identify the relevant frontend and backend code for a feature without searching through deeply nested or unrelated directories.

---

# Frontend Architecture Objectives

The frontend architecture has the following objectives.

## Predictable Navigation

Developers should be able to locate files based on two clear dimensions:

```text
Technical Responsibility
        ↓
Business Module
        ↓
Specific Implementation
```

For example:

```text
pages/identity/login.page.tsx
components/identity/login-form.tsx
hooks/identity/use-login.ts
schemas/identity/login.schema.ts
types/identity/login.types.ts
api/identity/login.api.ts
styles/identity/login.css
```

This organization provides consistent navigation throughout the application.

---

## Backend Alignment

Frontend module names should align with backend business module names.

For example:

```text
backend/apps/identity/
frontend/src/pages/identity/
frontend/src/components/identity/
frontend/src/hooks/identity/
frontend/src/api/identity/
```

The internal responsibilities of the backend and frontend are different, but the same business vocabulary should be used.

This alignment helps developers:

* Trace user actions from frontend to backend
* Debug API requests efficiently
* Locate related module code quickly
* Maintain consistent naming
* Reduce architectural confusion
* Develop complete full-stack features

---

## Minimal Folder Depth

The frontend should avoid unnecessary directory nesting.

The preferred architecture uses a small number of clearly defined top-level responsibility folders.

Deep structures such as the following should be avoided:

```text
src/
└── features/
    └── identity/
        └── authentication/
            └── registration/
                ├── components/
                ├── hooks/
                ├── schemas/
                └── styles/
```

Instead, TEED should use:

```text
src/
├── pages/
│   └── identity/
├── components/
│   └── identity/
├── hooks/
│   └── identity/
├── schemas/
│   └── identity/
└── styles/
    └── identity/
```

The architecture should remain flat enough for fast navigation while still separating responsibilities clearly.

---

## Reusability

Cross-module capabilities should be implemented once and reused throughout the frontend.

Examples include:

* API request handling
* Error normalization
* Success messages
* Warning messages
* Loading indicators
* Form controls
* Session handling
* Permission checks
* Pagination
* Modal behavior
* Confirmation dialogs
* Responsive layouts
* Translation utilities
* Common validators
* Design tokens

Reusable code should not be duplicated inside business modules.

---

## Full-Stack Compatibility

Frontend requirements should influence API contract design before backend implementation is finalized.

For every feature, the team should consider:

* What information the page requires
* What data the user submits
* What loading states exist
* What error states exist
* What permissions affect the interface
* What responses the API should return
* What fields require validation
* What actions require confirmation
* What happens when a session expires
* What happens when the network is unavailable

This reduces the risk of rebuilding backend behavior after frontend development begins.

---

## Platform Readiness

The frontend should support:

* Standard web browsers
* Installable PWA behavior
* Responsive mobile layouts
* Touch-based interaction
* Future mobile application wrappers
* Platform-neutral API communication

Browser-specific behavior should be isolated behind reusable abstractions where future mobile compatibility may be required.

---

# Frontend Architectural Principles

## Responsibility-First Organization

The frontend should be organized first by technical responsibility and then by business module.

The primary source structure should include folders such as:

```text
pages/
components/
hooks/
schemas/
types/
api/
styles/
layouts/
contexts/
constants/
helpers/
```

Each responsibility folder may contain backend-aligned module folders.

For example:

```text
components/
├── identity/
├── business/
├── workspace/
└── billing/
```

This structure is preferred over placing all technical responsibilities inside one feature folder.

---

## Business Module Alignment

Frontend modules should align with backend business capabilities.

Examples include:

* Identity
* Business
* Workspace
* Billing
* Product
* Inventory
* Order
* Payment
* Notification
* Reporting

Frontend names should not introduce alternative terms for existing backend concepts without architectural approval.

For example, if the backend module is named `identity`, the frontend should not independently rename it to `accounts`, `members`, or `authentication-system`.

Consistent terminology improves traceability.

---

## Global Reuse Before Duplication

Before creating a new component, hook, helper, provider, or utility, developers should determine whether an existing reusable implementation already exists.

Shared functionality should be placed in the global frontend foundation only when it is genuinely reusable across multiple modules.

Examples include:

* `Button`
* `Input`
* `Modal`
* `DataTable`
* `Pagination`
* `useMessage`
* `usePermission`
* `useDebounce`
* API client
* Session provider
* Message provider
* Error normalizer
* Translation provider

Module-specific code should remain inside its module-specific responsibility folder.

---

## Backend Authority

The frontend may improve usability by hiding unavailable actions, validating forms, or preventing obvious invalid interactions.

However, the backend remains authoritative for:

* Authentication
* Authorization
* Permissions
* Tenant isolation
* Ownership rules
* Business rules
* Data validation
* Financial calculations
* State transitions
* Security decisions

Frontend checks are user-experience controls, not security controls.

---

## Consistent User Experience

Common application behavior should remain visually and functionally consistent.

The same global system should manage:

* Success messages
* Error messages
* Warning messages
* Informational messages
* Loading states
* Empty states
* Confirmation dialogs
* Form errors
* Session-expired messages
* Permission-denied messages
* Network failure messages

Business modules should not create independent notification systems.

---

## Explicit Data Flow

Frontend data movement should remain understandable and predictable.

A standard flow should resemble:

```text
Page
  │
  ▼
Module Component
  │
  ▼
Module Hook
  │
  ▼
Module API Function
  │
  ▼
Global API Client
  │
  ▼
Backend Endpoint
```

Response handling should follow the reverse path:

```text
Backend Response
       │
       ▼
Global Response Parser
       │
       ▼
Global Error Normalizer
       │
       ▼
Module Hook
       │
       ▼
Page or Component
```

Pages should not directly manage low-level transport behavior.

---

## Centralized Cross-Cutting Concerns

Cross-cutting concerns should be centralized.

These include:

* API configuration
* Authentication headers
* Session renewal
* Request cancellation
* Error normalization
* Notification behavior
* Translation initialization
* Theme behavior
* Query configuration
* Route protection
* Permission helpers
* Application configuration

Centralization ensures consistent behavior throughout the platform.

---

## Progressive Enhancement

The application should provide a reliable baseline experience and progressively enable advanced capabilities.

Examples include:

* Offline fallback
* Install prompts
* Background synchronization
* Push notifications
* Device integrations
* Native mobile capabilities

Advanced platform features should not make core web functionality unreliable.

---

# Recommended Technology Direction

The frontend technology stack should support modern development, strong typing, reusable components, testability, PWA capabilities, and future mobile readiness.

The recommended direction is:

```text
React
TypeScript
Vite
React Router
TanStack Query
React Hook Form
Zod
Tailwind CSS
Custom CSS
i18next
Vitest
React Testing Library
Playwright
PWA tooling
```

The final dependency list and exact versions should be established during frontend foundation setup.

---

## React

React should provide the component-based UI framework.

React components should remain focused on:

* Rendering
* User interaction
* Composition
* Local presentation behavior
* Accessibility
* Connecting reusable hooks to the interface

Components should not contain backend business logic.

---

## TypeScript

TypeScript should be used from the beginning.

TypeScript supports:

* Safer API integration
* Better editor support
* Predictable data contracts
* Improved refactoring
* Reduced runtime errors
* Shared frontend type definitions
* Better maintainability

Recommended file extensions include:

```text
.ts
.tsx
```

JavaScript file extensions such as `.js` and `.jsx` should not be the default for application code.

---

## Vite

Vite should provide the frontend development and build environment.

It should support:

* Fast development startup
* Hot module replacement
* Production builds
* Environment variable configuration
* TypeScript integration
* PWA integration
* Modern browser targets

---

## React Router

React Router should manage client-side routing.

Routing should support:

* Public routes
* Authenticated routes
* Permission-protected routes
* Nested layouts
* Error routes
* Not-found routes
* Authentication redirects
* Language-aware behavior where required

Route definitions should be centralized.

---

## TanStack Query

TanStack Query should manage server-derived state.

Examples include:

* User profiles
* Workspace records
* Products
* Orders
* Invoices
* Permissions
* Notifications
* Reports

TanStack Query should manage:

* Caching
* Loading states
* Refetching
* Mutation state
* Request deduplication
* Cache invalidation
* Retry behavior
* Background synchronization

Server state should not be unnecessarily duplicated into React Context.

---

## React Hook Form

React Hook Form should manage form state.

It should support:

* Registration forms
* Login forms
* Profile forms
* Business setup forms
* Product forms
* Checkout forms
* Search filters
* Multi-step forms

Form handling should remain separate from API transport behavior.

---

## Zod

Zod should define frontend validation schemas.

Schemas should support:

* Form validation
* Type inference
* Request validation
* Response validation where appropriate
* Reusable validation rules
* Consistent validation messages

Frontend validation should improve usability but should not replace backend validation.

---

## Tailwind CSS and Custom CSS

TEED should use both Tailwind CSS and custom CSS.

Tailwind should primarily support:

* Layout
* Spacing
* Grid
* Flexbox
* Responsive behavior
* Standard typography
* Standard visual states
* Utility-level styling

Custom CSS should support:

* Complex component behavior
* Module-specific styling
* Reusable advanced patterns
* Animations
* Specialized layouts
* Styles that are difficult to express clearly through utilities

Both systems should follow the same design tokens and visual standards.

---

## Internationalization

An internationalization library such as `i18next` with React integration should manage bilingual content.

The internationalization foundation should support:

* Translation files
* Language switching
* Default language
* Fallback language
* Namespaced translation keys
* Module-specific translations
* Date formatting
* Number formatting
* Currency formatting
* Validation messages
* Error-code translation

Visible user-facing text should not be hardcoded directly into components except where explicitly justified.

---

## Testing Tools

The frontend testing foundation should include:

* Vitest for unit testing
* React Testing Library for component testing
* Playwright for end-to-end testing

Tests should cover:

* Reusable hooks
* Components
* Forms
* Validation
* API integration behavior
* Authentication flows
* Route protection
* Language switching
* Responsive user journeys
* PWA-critical behavior

---

# Source Organization Standard

The TEED frontend should use the following primary source structure:

```text
frontend/
└── src/
    ├── app/
    ├── pages/
    ├── layouts/
    ├── components/
    ├── hooks/
    ├── contexts/
    ├── providers/
    ├── api/
    ├── schemas/
    ├── types/
    ├── constants/
    ├── helpers/
    ├── styles/
    ├── locales/
    ├── global/
    ├── assets/
    ├── tests/
    └── main.tsx
```

Folders should be created when required by implementation.

Empty module folders should not be created without a current need.

---

# Pages Organization

The `pages/` directory contains route-level user interfaces.

```text
src/pages/
├── identity/
│   ├── login.page.tsx
│   ├── registration.page.tsx
│   ├── verification.page.tsx
│   └── password-reset.page.tsx
│
├── business/
│   ├── profile.page.tsx
│   ├── settings.page.tsx
│   └── dashboard.page.tsx
│
└── workspace/
    ├── workspace-list.page.tsx
    └── workspace-details.page.tsx
```

Pages should:

* Coordinate route-level behavior
* Compose module components
* Use module hooks
* Display loading and error states
* Connect route parameters to data requirements
* Avoid containing large reusable UI implementations
* Avoid making uncontrolled HTTP requests directly

---

# Components Organization

The `components/` directory contains module-owned reusable components.

```text
src/components/
├── identity/
│   ├── login-form.tsx
│   ├── registration-form.tsx
│   ├── verification-form.tsx
│   └── password-field.tsx
│
├── business/
│   ├── profile-card.tsx
│   ├── business-form.tsx
│   └── business-navigation.tsx
│
└── workspace/
    ├── workspace-card.tsx
    └── workspace-selector.tsx
```

A module component should remain under its module when it represents module-specific behavior.

Generic components used across multiple modules should be moved to the global foundation.

---

# Hooks Organization

The `hooks/` directory contains module-specific hooks.

```text
src/hooks/
├── identity/
│   ├── use-login.ts
│   ├── use-registration.ts
│   ├── use-verification.ts
│   └── use-password-reset.ts
│
├── business/
│   ├── use-business-profile.ts
│   └── use-business-settings.ts
│
└── workspace/
    ├── use-workspaces.ts
    └── use-workspace-members.ts
```

Module hooks may coordinate:

* Query operations
* Mutation operations
* Form submission
* Module-specific state
* Response mapping
* Module-specific error handling

Hooks used across multiple business modules should be moved to the global foundation.

---

# API Organization

The `api/` directory contains module-specific API functions.

```text
src/api/
├── identity/
│   ├── login.api.ts
│   ├── registration.api.ts
│   ├── verification.api.ts
│   └── session.api.ts
│
├── business/
│   ├── business-profile.api.ts
│   └── business-settings.api.ts
│
└── workspace/
    ├── workspace.api.ts
    └── workspace-members.api.ts
```

Module API functions should use the global API client.

They should not independently configure:

* Base URLs
* Authentication headers
* Refresh behavior
* Global retries
* Response envelopes
* Network error mapping

---

# Schemas Organization

The `schemas/` directory contains module-specific validation schemas.

```text
src/schemas/
├── identity/
│   ├── login.schema.ts
│   ├── registration.schema.ts
│   └── verification.schema.ts
│
├── business/
│   └── business-profile.schema.ts
│
└── workspace/
    └── workspace.schema.ts
```

Schemas may define:

* Form rules
* Request validation
* Response validation
* Shared module validation primitives

Schema names should remain aligned with the corresponding page, form, request, or domain concept.

---

# Types Organization

The `types/` directory contains module-specific TypeScript types.

```text
src/types/
├── identity/
│   ├── identity.types.ts
│   ├── session.types.ts
│   └── permission.types.ts
│
├── business/
│   └── business.types.ts
│
└── workspace/
    └── workspace.types.ts
```

Types should represent:

* API requests
* API responses
* Domain data
* Component props
* Hook returns
* Module state
* Permission structures

Global cross-module types should remain in the global foundation.

---

# Styles Organization

The `styles/` directory contains module-specific custom styles.

```text
src/styles/
├── identity/
│   ├── identity-layout.css
│   ├── login.css
│   ├── registration.css
│   └── verification.css
│
├── business/
│   ├── profile.css
│   └── dashboard.css
│
└── workspace/
    ├── workspace-layout.css
    └── workspace-members.css
```

Styles should use predictable names based on module and page responsibility.

Examples include:

```css
.identity-login-page {}

.identity-login-form {}

.identity-registration-page {}

.business-profile-card {}

.workspace-member-list {}
```

Module styles should not redefine platform-wide design tokens.

---

# Global Frontend Foundation

The `global/` directory contains cross-module frontend infrastructure.

A recommended structure is:

```text
src/global/
├── api/
├── components/
├── hooks/
├── providers/
├── contexts/
├── styles/
├── schemas/
├── types/
├── constants/
└── helpers/
```

The `global/` directory should contain only functionality that is reusable across multiple modules or required at the application level.

It should not become a dumping ground for code without clear ownership.

---

## Global API Infrastructure

```text
src/global/api/
├── client.ts
├── requests.ts
├── responses.ts
├── errors.ts
└── interceptors.ts
```

This layer should manage:

* API base configuration
* Request headers
* Authentication credentials
* Standard HTTP methods
* Response parsing
* Error normalization
* Session renewal integration
* Request cancellation
* Retry policies
* Network failures

---

## Global Components

```text
src/global/components/
├── button.tsx
├── input.tsx
├── select.tsx
├── modal.tsx
├── alert.tsx
├── loader.tsx
├── empty-state.tsx
├── pagination.tsx
├── data-table.tsx
└── confirmation-dialog.tsx
```

Global components should be:

* Reusable
* Accessible
* Theme-aware
* Responsive
* Translation-compatible
* Consistent with the design system

---

## Global Hooks

```text
src/global/hooks/
├── use-message.ts
├── use-api-error.ts
├── use-session.ts
├── use-permission.ts
├── use-debounce.ts
├── use-network-status.ts
└── use-translation.ts
```

Global hooks should provide consistent behavior throughout the application.

---

## Global Providers

```text
src/global/providers/
├── app-provider.tsx
├── query-provider.tsx
├── session-provider.tsx
├── message-provider.tsx
├── translation-provider.tsx
└── theme-provider.tsx
```

Providers should be composed near the application root.

Conceptually:

```text
AppProvider
├── QueryProvider
├── TranslationProvider
├── SessionProvider
├── MessageProvider
├── ThemeProvider
└── RouterProvider
```

Providers should not be recreated separately inside modules unless the provider is strictly module-local.

---

## Global Message System

The frontend should provide one consistent message system for:

* Success messages
* Error messages
* Warning messages
* Informational messages
* Session expiration
* Network failures
* Permission denial
* Background update notifications

A common hook may expose:

```typescript
const {
  showSuccess,
  showError,
  showWarning,
  showInfo,
} = useMessage();
```

Every module should use this system instead of implementing custom popups or notifications.

---

# Internationalization Foundation

TEED should support bilingual operation from the beginning.

A possible localization structure is:

```text
src/locales/
├── en/
│   ├── global.json
│   ├── identity.json
│   ├── business.json
│   └── workspace.json
│
└── sw/
    ├── global.json
    ├── identity.json
    ├── business.json
    └── workspace.json
```

Translation resources should align with frontend and backend module names.

For example:

```text
identity.login.title
identity.login.submit
identity.login.invalidCredentials
business.profile.title
workspace.members.invite
```

Frontend-visible text should use translation keys.

Example:

```tsx
<h1>{t("identity.login.title")}</h1>
```

The architecture should support adding more languages without restructuring application components.

---

# Progressive Web App Readiness

TEED should be designed as a Progressive Web App.

The frontend foundation should prepare for:

* Web app manifest
* Installability
* Service worker registration
* Static asset caching
* Offline fallback
* Update notifications
* Network status detection
* Responsive layouts
* Touch-friendly interfaces
* Mobile navigation
* Application icons
* Standalone display mode

Sensitive authenticated data should not be cached without an explicit security and offline-data policy.

---

# Future Mobile Readiness

The frontend should remain compatible with future packaging as a mobile application.

Potential future wrappers may include platform technologies such as Capacitor or an equivalent solution.

Business features should not directly depend on browser-only APIs where an abstraction would improve portability.

For example, instead of using storage directly throughout the application:

```typescript
localStorage.setItem("key", value);
```

the application should use a shared abstraction:

```typescript
storageService.set("key", value);
```

The implementation may later vary by platform:

```text
Browser Storage
PWA Storage
Mobile Secure Storage
```

Similar abstractions may be required for:

* Notifications
* File selection
* Camera access
* Geolocation
* Secure storage
* Deep links
* Biometrics
* Device information
* Network status

---

# Client-Neutral Backend Integration

The backend should not assume that every request originates from a standard browser.

Backend APIs should support:

* Web clients
* PWA clients
* Android clients
* iOS clients
* Approved external integrations

API contracts should remain platform-neutral.

Frontend and backend integration should therefore use:

* Versioned endpoints
* Stable response envelopes
* Machine-readable error codes
* Consistent pagination
* Standard filtering
* Clear authentication contracts
* Revocable sessions
* Device-aware session support where required
* Idempotent mutation behavior where required

---

# Architecture Rules Established in Part 1

The following rules are mandatory:

1. The frontend is organized first by technical responsibility and then by business module.
2. Business module names should align with backend module names.
3. Deep feature-local folder nesting should be avoided.
4. Pages, components, hooks, schemas, types, APIs, and styles remain in separate top-level responsibility folders.
5. Global reusable functionality belongs in the controlled `global/` foundation.
6. Module-specific code remains owned by its module.
7. User-facing messages use one global message system.
8. API communication uses one global API client.
9. Session handling is centralized.
10. Backend permissions and business rules remain authoritative.
11. TypeScript is used from the beginning.
12. Tailwind CSS and custom CSS follow one design system.
13. User-facing text is internationalized.
14. PWA requirements are considered during foundation development.
15. Browser-specific behavior should be abstracted where future mobile compatibility requires it.
16. Frontend and backend features should be developed and validated together.

---

# Part 1 Summary

The TEED frontend architecture uses a responsibility-first source structure with backend-aligned module folders.

This structure provides predictable navigation while preserving clear separation between pages, components, hooks, schemas, types, API functions, and styles.

Cross-module functionality is centralized under a controlled global foundation so that messaging, error handling, API communication, providers, hooks, components, and design standards remain reusable and consistent.

The architecture also establishes bilingual operation, PWA readiness, responsive behavior, and future mobile compatibility as foundational requirements.

These decisions provide the basis for the next frontend architecture section, which should define:

* Application composition
* Component architecture
* Page and layout responsibilities
* State management
* Context usage
* Server-state management
* Routing
* API request flow
* Session architecture
* Error handling