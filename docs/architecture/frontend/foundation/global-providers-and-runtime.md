# `docs/frontend/foundation/global-providers-and-runtime.md`

# Global Providers and Runtime Architecture

## Purpose

This document defines the TEED frontend runtime architecture, including application startup, provider composition, initialization order, global infrastructure ownership, dependency boundaries, and application-wide lifecycle behavior.

The runtime layer establishes the environment in which routing, session management, localization, state management, notifications, theming, and other cross-cutting systems operate.

Its purpose is to ensure that global infrastructure is initialized predictably, remains centrally owned, and does not become fragmented across pages or feature modules.

---

# Objectives

The runtime architecture should:

* Define one predictable application startup sequence.
* Establish a clear global provider hierarchy.
* Prevent duplicate provider initialization.
* Separate runtime initialization from page rendering.
* Centralize application-wide dependencies.
* Support asynchronous startup requirements.
* Isolate startup failures.
* Remain compatible with web, PWA, and future mobile clients.

---

# Scope

This document covers:

* Application entry point
* Runtime bootstrap
* Provider hierarchy
* Initialization order
* Global dependency composition
* Startup loading and failure states
* Session initialization
* Localization initialization
* Query infrastructure
* Notifications
* Theme initialization
* Connectivity state
* PWA lifecycle integration
* Testing

This document does not define the internal behavior of each provider in full. Those responsibilities belong to their dedicated foundation documents.

---

# Core Principle

Global infrastructure should be initialized once, above all route layouts and pages.

```text
Application Entry
      │
      ▼
Runtime Bootstrap
      │
      ▼
Global Providers
      │
      ▼
Router
      │
      ▼
Layouts
      │
      ▼
Pages
```

Pages and modules should consume runtime services rather than creating or configuring them independently.

---

# Application Entry Point

The application entry point should remain minimal.

Its responsibilities should normally include:

* Locating the root DOM container
* Starting runtime bootstrap
* Mounting the root application component
* Registering fatal startup handling
* Loading only essential global assets

The entry point should not contain:

* Business logic
* Feature initialization
* API calls
* Route-specific behavior
* Module-specific configuration

---

# Runtime Bootstrap

Runtime bootstrap prepares the application before normal rendering begins.

Typical bootstrap responsibilities include:

```text
Validate Runtime Configuration

↓

Initialize Localization

↓

Create Shared Clients

↓

Initialize Session

↓

Register Global Runtime Services

↓

Mount Router
```

Some operations may occur in parallel where dependencies allow it.

---

# Bootstrap Phases

A recommended runtime lifecycle is:

```text
Uninitialized

↓

Bootstrapping

↓

Ready

or

Startup Failed
```

The application should expose these states explicitly rather than relying on several unrelated loading booleans.

---

# Provider Hierarchy

A recommended provider hierarchy is:

```text
Root Error Boundary
    │
    ▼
Runtime Configuration Provider
    │
    ▼
Localization Provider
    │
    ▼
Theme Provider
    │
    ▼
Query Provider
    │
    ▼
Session Provider
    │
    ▼
Authorization Provider
    │
    ▼
Notification Provider
    │
    ▼
Connectivity Provider
    │
    ▼
Router
```

The exact order may vary based on implementation, but dependencies must remain explicit.

---

# Provider Ordering

A provider must only depend on providers mounted above it.

Example:

```text
Runtime Configuration
        │
        ▼
API Client
        │
        ▼
Session
        │
        ▼
Authorization
```

Circular provider dependencies are prohibited.

Provider order should be documented and enforced through composition rather than relying on accidental imports.

---

# Root Error Boundary

The outermost application layer should include a root error boundary.

Its purpose is to catch failures that occur during:

* Provider rendering
* Router initialization
* Global context creation
* Unhandled runtime rendering

The fallback should:

* Avoid a blank screen
* Provide a safe recovery action
* Preserve diagnostics
* Support localization where available

---

# Runtime Configuration Provider

The runtime configuration provider owns validated environment-dependent settings.

Examples:

* API base URL
* Application environment
* Build version
* Observability settings
* PWA configuration
* Feature-control endpoint

Configuration should be loaded and validated before dependent systems initialize.

Invalid critical configuration should prevent the application from continuing in an undefined state.

---

# Localization Provider

The localization provider should initialize early enough for startup and error interfaces to use translated content.

Responsibilities include:

* Loading supported language resources
* Resolving the initial language
* Exposing translation functions
* Formatting dates, numbers, and currencies
* Reacting to language changes

The localization provider should not depend on page routes.

---

# Initial Language Resolution

Language may be resolved from an approved priority order such as:

```text
Authenticated User Preference

↓

Persisted Client Preference

↓

Browser Preference

↓

Default Application Language
```

The selected strategy should remain consistent.

Language resolution should not block startup longer than necessary.

---

# Theme Provider

The theme provider owns application-wide appearance settings.

Responsibilities may include:

* Resolving the initial theme
* Applying design tokens
* Respecting system appearance
* Persisting safe preferences
* Updating root-level theme attributes

Theme initialization should occur before visible application rendering when possible to reduce visual flashing.

---

# Query Provider

The query provider owns the shared server-state client.

It should be created once per application runtime.

Responsibilities include:

* Shared query cache
* Mutation cache
* Default retry behavior
* Request deduplication
* Global query diagnostics
* Cache reset integration

Feature modules should not create separate query clients.

---

# Query Client Creation

The query client should be constructed through a dedicated global factory.

Example responsibility:

```text
Create Query Client

↓

Apply Default Policies

↓

Attach Global Error Hooks

↓

Expose Through Provider
```

The factory should not import pages or feature components.

---

# Session Provider

The Session Provider owns the authenticated session lifecycle.

It should initialize after the API and query infrastructure required to restore or inspect the current session is available.

Responsibilities include:

* Session restoration
* Authenticated user state
* Session refresh coordination
* Session expiration
* Logout cleanup
* Cross-tab session synchronization

The Session Provider should expose explicit lifecycle states.

---

# Authorization Provider

The Authorization Provider depends on authenticated user and permission information.

It should not initialize authorization as if a user were authenticated before session restoration completes.

Possible states include:

```text
Unavailable

Loading

Ready

Cleared
```

Authorization data must reset whenever the session ends or the active application context changes.

---

# Notification Provider

The Notification Provider owns application-wide transient messaging.

Responsibilities include:

* Toast queue
* Duplicate suppression
* Message lifecycle
* Priority handling
* Accessibility announcements
* Optional action callbacks

Feature modules should publish notifications through the shared interface instead of mounting their own global containers.

---

# Connectivity Provider

The Connectivity Provider owns global network-awareness state.

It may expose:

* Online
* Offline
* Reconnecting
* Connection quality indicators
* Last successful synchronization

Browser connectivity events are only signals.

A browser reporting online does not guarantee that the backend is reachable.

---

# Router Placement

The router should be mounted below the global providers required by route guards, layouts, and pages.

This allows routes to consume:

* Session state
* Authorization
* Localization
* Theme
* Notifications
* Runtime configuration

The router should not own the initialization of these systems.

---

# Global Portals

Application-wide portals should be declared once near the root runtime.

Examples:

* Modal portal
* Dialog portal
* Toast container
* Tooltip portal
* Global overlay container

Pages may request overlays through shared infrastructure but should not create competing root containers.

---

# Dependency Composition

Global dependencies should be composed centrally.

Examples:

```text
API Client

Query Client

Session Coordinator

Logger

Analytics Adapter

Feature-Control Client
```

Consumers should depend on stable interfaces rather than direct third-party implementations wherever practical.

---

# Dependency Direction

Allowed dependency direction:

```text
Page or Component
        ↓
Hook or Context
        ↓
Global Service Interface
        ↓
Infrastructure Implementation
```

Infrastructure must never depend on page components.

---

# Service Singletons

Some services may exist as one runtime instance.

Examples:

* API client
* Query client
* Logger
* Session refresh coordinator
* Realtime connection manager

Singleton behavior should be explicit through the runtime composition layer rather than accidental module-level mutable state.

---

# Mutable Global Modules

Uncontrolled mutable module-level variables should be avoided.

Problems include:

* Difficult test isolation
* Hidden lifecycle state
* Duplicate development instances
* Hot-reload inconsistencies
* Cross-request leakage in server-rendered environments

Where global mutable state is unavoidable, ownership and reset behavior must be explicit.

---

# Startup Dependencies

Startup operations should be classified as:

## Blocking

The application cannot operate correctly without completion.

Examples:

* Critical configuration validation
* Supported language initialization
* Required client construction

## Conditionally Blocking

Some route groups may require completion.

Examples:

* Session restoration
* Remote feature configuration
* Workspace context restoration

## Non-Blocking

May continue after the first render.

Examples:

* Analytics startup
* Non-critical prefetching
* Optional PWA update checks

This classification prevents unnecessary startup delays.

---

# Startup Orchestration

Startup should be coordinated by one runtime orchestrator or root runtime component.

It should avoid scattering initialization logic across unrelated providers.

Example:

```text
Bootstrap Required Infrastructure
          │
          ▼
Resolve Critical State
          │
          ▼
Render Application
          │
          ▼
Start Non-Critical Services
```

---

# Parallel Initialization

Independent startup operations may run concurrently.

Example:

```text
Configuration Validated
      │
      ├── Load Localization
      ├── Initialize Theme
      └── Create Query Client
```

Dependent operations must wait for their prerequisites.

Concurrency should not obscure failure ownership.

---

# Startup Loading Interface

During blocking initialization, the application should display a dedicated startup interface.

It should:

* Be lightweight
* Use accessible status messaging
* Avoid rendering protected pages prematurely
* Avoid flashing between guest and authenticated layouts
* Support bilingual content as early as possible

The startup screen is not a general page loading state.

---

# Startup Failure Interface

Critical initialization failure should produce a dedicated fallback.

The interface may provide:

* Retry initialization
* Reload application
* Basic diagnostic reference
* Support contact guidance

It should not expose secrets, raw stack traces, or internal configuration values.

---

# Session Restoration and Routing

Protected routing should wait until session restoration reaches a definitive state.

Incorrect sequence:

```text
Render Login

↓

Restore Session

↓

Redirect to Application
```

Preferred sequence:

```text
Restore Session

↓

Determine Session State

↓

Render Correct Route Group
```

This prevents unnecessary layout flashes and navigation churn.

---

# Runtime Context Changes

Some global context changes affect several providers.

Examples:

* Login
* Logout
* Workspace switch
* Language change
* Theme change
* Connectivity restoration

These changes should have documented propagation behavior.

---

# Login Runtime Transition

A successful login may trigger:

```text
Establish Session

↓

Load Authorization

↓

Set Active Context

↓

Invalidate Guest Queries

↓

Navigate to Intended Route
```

The sequence should be coordinated to avoid rendering protected content with incomplete authorization state.

---

# Logout Runtime Transition

Logout should trigger centralized cleanup.

Example:

```text
Invalidate Backend Session

↓

Clear Session State

↓

Clear Authorization State

↓

Clear Sensitive Query Cache

↓

Stop Realtime Services

↓

Reset Context

↓

Navigate to Login
```

Individual pages should not implement independent logout cleanup.

---

# Workspace or Tenant Switching

If TEED supports multiple workspaces or tenants, switching context should be treated as a runtime transition.

It may require:

* Updating active context
* Clearing scoped cache
* Reloading permissions
* Restarting realtime subscriptions
* Updating navigation
* Redirecting from invalid routes

Old-context data must never be presented as belonging to the new context.

---

# Language Changes

Changing language should update:

* Translation resources
* Document language metadata
* Formatting rules
* Navigation labels
* Validation messages
* Global notifications

Localized backend data should be invalidated only where necessary.

Language changes should not recreate the entire application runtime unless required by the framework.

---

# Theme Changes

Theme changes should update root-level styling without rebuilding providers or resetting page state.

Theme state should remain independent from server-state caches.

---

# Realtime Lifecycle

Realtime services should integrate with runtime state.

A realtime connection may start only after:

* Session is authenticated
* Required workspace context is known
* Runtime configuration is ready

It should stop or reconnect after:

* Logout
* Workspace switch
* Credential refresh
* Connectivity changes

---

# Background Services

Global background services may include:

* Session refresh
* Realtime subscriptions
* Notification polling
* Queue synchronization
* Update checks

Each service must define:

* Start condition
* Stop condition
* Retry policy
* Ownership
* Cleanup behavior

Background services should not be started independently by several pages.

---

# PWA Lifecycle

The runtime should integrate with PWA infrastructure.

Potential responsibilities include:

* Service worker registration
* Update availability
* Installation state
* Offline readiness
* Cache version transitions
* Background synchronization signals

Service worker registration should remain isolated from business modules.

---

# Application Updates

When a new frontend version becomes available, the runtime may expose:

```text
Update Available

↓

Notify User

↓

Apply Update at Safe Time

↓

Reload Runtime
```

Forced reloads should be avoided during critical user workflows unless required for security or compatibility.

---

# Storage Integration

Global providers may consume the shared client-storage abstraction.

They should not access browser storage through scattered direct calls.

Examples:

* Language preference
* Theme preference
* Safe UI settings
* Session metadata where explicitly permitted

Storage access must remain compatible with browser restrictions and future platform adapters.

---

# Server-Side Rendering Readiness

Even if the initial TEED frontend is client-rendered, runtime architecture should avoid unnecessary assumptions that prevent future server rendering or pre-rendering.

Avoid:

* Accessing `window` at module import time
* Accessing browser storage during module evaluation
* Creating browser-only services before runtime initialization
* Storing user-specific state in shared module globals

Browser-specific behavior should be guarded behind runtime adapters.

---

# Mobile Wrapper Readiness

Future mobile packaging may replace browser-specific implementations for:

* Storage
* Connectivity
* Notifications
* Deep linking
* App lifecycle events
* Secure credential handling

Global provider interfaces should remain platform-neutral where practical.

The runtime should allow platform adapters without requiring changes in pages and feature modules.

---

# Development Mode

Development runtime may provide:

* Debug panels
* Query inspection
* Mock-service support
* Detailed errors
* Provider diagnostics

Development-only behavior must be excluded from production builds where appropriate.

---

# Strict Development Behavior

Framework development modes may intentionally mount or execute some lifecycle behavior more than once.

Global services must tolerate repeated initialization attempts during development.

Initialization and cleanup should be idempotent.

---

# Observability

Runtime startup should emit technical telemetry such as:

```text
application_boot_started

application_boot_completed

application_boot_failed

provider_initialization_failed

session_restore_completed
```

Telemetry should include stable stage identifiers and durations without sensitive user data.

---

# Performance

Runtime architecture should minimize:

* Large blocking imports
* Sequential initialization without dependency need
* Duplicate provider renders
* Repeated client construction
* Unnecessary application-wide context updates

Frequently changing values should not be placed in one broad context that forces unrelated components to rerender.

---

# Context Granularity

Global contexts should remain focused.

Avoid one universal context containing:

```text
Session

Theme

Language

Notifications

Workspace

Connectivity

Feature Flags
```

Separate providers or focused stores improve:

* Render performance
* Ownership clarity
* Testing
* Dependency control

---

# Provider Public Interfaces

Each provider should expose the smallest practical interface.

Example:

```typescript
interface ConnectivityContextValue {
  status: "online" | "offline" | "reconnecting";
  lastConnectedAt?: string;
}
```

Consumers should not receive internal service objects unless necessary.

---

# Provider Error Handling

A provider should distinguish between:

* Loading
* Recoverable operational failure
* Unavailable optional capability
* Fatal initialization failure

Not every provider error should crash the application.

For example, analytics failure should not block application usage.

---

# Cleanup Requirements

Global services must release resources when their lifecycle ends.

Examples:

* Remove browser event listeners
* Close realtime connections
* Cancel timers
* Abort pending operations
* Remove cross-tab subscriptions
* Clear sensitive memory

Cleanup must be tested.

---

# Folder Structure

Recommended source placement:

```text
src/
    providers/
        global/
            RuntimeProvider/
            QueryProvider/
            SessionProvider/
            LocalizationProvider/
            ThemeProvider/
            NotificationProvider/
            ConnectivityProvider/

    services/
        global/
            runtime/
            storage/
            realtime/
            pwa/

    hooks/
        global/
            useRuntime.ts
            useConnectivity.ts
            useNotifications.ts

    types/
        global/
            runtime.ts
            providers.ts
```

Provider folders belong under the technical responsibility `providers/`, with backend-aligned module subfolders where module-specific providers are genuinely required.

---

# Module Providers

Module-specific providers should be introduced only when a subtree requires shared lifecycle state that cannot be expressed through server state, URL state, or local composition.

A module provider should:

* Be mounted at the narrowest relevant route boundary.
* Remain under its backend-aligned module.
* Avoid duplicating global infrastructure.
* Be destroyed when leaving its owning subtree.

Global placement should not be used merely for convenience.

---

# Testing Requirements

## Unit Tests

Test:

* Runtime state transitions
* Provider factories
* Configuration validation
* Dependency ordering
* Startup orchestration
* Cleanup helpers

## Provider Tests

Test:

* Public context interfaces
* Loading states
* Failure states
* Dependency consumption
* Rerender behavior
* Cleanup

## Integration Tests

Test:

* Full provider composition
* Session restoration before routing
* Logout cleanup
* Workspace switching
* Language and theme changes
* Connectivity transitions
* Realtime lifecycle
* PWA update state

## End-to-End Tests

Test:

* Initial startup
* Authenticated restoration
* Guest startup
* Startup configuration failure
* Offline launch
* Login runtime transition
* Logout transition
* Workspace switching
* New-version update flow
* Mobile viewport and installed PWA startup

---

# Acceptance Criteria

The global runtime architecture is complete when:

* The application has one documented bootstrap sequence.
* Critical runtime configuration is validated before dependent services initialize.
* Global providers are composed once in an explicit dependency order.
* Session restoration completes before protected routing decisions are made.
* Shared clients and runtime services are constructed once per application runtime.
* Global loading and startup-failure interfaces are defined.
* Login, logout, workspace switching, and language changes have coordinated lifecycle behavior.
* Background services have explicit start, stop, retry, and cleanup rules.
* Provider interfaces remain focused and do not cause unnecessary global rerenders.
* Browser-specific capabilities are isolated behind platform-compatible abstractions.
* Runtime behavior supports web, installed PWA, and future mobile packaging.
* Automated tests cover initialization, transitions, failures, and cleanup.

---

# Architecture Rules

1. Global infrastructure must be initialized once above routing, layouts, and pages.
2. The application entry point must remain minimal and free of business logic.
3. Provider ordering must follow explicit dependency direction and must not contain cycles.
4. Critical runtime configuration must be validated before API, session, or routing initialization.
5. Session restoration must reach a definitive state before protected or guest routes are rendered.
6. Shared clients, background services, and lifecycle coordinators must have one explicit runtime owner.
7. Feature pages and components must consume global services rather than initialize competing instances.
8. Runtime transitions such as login, logout, and workspace switching must coordinate cache, authorization, navigation, and background-service behavior.
9. Global contexts must remain focused, typed, and limited to the smallest useful public interface.
10. Every listener, timer, connection, subscription, and pending operation must have documented cleanup behavior.
11. Browser-specific capabilities must be accessed through runtime abstractions that can support PWA and future mobile adapters.
12. Runtime initialization, provider behavior, failure recovery, and cleanup must remain deterministic, observable, accessible, bilingual-ready, and independently testable.
