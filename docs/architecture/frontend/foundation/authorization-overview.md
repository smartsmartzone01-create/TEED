# `docs/frontend/foundation/authorization-overview.md`

# Frontend Authorization Architecture

## Purpose

This document defines the authorization architecture for the TEED frontend.

Authorization determines **what an authenticated user is allowed to see and do** within the application. While authentication establishes identity, authorization controls access to application resources, features, pages, and actions.

The frontend authorization system must remain simple, predictable, and completely driven by backend authorization decisions.

---

# Objectives

The authorization architecture should:

* Support backend-defined permissions.
* Prevent unauthorized UI exposure.
* Integrate with routing.
* Support feature visibility.
* Remain independent of authentication.
* Scale with future application modules.
* Support web, PWA, and future mobile clients.

---

# Scope

This document covers:

* Authorization principles
* Permission evaluation
* Roles
* Permissions
* Route authorization
* Component authorization
* Feature visibility
* Integration with authentication
* Testing

This document does **not** define:

* Backend authorization rules
* Business permission models
* Identity management
* Authentication
* Session lifecycle

---

# Authorization Principles

The frontend authorization system should be:

* Backend-driven
* Declarative
* Predictable
* Centralized
* Testable
* Independent of business implementation

The frontend must never become the authority for access control.

---

# Authentication vs Authorization

Authentication answers:

> **Who is the user?**

Authorization answers:

> **What is the user allowed to access?**

These concerns should remain independent.

---

# High-Level Architecture

```text id="m3p8zk"
Session Provider
        │
        ▼
Current User
        │
        ▼
Authorization Service
        │
        ▼
Routes / Components / Features
```

Authorization decisions should consume authenticated user information without modifying authentication state.

---

# Authorization Ownership

The frontend is responsible for:

* Displaying or hiding UI.
* Preventing navigation to unauthorized pages.
* Disabling unauthorized actions when appropriate.
* Providing user feedback.

The backend is responsible for:

* Permission evaluation.
* Security enforcement.
* Role assignment.
* Access decisions.

---

# Source of Truth

The backend is the single source of truth for:

* Roles
* Permissions
* Access policies
* Resource ownership
* Administrative privileges

The frontend should consume—not define—authorization rules.

---

# Authorization Lifecycle

```text id="v0gz8q"
Authenticated User
        │
        ▼
Load Authorization Data
        │
        ▼
Authorization Service
        │
        ▼
UI Decisions
```

Authorization should occur only after authentication has completed.

---

# Roles

Roles represent collections of permissions.

Examples:

```text id="4j8qly"
Administrator

Manager

Member

Viewer

Guest
```

The frontend should treat role names as opaque identifiers rather than embedding role-specific logic.

---

# Permissions

Permissions represent individual capabilities.

Examples:

```text id="ms3vbe"
workspace.read

workspace.update

project.create

project.delete

billing.manage
```

Permissions should be granular and backend-defined.

---

# Roles vs Permissions

Preferred hierarchy:

```text id="u2g9pd"
Role
   │
   ▼
Permissions
   │
   ▼
Frontend Decisions
```

UI should generally evaluate permissions rather than hard-coded role names.

---

# Authorization Service

Authorization should be centralized.

Responsibilities include:

* Permission evaluation
* Role inspection
* Feature visibility
* Route authorization
* Helper utilities

Pages and components should not duplicate authorization logic.

---

# Authorization API

Example interface:

```typescript id="qp7t4y"
interface AuthorizationService {
  hasPermission(
    permission: string,
  ): boolean;

  hasAnyPermission(
    permissions: string[],
  ): boolean;

  hasAllPermissions(
    permissions: string[],
  ): boolean;
}
```

The interface should remain stable regardless of backend implementation.

---

# Route Authorization

Protected routes may require permissions.

Example:

```text id="6twvbi"
/billing
      │
      ▼
billing.manage
```

Route guards should evaluate permissions before rendering protected pages.

---

# Authorization Flow

```text id="ih0z2f"
Navigate
    │
    ▼
Authenticated?
    │
    ▼
Permission Check
    │
 ┌──┴───┐
 │      │
Allow  Deny
```

Authorization should occur before protected page rendering.

---

# Unauthorized Access

If access is denied:

Possible responses include:

* Redirect
* 403 page
* Access request screen
* Organization selection

Behavior should follow application policy.

---

# Component Authorization

Not every permission requires route protection.

Some permissions affect individual interface elements.

Examples:

* Buttons
* Tabs
* Menu items
* Panels
* Actions

---

# UI Visibility

Authorized users may see:

* Navigation items
* Action buttons
* Management panels
* Administrative tools

Unauthorized users should not see unavailable functionality unless product requirements explicitly call for disabled controls.

---

# Hidden vs Disabled

Preferred behavior depends on UX requirements.

| Scenario                        | Recommended             |
| ------------------------------- | ----------------------- |
| User cannot ever access feature | Hide                    |
| User can request access         | Disable                 |
| Read-only access                | Disable editing actions |

This behavior should remain consistent throughout the application.

---

# Feature Gating

Feature visibility may depend on:

* Permissions
* Subscription level
* Workspace capabilities
* Feature flags

Authorization should integrate with these systems without becoming coupled to them.

---

# Authorization Components

Reusable authorization components may include:

```text id="hzt3cv"
PermissionGate

RoleGate

FeatureGate
```

These components should consume the Authorization Service rather than implementing authorization independently.

---

# Example Usage

Example:

```text id="lq6nki"
PermissionGate
        │
        ▼
Allowed Content

or

Fallback Content
```

This keeps permission checks declarative and reusable.

---

# Navigation Integration

Navigation visibility should reflect authorization.

Example:

```text id="5i8rsm"
Permission

↓

Visible Menu

↓

Accessible Route
```

Navigation configuration should reference permission identifiers rather than embedding business rules.

---

# Layout Integration

Layouts may conditionally render navigation regions based on permissions.

They should not evaluate business rules directly.

Authorization decisions should remain delegated to the Authorization Service.

---

# Session Integration

Authorization depends on authenticated user information.

If authentication changes:

```text id="b7ot8v"
Logout

↓

Clear Authorization State

↓

Guest Interface
```

Authorization state should never outlive the authenticated session.

---

# Backend Synchronization

The frontend should assume backend permissions may change.

Examples:

* Administrator updates roles.
* Subscription changes.
* Workspace membership changes.

Authorization should refresh through normal session or user refresh mechanisms.

---

# Permission Caching

Permission information may be cached as part of authenticated user state.

Separate permission caches should generally be avoided.

The Session Provider should remain the owner of authenticated user information.

---

# Error Handling

Authorization failures should be distinguished from authentication failures.

Examples:

```text id="yz9v3u"
401 → Authentication

403 → Authorization
```

User messaging should reflect the correct problem.

---

# Accessibility

Authorization behavior should remain accessible.

Examples:

* Hidden controls should not receive focus.
* Disabled controls should expose appropriate accessibility attributes.
* Unauthorized messages should be announced properly.

---

# Internationalization

Authorization-related messages should use translation resources.

Examples:

* Access denied
* Permission required
* Request access
* Contact administrator

---

# Security Considerations

Frontend authorization improves user experience.

It does **not** replace backend security.

The backend must validate:

* Every request
* Every permission
* Every resource

The frontend must never assume hidden UI provides security.

---

# Logging

Permitted logs include:

* Authorization failure
* Permission evaluation error
* Unauthorized navigation attempt

Permission names may be logged when appropriate.

Sensitive backend authorization information should not.

---

# Analytics

Possible events:

```text id="yw7u7v"
authorization_denied

permission_checked

feature_hidden

restricted_navigation
```

Analytics should use stable permission identifiers.

---

# Related Documents

```text id="hrjx8i"
authentication-overview.md

session-establishment.md

routing-overview.md

navigation-overview.md

feature-flags.md
```

---

# Testing Requirements

## Unit Tests

* Permission evaluation
* Authorization helpers
* Permission gates

## Component Tests

* Hidden components
* Disabled actions
* Permission gates
* Accessibility

## Integration Tests

* Route authorization
* Navigation visibility
* Session integration
* Authorization refresh

## End-to-End Tests

* Authorized navigation
* Unauthorized navigation
* Hidden UI
* Disabled actions
* 403 handling
* Permission changes after refresh
* Mobile authorization behavior

---

# Acceptance Criteria

The authorization architecture is complete when:

* Backend permissions drive all authorization decisions.
* Authorization is centralized in a shared Authorization Service.
* Routes, navigation, and components consume the same permission model.
* Authentication and authorization remain separate concerns.
* Hidden and disabled UI behavior is consistent.
* Accessibility and localization requirements are satisfied.
* Backend remains the final authority for every protected operation.
* Automated tests cover route, navigation, and component authorization.

---

# Architecture Rules

1. The backend is the single source of truth for authorization.
2. The frontend must never enforce security independently of the backend.
3. Authorization must be centralized in a shared Authorization Service.
4. UI should evaluate permissions rather than hard-coded role names whenever possible.
5. Route, navigation, and component authorization must use the same permission model.
6. Authorization state must be cleared whenever the authenticated session ends.
7. Unauthorized functionality must be hidden or disabled according to the application's UX policy.
8. Authorization interfaces must support accessibility and internationalization.
9. Authorization behavior must remain consistent across web, PWA, and future mobile clients.
10. Authorization architecture must remain modular, declarative, and independently testable.
