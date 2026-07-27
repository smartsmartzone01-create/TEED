# `docs/frontend/foundation/routing-overview.md`

# Application Routing Overview

## Purpose

This document defines the routing architecture for the TEED frontend.

It establishes how URLs are organized, how pages are rendered, how layouts are applied, and how routing integrates with authentication, authorization, navigation, internationalization, and future platform expansion.

Routing should provide a predictable, scalable, and maintainable navigation system that supports the application's modular architecture.

---

# Objectives

The routing architecture should:

* Organize application navigation consistently.
* Support modular development.
* Separate public and protected areas.
* Integrate with authentication.
* Support deep linking.
* Enable lazy loading.
* Support bilingual interfaces.
* Remain compatible with PWA and future mobile clients.

---

# Scope

This document covers:

* Route architecture
* Route hierarchy
* Layout hierarchy
* URL conventions
* Deep linking
* Navigation principles
* Lazy loading
* Authentication integration
* Testing

This document does **not** define:

* Individual page behavior
* Authorization rules
* Breadcrumb implementation
* Menu configuration

These topics are covered in separate documents.

---

# Routing Principles

The routing system should:

* Be URL-driven.
* Be declarative.
* Remain modular.
* Be backend-independent.
* Support nested layouts.
* Support direct navigation.
* Preserve browser navigation behavior.

Routes should describe application structure rather than implementation details.

---

# High-Level Architecture

```text id="4wmx7s"
Browser URL
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
Feature Components
```

Routing is responsible for determining *what* to render, not *how* business logic operates.

---

# Route Categories

The application should organize routes into logical categories.

Recommended categories:

```text id="z8m1fv"
Public

Authentication

Protected

Workspace

Administration

System
```

Each category should have a clearly defined purpose.

---

# Public Routes

Public routes are accessible without authentication.

Examples:

```text id="m8sh0d"
/

/about

/contact

/help
```

Public routes should never require session initialization beyond application startup.

---

# Authentication Routes

Authentication routes support identity workflows.

Examples:

```text id="1o6vtr"
/login

/register

/forgot-password

/reset-password

/verify-email
```

These routes should use the Identity Layout.

---

# Protected Routes

Protected routes require an authenticated session.

Examples:

```text id="wjm3sq"
/dashboard

/profile

/settings

/workspace
```

Access should be controlled through route guards rather than individual pages.

---

# Administration Routes

Administrative routes represent privileged application areas.

Examples:

```text id="txa6gc"
/admin

/admin/users

/admin/settings
```

Authentication alone should not grant access.

Authorization rules determine availability.

---

# System Routes

System routes provide shared application functionality.

Examples:

```text id="95vv5w"
/404

/403

/500

/offline
```

These routes should remain independent of business modules.

---

# Route Hierarchy

A recommended hierarchy:

```text id="n7q1eo"
Root
 │
 ├── Public
 ├── Authentication
 ├── Protected
 ├── Administration
 └── System
```

This hierarchy should remain stable as modules grow.

---

# Layout Hierarchy

Layouts define shared page structure.

Recommended layouts:

```text id="krpovq"
Root Layout

Identity Layout

Application Layout

Administration Layout

System Layout
```

Layouts should own structural concerns, not business logic.

---

# Nested Routing

Nested routing should be used where pages share:

* Navigation
* Sidebar
* Toolbar
* Context
* Layout

Nested layouts reduce duplication and improve consistency.

---

# Route Ownership

Each page owns only its own content.

Layouts own:

* Navigation
* Headers
* Footers
* Sidebars
* Shared containers

Pages should never recreate layout functionality.

---

# URL Design Principles

URLs should be:

* Predictable
* Human-readable
* Stable
* REST-like where appropriate
* Free from implementation details

Avoid exposing frontend architecture in URL structures.

---

# URL Naming

Preferred conventions:

```text id="0vhgqs"
/users

/projects

/workspaces

/settings/profile
```

Avoid:

```text id="ycjlwm"
/UserPage

/profileComponent

/dashboardView
```

URLs should describe resources rather than UI components.

---

# Route Parameters

Route parameters identify resources.

Example:

```text id="a2rjzw"
/workspaces/:workspaceId

/projects/:projectId

/users/:userId
```

Parameter names should remain descriptive.

---

# Query Parameters

Query parameters should represent transient UI state.

Examples:

```text id="qg64au"
?page=2

?search=invoice

?sort=name

?filter=active
```

Query parameters should not represent permanent application structure.

---

# Deep Linking

Every page should support direct navigation when permitted.

Users should be able to:

* Bookmark pages.
* Refresh pages.
* Share links.
* Open links in new tabs.

The application should restore state from the URL whenever appropriate.

---

# Navigation Principles

Navigation should:

* Reflect the current URL.
* Preserve browser history.
* Support back/forward navigation.
* Avoid unexpected redirects.

Programmatic navigation should remain predictable.

---

# Authentication Integration

Routing should integrate with:

* Session Provider
* Authentication guards
* Guest guards
* Redirect logic

Routing should not determine authentication state itself.

---

# Authorization Integration

Authorization should determine:

* Route accessibility
* Navigation visibility
* Administrative access

Routing should delegate permission evaluation to authorization infrastructure.

---

# Lazy Loading

Feature routes should support lazy loading.

Example:

```text id="7tbo0d"
Route

↓

Lazy Import

↓

Render

↓

Cache
```

Lazy loading reduces initial bundle size and improves startup performance.

---

# Loading States

While loading a lazy route:

Display:

* Loading indicator
* Skeleton screen
* Placeholder layout

Loading behavior should remain consistent throughout the application.

---

# Error Boundaries

Routes should support error boundaries.

Possible failures include:

* Failed module loading
* Runtime exceptions
* Unexpected rendering errors

Errors should be isolated to affected route trees whenever possible.

---

# Route Metadata

Routes may define metadata such as:

* Page title
* Description
* Breadcrumb information
* Navigation visibility
* Analytics identifiers

Metadata should remain declarative.

---

# Internationalization

Routing should remain language-neutral.

Translated content belongs in the UI rather than URLs unless multilingual URL support is intentionally adopted.

Route behavior should remain identical regardless of the selected language.

---

# Responsive Behavior

Routing behavior should remain identical across:

* Desktop
* Tablet
* Mobile
* Installed PWA

Layouts may adapt visually, but route structure should remain unchanged.

---

# Browser Navigation

The application should support:

* Back
* Forward
* Refresh
* Bookmarking
* Direct URL entry

Users should never lose navigation capabilities because of frontend routing.

---

# Offline Support

Where supported:

* Offline routes should remain accessible.
* Previously cached routes may continue to function.
* Offline pages should explain connectivity limitations.

Routing should integrate with the application's offline strategy.

---

# Logging

Permitted routing logs:

* Route entered
* Route exited
* Navigation failure
* Lazy load failure

Logs must not contain sensitive authentication or personal information.

---

# Analytics

Possible events:

```text id="jtrzkf"
page_view

navigation

route_error

route_loaded
```

Analytics should identify routes rather than implementation details.

---

# Related Documents

```text id="mhtl4w"
route-guards.md

application-layouts.md

navigation-architecture.md

breadcrumbs.md

authentication-overview.md

session-establishment.md
```

---

# Testing Requirements

## Unit Tests

* Route configuration
* URL parsing
* Route metadata
* Parameter handling

## Component Tests

* Layout rendering
* Lazy loading
* Error boundaries
* Loading states

## Integration Tests

* Authentication integration
* Authorization integration
* Nested routing
* Route transitions

## End-to-End Tests

* Direct navigation
* Browser refresh
* Deep linking
* Back/forward navigation
* Lazy route loading
* Protected route access
* Mobile navigation
* Offline route behavior

---

# Acceptance Criteria

The routing architecture is complete when:

* Route categories are clearly defined.
* Layouts are separated from pages.
* URLs remain predictable and stable.
* Deep linking works throughout the application.
* Authentication integrates through guards.
* Lazy loading is supported.
* Browser navigation behaves correctly.
* Accessibility, localization, and responsive requirements are satisfied.
* Automated tests cover core routing behavior.

---

# Architecture Rules

1. Routes must describe application structure rather than implementation details.
2. Layouts own shared structure; pages own page-specific content.
3. Authentication and authorization decisions must remain outside the routing engine.
4. URLs must remain stable, predictable, and human-readable.
5. Protected routes must be secured through route guards.
6. Feature modules should support lazy loading.
7. Every routable page should support direct navigation and browser refresh.
8. Routing behavior must remain consistent across web, PWA, and future mobile clients.
9. Route metadata should remain declarative and centralized.
10. The routing architecture must remain modular and scalable as new application modules are added.
