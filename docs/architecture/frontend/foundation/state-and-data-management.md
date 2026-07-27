# `docs/frontend/foundation/state-and-data-management.md`

# State and Data Management Architecture

## Purpose

This document defines how state and data are owned, stored, synchronized, updated, and consumed across the TEED frontend.

The architecture separates server-owned data from client-owned interface state so that each category uses the correct lifecycle, persistence strategy, and update mechanism.

The goal is to prevent duplicated state, inconsistent caches, unnecessary global stores, and tightly coupled modules.

---

# Objectives

The state and data architecture should:

* Define clear ownership for every piece of state.
* Separate server state from client state.
* Minimize global mutable state.
* Centralize asynchronous data handling.
* Support caching, invalidation, retries, and refetching.
* Support optimistic and realtime updates.
* Remain compatible with web, PWA, and future mobile clients.
* Preserve strict boundaries between frontend modules.

---

# Scope

This document covers:

* State categories
* Server state
* Global client state
* Module state
* Local component state
* URL state
* Form state
* Cache ownership
* Data synchronization
* Optimistic updates
* Realtime updates
* Offline behavior
* Persistence
* Testing

This document does not define low-level API transport details, which belong in `api-and-service-architecture.md`.

---

# Core Principle

State should live in the narrowest scope that can correctly own it.

```text
Component State
      ↓
Page State
      ↓
Module State
      ↓
Global State
```

State should only move upward when multiple independent consumers genuinely require shared ownership.

Global state is not the default.

---

# State Categories

Every piece of frontend state should belong to one of the following categories:

1. Server state
2. Global application state
3. Module state
4. Page state
5. Component state
6. URL state
7. Form state
8. Persisted client state

These categories should not be merged into a single universal store.

---

# Server State

Server state is data owned by the backend.

Examples include:

* Current user
* Workspaces
* Projects
* Memberships
* Billing information
* Notifications
* Permissions
* Reports

Server state should be managed through the shared query and mutation layer.

The frontend may cache server state, but it must not treat cached data as permanently authoritative.

---

# Server-State Responsibilities

The server-state layer should manage:

* Fetching
* Caching
* Deduplication
* Loading status
* Error status
* Retry behavior
* Staleness
* Refetching
* Invalidation
* Pagination
* Mutation lifecycle

Pages and components should consume this layer rather than reimplementing request state.

---

# Query Ownership

Queries should be organized by backend-aligned module.

Recommended structure:

```text
hooks/
    identity/
    workspace/
    projects/
    billing/
```

A module should define reusable query hooks for the backend resources it owns.

Examples:

```text
useCurrentUserQuery

useWorkspaceQuery

useProjectListQuery

useBillingSummaryQuery
```

Pages should compose these hooks rather than issue raw requests.

---

# Query Keys

Query keys should be:

* Stable
* Hierarchical
* Serializable
* Module-owned
* Reusable for invalidation

Example:

```text
workspace

workspace.detail.{workspaceId}

workspace.members.{workspaceId}

project.list.{workspaceId}

project.detail.{projectId}
```

Query keys should be created through centralized module-specific factories.

---

# Cache Ownership

The shared query client owns the server-state cache.

Individual components should not create competing caches for the same backend resource.

A resource should have one canonical cached representation wherever practical.

Derived views should be computed from canonical cached data rather than stored as duplicate state.

---

# Staleness

Each query should define an appropriate freshness policy.

Examples:

| Data                  | Typical behavior                        |
| --------------------- | --------------------------------------- |
| Current session       | Refresh when session lifecycle requires |
| Workspace metadata    | Moderately stable                       |
| Notifications         | Frequently refreshed                    |
| Billing summary       | Refetch after billing mutations         |
| Reference data        | Long-lived cache                        |
| Live operational data | Short-lived or realtime                 |

A single global staleness duration should not be applied to all resources.

---

# Cache Invalidation

Mutations should invalidate or update affected resources deliberately.

Example:

```text
Update Project
      │
      ├── Update project detail
      ├── Invalidate project list
      └── Refresh related summaries
```

Broad invalidation of the entire application cache should be avoided except during logout or major context changes.

---

# Global Application State

Global client state is state required across unrelated areas of the application.

Examples may include:

* Current language
* Theme
* Session lifecycle status
* Active workspace context
* Global notification queue
* Application connectivity status
* PWA installation state

Global state should be provided through dedicated global providers or focused global stores.

---

# Global State Rules

Global state should:

* Have one clear owner.
* Expose a small public interface.
* Avoid containing server resources already managed by the query cache.
* Avoid module-specific business state.
* Reset appropriately during logout or context changes.

A global store should not become a general-purpose data dumping area.

---

# Module State

Module state is shared only within one backend-aligned module.

Examples:

* Workspace navigation context
* Project view preferences
* Billing workflow state
* Module-specific filters

Module state should remain under the corresponding module namespace.

Recommended placement:

```text
hooks/
    workspace/

types/
    workspace/

schemas/
    workspace/
```

Module state should not be promoted to global scope solely for convenience.

---

# Local Component State

Local state should be used for temporary presentation behavior.

Examples:

* Dialog visibility
* Dropdown state
* Expanded sections
* Selected tabs
* Hover state
* Temporary input state

Local state should stay within the component unless another component genuinely needs to control it.

---

# Page State

Page state coordinates behavior within a single route.

Examples:

* Selected rows
* Local sorting
* Temporary filters
* Multi-step page workflow state
* Page-specific dialog coordination

Page state should normally be destroyed when the user leaves the route unless product behavior requires persistence.

---

# URL State

The URL should own state that users may reasonably:

* Bookmark
* Share
* Refresh
* Navigate backward to
* Navigate forward to

Examples:

```text
?page=2

?search=invoice

?status=open

?tab=members
```

Search parameters should be parsed and validated before use.

Transient interface state should not be placed in the URL without a navigation or sharing benefit.

---

# Form State

Form state should be managed by the shared form architecture.

It includes:

* Current field values
* Validation state
* Touched state
* Submission state
* Server field errors
* Dirty state

Form data should not be copied into global state during normal editing.

After successful submission, affected server queries should be updated or invalidated.

---

# Derived State

Derived state should be calculated from its source whenever practical.

Examples:

```text
Visible Projects =
Projects + Search + Status Filter
```

Do not store both a source collection and multiple synchronized copies of filtered or sorted versions unless performance measurements justify it.

Memoization may be used for expensive derivations.

---

# Data Transformation

Backend data should be transformed at stable boundaries.

Suitable locations include:

* Service functions
* Query selection functions
* Schema parsing
* Dedicated mapping utilities

UI components should not repeatedly normalize the same backend response.

---

# Mutations

Mutations represent backend-changing operations.

Examples:

* Create
* Update
* Delete
* Archive
* Restore
* Invite
* Approve

Mutation hooks should expose a consistent lifecycle:

```text
Idle

Pending

Success

Error
```

Duplicate submissions should be prevented where they could create harmful repeated operations.

---

# Optimistic Updates

Optimistic updates may be used when:

* The expected result is predictable.
* Failure can be reversed safely.
* The user benefits from immediate feedback.
* Conflicts are unlikely or manageable.

Recommended lifecycle:

```text
Snapshot Current Cache
        │
        ▼
Apply Optimistic Change
        │
        ▼
Send Request
        │
   ┌────┴────┐
   │         │
Success    Failure
   │         │
Reconcile  Roll Back
```

Optimistic updates should not be used for high-risk operations such as billing, permissions, or destructive actions unless the backend contract explicitly supports them.

---

# Realtime Updates

Realtime data may arrive through:

* WebSocket
* Server-Sent Events
* Push notifications
* Polling
* Background synchronization

Realtime events should update or invalidate the canonical query cache.

They should not establish a second independent source of truth.

---

# Realtime Event Handling

Recommended flow:

```text
Realtime Event
      │
      ▼
Validate Event
      │
      ▼
Identify Affected Query
      │
      ├── Patch Cache
      └── Invalidate Query
```

Events should include enough identity information to determine the affected resource.

Duplicate and out-of-order events should be handled safely where relevant.

---

# Context Changes

Some changes affect large portions of server state.

Examples:

* User logout
* Workspace switch
* Organization switch
* Permission refresh
* Language change for localized backend data

Context changes should trigger targeted reset or invalidation policies.

Switching workspace should never leave previous workspace data presented as current.

---

# Persistence

Client persistence should be used selectively.

Suitable examples:

* Language preference
* Theme preference
* Non-sensitive UI preferences
* PWA-related metadata
* Safe draft recovery where explicitly supported

Sensitive server data should not be persisted automatically.

Persistence rules belong in `performance-pwa-and-client-storage.md`.

---

# Offline State

Offline capability should distinguish between:

* Cached readable data
* Pending writes
* Unavailable uncached data
* Stale data
* Failed synchronization

The UI should communicate offline and stale states clearly.

Offline mutations should only be queued where the operation is safe, idempotent, and supported by the backend contract.

---

# Loading States

Loading should be represented at the correct level.

Examples:

* Application initialization
* Route loading
* Page query loading
* Background refetching
* Mutation pending
* Paginated loading

A background refetch should not unnecessarily replace existing content with a full loading screen.

---

# Empty States

Empty state must be distinguished from loading and error states.

```text
Loading ≠ Empty ≠ Error
```

Pages should render explicit empty states when a successful query returns no records.

---

# Error State

Query and mutation errors should be normalized through the application error architecture.

State consumers should receive predictable error shapes rather than raw transport errors.

Errors should remain recoverable through retry, refetch, navigation, or corrective action where appropriate.

---

# Concurrency

The data layer should handle:

* Duplicate requests
* Request cancellation
* Rapid filter changes
* Competing mutations
* Stale responses
* Multiple open tabs

A late response should not overwrite newer state when the underlying request has become obsolete.

---

# Cross-Tab Synchronization

Cross-tab synchronization may be required for:

* Logout
* Session changes
* Workspace context
* Selected preferences
* Connectivity-related state

Cross-tab communication should remain centralized and should not be implemented independently by feature components.

---

# Folder Placement

The responsibility-first source structure remains mandatory.

Example:

```text
src/
    hooks/
        global/
        identity/
        workspace/
        billing/

    types/
        global/
        identity/
        workspace/

    schemas/
        global/
        identity/
        workspace/

    components/
        global/
        workspace/
```

State-related files should be placed by technical responsibility first, then by backend-aligned module.

Feature-local folders containing mixed pages, hooks, types, and components should not be introduced.

---

# Developer Experience

State APIs should be:

* Typed
* Predictable
* Discoverable
* Consistent across modules
* Easy to test
* Explicit about loading and error states

Shared patterns should be documented with canonical examples to reduce module-specific variations.

---

# Testing Requirements

## Unit Tests

Test:

* Query-key factories
* Reducers and stores
* Derived selectors
* Cache update utilities
* State transitions
* Realtime event mapping

## Hook Tests

Test:

* Query success
* Query failure
* Mutation lifecycle
* Invalidation
* Optimistic rollback
* Context changes

## Integration Tests

Test:

* Page and cache integration
* Workspace switching
* Session reset
* Realtime updates
* Offline and reconnect behavior

## End-to-End Tests

Test:

* Data persistence across navigation
* Browser refresh
* Back and forward navigation
* Optimistic success and rollback
* Cross-tab logout
* Offline cached access
* Reconnection synchronization

---

# Acceptance Criteria

The state and data architecture is complete when:

* Server state is managed through one shared query layer.
* Global state is limited to truly application-wide concerns.
* Module and page state have explicit ownership.
* URL state is used for shareable and navigable state.
* Duplicate representations of server resources are avoided.
* Mutations have consistent cache update and invalidation rules.
* Optimistic updates support safe rollback.
* Realtime events update the canonical cache.
* Logout and context switches clear or isolate affected state.
* Offline, loading, empty, stale, and error states are distinguishable.
* State patterns remain compatible with web, PWA, and future mobile clients.

---

# Architecture Rules

1. Every state value must have one explicit owner.
2. State must remain in the narrowest scope that can correctly own it.
3. Backend-owned resources must be managed as server state through the shared query layer.
4. Server state must not be duplicated in general-purpose global stores.
5. Query keys and cache invalidation rules must be owned by the corresponding backend-aligned module.
6. Derived state should be calculated rather than stored whenever practical.
7. URL state should be used only for state that benefits from navigation, refresh, bookmarking, or sharing.
8. Optimistic updates must provide rollback and reconciliation behavior.
9. Realtime updates must patch or invalidate the canonical query cache rather than create a separate data source.
10. Logout and application-context changes must reset all affected state safely.
11. Persistence must be explicit, minimal, and appropriate to the sensitivity of the data.
12. State architecture must remain typed, testable, bilingual-ready, PWA-compatible, and reusable by future mobile clients.
