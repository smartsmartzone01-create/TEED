# `docs/frontend/foundation/navigation-overview.md`

# Navigation Architecture

## Purpose

This document defines the navigation architecture for the TEED frontend.

Navigation enables users to move efficiently throughout the application while maintaining orientation, minimizing cognitive load, and providing a consistent experience across modules.

The navigation system should be independent of business logic and tightly integrated with routing, layouts, authentication, and authorization.

---

# Objectives

The navigation architecture should:

* Provide consistent navigation throughout the application.
* Support modular application growth.
* Adapt to different screen sizes.
* Reflect authentication and authorization state.
* Integrate with routing and layouts.
* Support accessibility and localization.
* Remain compatible with web, PWA, and future mobile clients.

---

# Scope

This document covers:

* Global navigation
* Header navigation
* Sidebar navigation
* Breadcrumb navigation
* Navigation state
* Active route handling
* Navigation ownership
* Responsive navigation
* Testing

This document does **not** define:

* Route configuration
* Page layouts
* Authorization rules
* Business workflows
* Individual page actions

---

# Navigation Principles

Navigation should be:

* Predictable
* Consistent
* Discoverable
* Accessible
* Responsive
* Independent of business logic

Navigation should help users move through the application rather than perform business operations.

---

# High-Level Architecture

```text id="vw6r8g"
Router
    │
    ▼
Layout
    │
    ▼
Navigation
    │
    ▼
Route
```

Routing determines where users can go.

Navigation determines how users reach those destinations.

---

# Navigation Layers

The application navigation consists of:

```text id="a7g1kw"
Global Header

Sidebar Navigation

Breadcrumb Navigation

Context Navigation (Optional)

Footer Navigation
```

Each layer has a distinct responsibility.

---

# Navigation Responsibilities

The navigation system is responsible for:

* Displaying available destinations.
* Showing current location.
* Supporting navigation between modules.
* Reflecting active routes.
* Adapting to screen size.
* Respecting authorization visibility.

Navigation should not:

* Execute business logic.
* Fetch feature data.
* Modify business state.
* Determine permissions.

---

# Global Header

The Global Header remains persistent within the Application Layout.

Typical content includes:

* Logo
* Global search entry
* Notifications
* Language selector
* Theme selector
* User menu
* Workspace selector (if applicable)

The header should remain compact and stable.

---

# Sidebar Navigation

The Sidebar is the primary navigation component for authenticated users.

Typical content:

```text id="ngmjlwm"
Dashboard

Workspace

Projects

Teams

Reports

Settings
```

Sidebar entries should represent top-level application modules.

---

# Sidebar Responsibilities

The Sidebar should:

* Display primary destinations.
* Highlight the active section.
* Support nested navigation.
* Collapse responsively.
* Preserve navigation state where appropriate.

Business-specific actions should not appear in the sidebar.

---

# Sidebar Structure

Example:

```text id="3o2zn2"
Sidebar
   │
   ├── Logo
   ├── Navigation Groups
   ├── Workspace Selector
   └── Collapse Control
```

---

# Navigation Groups

Navigation items should be grouped logically.

Example:

```text id="e13rkg"
Workspace

Operations

Administration

Personal
```

Groups improve discoverability in large applications.

---

# Header Actions

Header actions should include global functionality only.

Examples:

* Search
* Notifications
* Help
* User profile
* Language selection

Feature-specific actions belong within pages.

---

# User Menu

The user menu may include:

```text id="lm5jsf"
Profile

Preferences

Language

Theme

Logout
```

The user menu should remain consistent across all authenticated pages.

---

# Workspace Selector

If the platform supports multiple workspaces or organizations:

The workspace selector should:

* Display current context.
* Allow switching.
* Clearly indicate the active workspace.

Switching logic belongs to the appropriate service, not the navigation component.

---

# Breadcrumb Navigation

Breadcrumbs help users understand their current location.

Example:

```text id="tfd4gp"
Dashboard

↓

Projects

↓

Project Details

↓

Settings
```

Breadcrumbs should reflect route hierarchy rather than menu hierarchy.

---

# Breadcrumb Responsibilities

Breadcrumbs should:

* Show the current path.
* Support navigation to ancestor routes.
* Avoid duplication.
* Remain concise.

They should not replace primary navigation.

---

# Active Navigation

Navigation should clearly indicate:

* Active page
* Active module
* Expanded navigation group
* Selected workspace

Users should always know where they are.

---

# Navigation State

Presentation state may include:

* Sidebar expanded
* Sidebar collapsed
* Active navigation group
* Active breadcrumb
* Mobile drawer visibility

Navigation state should remain separate from business state.

---

# Route Integration

Navigation items should correspond directly to route definitions.

Example:

```text id="lfhtd7"
Navigation Item

↓

Route

↓

Page
```

Navigation should not perform custom routing logic.

---

# Authorization Integration

Navigation visibility may depend on permissions.

Possible behavior:

```text id="h8mwk0"
Permission

↓

Visible Navigation

↓

Accessible Route
```

Navigation visibility should follow authorization services rather than duplicating permission logic.

---

# Authentication Integration

Guest users should see only guest navigation.

Authenticated users should see application navigation.

Navigation should react automatically to session state changes.

---

# Responsive Behavior

Navigation should adapt to available screen space.

Recommended behavior:

| Device  | Navigation          |
| ------- | ------------------- |
| Desktop | Persistent sidebar  |
| Tablet  | Collapsible sidebar |
| Mobile  | Drawer navigation   |

Behavior should remain predictable.

---

# Mobile Navigation

On mobile devices:

* Sidebar becomes a drawer.
* Header remains visible.
* Navigation overlays content.
* Drawer closes after navigation.

Touch interactions should remain intuitive.

---

# Drawer Navigation

Drawer navigation should:

* Trap focus while open.
* Close using Escape.
* Close after selection.
* Restore focus appropriately.

Accessibility is required.

---

# Keyboard Navigation

Navigation should support:

* Tab navigation
* Arrow navigation where appropriate
* Enter activation
* Escape dismissal
* Skip links

Keyboard users should access all navigation features.

---

# Search Integration

Global search belongs in the header.

Search should:

* Be accessible from every authenticated page.
* Avoid replacing navigation.
* Support future extensibility.

Search implementation is documented separately.

---

# Notifications

Navigation may provide access to notifications.

Notification logic belongs to notification services.

Navigation simply provides entry points.

---

# Theme Integration

Theme switching may appear in the user menu.

Theme management belongs to the Theme Provider rather than navigation components.

---

# Internationalization

All navigation labels should use translation resources.

Examples:

* Menu labels
* Group labels
* Breadcrumbs
* User menu
* Tooltips

Changing language should update navigation without rebuilding it.

---

# Accessibility

Navigation should support:

* Landmark regions
* Screen readers
* Keyboard-only navigation
* Visible focus indicators
* ARIA-expanded states
* ARIA-current for active routes
* Accessible drawer behavior

Navigation should never depend solely on color to indicate state.

---

# Performance

Navigation should:

* Avoid unnecessary rerenders.
* Lazy-load large icon sets when appropriate.
* Render efficiently for large menus.
* Avoid business API requests.

---

# Navigation Configuration

Navigation definitions should remain declarative.

Example information:

* Label
* Route
* Icon
* Group
* Feature flag
* Permission requirement

Configuration should not contain business logic.

---

# Logging

Permitted logs:

* Navigation opened
* Navigation closed
* Navigation error

Individual menu selections generally belong to analytics rather than logging.

---

# Analytics

Possible events:

```text id="0jl4xp"
navigation_click

menu_open

menu_close

breadcrumb_navigation
```

Analytics should use stable navigation identifiers.

---

# Related Documents

```text id="dzdwls"
routing-overview.md

layouts-overview.md

authorization-overview.md

responsive-design.md

accessibility.md
```

---

# Testing Requirements

## Unit Tests

* Navigation configuration
* Active route calculation
* Navigation state management

## Component Tests

* Sidebar rendering
* Header rendering
* Breadcrumb rendering
* Drawer behavior
* Accessibility

## Integration Tests

* Routing integration
* Authentication integration
* Authorization visibility
* Responsive behavior

## End-to-End Tests

* Desktop navigation
* Mobile drawer navigation
* Breadcrumb navigation
* Keyboard-only navigation
* Workspace switching
* Active route highlighting
* Logout from user menu
* Language switching

---

# Acceptance Criteria

The navigation architecture is complete when:

* Global, sidebar, breadcrumb, and user navigation are clearly defined.
* Navigation remains independent of business logic.
* Active routes are consistently highlighted.
* Responsive behavior functions across supported devices.
* Navigation integrates with routing, authentication, and authorization.
* Accessibility requirements are satisfied.
* Navigation labels support localization.
* Automated tests cover all major navigation behaviors.

---

# Architecture Rules

1. Navigation must remain independent of business logic.
2. Navigation items must correspond directly to application routes.
3. Layouts own navigation containers; pages must not.
4. Authorization determines navigation visibility without duplicating permission logic.
5. Navigation presentation state must remain separate from business state.
6. Responsive navigation behavior must be implemented centrally.
7. Navigation components must support accessibility, keyboard navigation, and screen readers.
8. All navigation labels must use translation resources.
9. Navigation architecture must remain compatible with web, PWA, and future mobile clients.
10. Navigation configuration must be declarative, reusable, and owned by the appropriate frontend module.
