# `docs/frontend/foundation/layouts-overview.md`

# Application Layout Architecture

## Purpose

This document defines the layout architecture for the TEED frontend.

Layouts provide the structural foundation for every page by defining the persistent user interface surrounding page content. They are responsible for shared visual structure, navigation containers, global messaging, and application context, while individual pages remain responsible for business functionality.

Layouts should remain reusable, composable, and independent of business logic.

---

# Objectives

The layout architecture should:

* Provide consistent application structure.
* Separate presentation from business logic.
* Support multiple application areas.
* Enable responsive design.
* Integrate with routing and authentication.
* Support future platform expansion.
* Maintain consistency across web, PWA, and future mobile clients.

---

# Scope

This document covers:

* Layout responsibilities
* Layout hierarchy
* Layout composition
* Layout lifecycle
* Layout types
* Routing integration
* Responsive behavior
* Accessibility
* Testing

This document does **not** define:

* Navigation implementation
* Menu configuration
* Breadcrumb behavior
* Authorization rules
* Individual page layouts

---

# Layout Principles

Layouts should be:

* Persistent
* Stateless where possible
* Reusable
* Responsive
* Route-driven
* Independent of business modules

Layouts should provide structure rather than business functionality.

---

# High-Level Architecture

```text
Application
      │
      ▼
Router
      │
      ▼
Layout
      │
      ▼
Page
      │
      ▼
Reusable Components
```

Each layer has a clearly defined responsibility.

---

# Layout Responsibilities

Layouts are responsible for:

* Page structure
* Navigation containers
* Global header
* Global footer
* Sidebar containers
* Notification containers
* Modal portals
* Global loading overlays
* Responsive arrangement

Layouts should not:

* Fetch business data
* Execute business workflows
* Implement module-specific logic
* Own feature state

---

# Layout Hierarchy

Recommended hierarchy:

```text
Root Layout
      │
      ├── Identity Layout
      ├── Application Layout
      ├── System Layout
      └── Admin Layout (Future)
```

Each layout specializes in a specific application area.

---

# Root Layout

The Root Layout is always mounted.

Responsibilities include:

* Application providers
* Global styles
* Theme initialization
* Localization initialization
* Notification containers
* Modal portals
* Error boundaries
* Router outlet

It should remain extremely lightweight.

---

# Identity Layout

The Identity Layout hosts authentication-related pages.

Typical routes:

```text
/login

/register

/forgot-password

/reset-password

/verify-email
```

Responsibilities include:

* Centered authentication container
* Brand identity
* Language selector
* Authentication messaging
* Responsive authentication presentation

Business authentication logic belongs to individual pages.

---

# Identity Layout Structure

Example:

```text
Identity Layout
      │
      ├── Logo
      ├── Language Switcher
      ├── Authentication Container
      │        │
      │        ▼
      │     Route Outlet
      │
      └── Footer
```

---

# Application Layout

The Application Layout hosts authenticated application pages.

Typical routes include:

```text
/dashboard

/workspaces

/projects

/settings

/profile
```

It provides the primary application workspace.

---

# Application Layout Responsibilities

Responsibilities include:

* Header container
* Sidebar container
* Content container
* Footer (optional)
* Notification area
* Breadcrumb container
* Global search entry
* User menu container

Business modules populate these regions but do not own them.

---

# Application Layout Structure

Example:

```text
Application Layout
        │
        ├── Header
        ├── Sidebar
        ├── Content Area
        │       │
        │       ▼
        │   Route Outlet
        │
        ├── Notification Layer
        └── Footer
```

---

# System Layout

The System Layout hosts infrastructure pages.

Examples:

```text
404

403

500

Offline

Maintenance
```

These pages generally require minimal navigation.

---

# Future Admin Layout

Administrative interfaces may require a dedicated layout.

Potential responsibilities:

* Administrative navigation
* Administrative header
* System management tools
* Operational dashboards

This layout should extend the same architectural principles as other layouts.

---

# Route Integration

Layouts should be selected declaratively by routing configuration.

Example:

```text
Identity Routes
        │
        ▼
Identity Layout

Application Routes
        │
        ▼
Application Layout

System Routes
        │
        ▼
System Layout
```

Layouts should never determine routing independently.

---

# Nested Layouts

Nested layouts may be introduced for large modules.

Example:

```text
Application Layout
        │
        ▼
Workspace Layout
        │
        ▼
Workspace Pages
```

Nested layouts should inherit application-wide behavior.

---

# Layout Lifecycle

Typical lifecycle:

```text
Application Starts
        │
        ▼
Root Layout Mounted
        │
        ▼
Child Layout Mounted
        │
        ▼
Page Rendered
```

Layouts should remain mounted while navigating within their route group whenever possible.

---

# Persistent UI

Persistent interface elements include:

* Header
* Sidebar
* Footer
* Notifications
* Global dialogs

These should remain mounted across page navigation.

---

# Page Content

The route outlet represents the only region expected to change during navigation.

Example:

```text
Header
Sidebar

---------------------
Route Outlet
---------------------

Footer
```

This improves navigation performance and user orientation.

---

# Responsive Behavior

Layouts should adapt according to viewport size.

Typical behavior:

| Screen Size | Sidebar     |
| ----------- | ----------- |
| Desktop     | Persistent  |
| Tablet      | Collapsible |
| Mobile      | Drawer      |

Layout transitions should remain smooth and predictable.

---

# Mobile Layout

On smaller screens:

* Navigation becomes collapsible.
* Header remains visible.
* Content occupies maximum width.
* Touch targets remain accessible.

Business pages should not implement separate mobile layouts.

---

# PWA Compatibility

Layouts should support:

* Installed mode
* Standalone mode
* Offline experience
* Safe-area insets
* Responsive resizing

Platform-specific adjustments should remain isolated within layout infrastructure.

---

# Global Providers

Global providers should be mounted above layouts.

Examples:

```text
Theme Provider

Session Provider

Query Provider

Localization Provider

Notification Provider
```

Layouts should consume providers rather than initialize them.

---

# Notifications

Layouts should provide consistent placement for:

* Toasts
* Alerts
* Snackbars
* Status messages

Individual pages should trigger notifications through shared services.

---

# Global Loading

Layouts may display application-wide loading states during:

* Session initialization
* Critical application startup
* Major route transitions

Loading overlays should not replace page-specific loading indicators.

---

# Error Boundaries

Layouts should integrate with route-level error boundaries.

Failures should remain isolated to the affected layout or page whenever possible.

---

# Accessibility

Layouts should support:

* Landmark regions
* Keyboard navigation
* Skip links
* Logical focus order
* Accessible navigation containers
* Screen reader compatibility

Recommended landmarks include:

* Header
* Navigation
* Main
* Footer

---

# Internationalization

Layouts should contain translated interface elements such as:

* Navigation labels
* User menu
* Footer
* Status messages
* Global actions

Changing language should not require layout replacement.

---

# Performance

Layouts should:

* Avoid unnecessary rerenders.
* Keep persistent UI mounted.
* Lazy-load heavy navigation content when appropriate.
* Avoid business-specific API requests.

---

# State Management

Layouts may manage presentation state such as:

* Sidebar visibility
* Drawer state
* Theme toggle visibility
* Navigation expansion

Business state belongs to feature modules.

---

# Logging

Permitted logs include:

* Layout mounted
* Layout switched
* Layout initialization failure

Business events should not originate from layouts.

---

# Analytics

Possible analytics events:

```text
layout_loaded

layout_changed

navigation_rendered
```

Analytics should identify layouts rather than individual components.

---

# Related Documents

```text
routing-overview.md

navigation-overview.md

authentication-overview.md

session-establishment.md

responsive-design.md
```

---

# Testing Requirements

## Unit Tests

* Layout rendering
* Route outlet rendering
* Responsive state management

## Component Tests

* Identity Layout
* Application Layout
* System Layout
* Responsive sidebar
* Accessibility landmarks

## Integration Tests

* Routing integration
* Session initialization
* Notification rendering
* Nested layouts

## End-to-End Tests

* Identity navigation
* Application navigation
* System pages
* Mobile layouts
* Sidebar responsiveness
* Layout persistence during navigation
* Keyboard navigation

---

# Acceptance Criteria

The layout architecture is complete when:

* Layout responsibilities are clearly separated from page responsibilities.
* Root, Identity, Application, and System layouts are defined.
* Layout selection is route-driven.
* Persistent interface elements remain mounted across navigation.
* Responsive behavior is consistent.
* Accessibility landmarks are implemented.
* Layouts integrate with routing and providers.
* Automated tests cover all major layout behaviors.

---

# Architecture Rules

1. Layouts provide structure but must not contain business logic.
2. Route configuration determines layout selection.
3. Persistent interface elements should remain mounted during navigation within the same layout.
4. Global providers must be initialized above layouts.
5. Layouts may manage presentation state but not business state.
6. Responsive behavior must be implemented within layouts rather than duplicated in pages.
7. Layouts must expose proper accessibility landmarks and keyboard navigation.
8. Layouts must remain compatible with web, PWA, and future mobile clients.
9. Nested layouts should extend—not replace—the shared layout architecture.
10. Layouts must remain reusable, composable, and independent of feature modules.
