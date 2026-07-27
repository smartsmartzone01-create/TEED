# `docs/frontend/foundation/api-and-service-architecture.md`

# API and Service Architecture

## Purpose

This document defines how the TEED frontend communicates with backend services.

It establishes the boundaries between UI code, query and mutation hooks, service functions, transport infrastructure, runtime configuration, and backend contracts.

The architecture should prevent pages and components from depending directly on HTTP details while keeping requests typed, observable, cancellable, secure, and reusable across web, PWA, and future mobile clients.

---

# Objectives

The API and service architecture should:

* Centralize transport behavior.
* Keep pages independent of HTTP implementation details.
* Provide typed request and response contracts.
* Normalize backend errors.
* Integrate with authentication and session handling.
* Support cancellation, retries, and deduplication.
* Respect backend module boundaries.
* Remain compatible with multiple frontend clients.

---

# Scope

This document covers:

* API client architecture
* Service-layer responsibilities
* Request and response contracts
* Authentication integration
* Error normalization
* Retries
* Cancellation
* Idempotency
* Pagination
* File transfer
* API versioning
* Testing

State caching and query ownership are defined in `state-and-data-management.md`.

---

# Core Principle

UI code should express application intent rather than transport mechanics.

```text
Page or Component
        │
        ▼
Query or Mutation Hook
        │
        ▼
Module Service
        │
        ▼
Shared API Client
        │
        ▼
Backend API
```

Each layer should expose only the details required by the layer above it.

---

# Architectural Layers

The API architecture consists of four primary layers:

1. UI consumers
2. Query and mutation hooks
3. Module services
4. Shared transport client

Cross-cutting concerns such as session handling, errors, logging, and runtime configuration should be integrated centrally.

---

# UI Consumers

Pages and components should:

* Call typed hooks or application-facing service abstractions.
* Handle loading, success, empty, and normalized error states.
* Provide user input.
* Render results.

Pages and components should not:

* Construct API base URLs.
* Set authorization headers.
* Interpret raw transport errors.
* Implement retry loops.
* Parse backend envelopes repeatedly.
* Call low-level HTTP functions directly.

---

# Query and Mutation Hooks

Hooks connect backend operations to the state-management layer.

Examples:

```text
useWorkspaceQuery

useProjectListQuery

useCreateProjectMutation

useUpdateMemberMutation
```

Hooks are responsible for:

* Calling module services
* Defining query keys
* Connecting cache behavior
* Applying invalidation rules
* Exposing normalized lifecycle state

Hooks should not contain raw URL construction.

---

# Module Services

Each backend-aligned frontend module should expose service functions for the resources it owns.

Recommended structure:

```text
services/
    identity/
    workspace/
    projects/
    billing/
```

Example functions:

```text
identityService.login

workspaceService.getWorkspace

projectService.createProject

billingService.getInvoice
```

Module services define application-facing backend operations.

---

# Service Responsibilities

A module service may:

* Select the correct endpoint.
* Construct path and query parameters.
* Pass typed request bodies.
* Parse or validate responses.
* Map backend structures into frontend contracts.
* Select operation-specific request options.

A module service should not:

* Manage component state.
* Display notifications.
* Navigate between pages.
* Own query caching.
* Contain visual logic.

---

# Shared API Client

The shared API client owns low-level transport behavior.

Responsibilities include:

* Base URL resolution
* HTTP method execution
* Header construction
* Credential handling
* Request serialization
* Response parsing
* Timeout behavior
* Cancellation support
* Error normalization
* Request correlation
* Session integration

There should normally be one shared client configuration per backend API origin.

---

# API Client Interface

A transport interface may expose methods such as:

```typescript
interface ApiClient {
  get<TResponse>(
    path: string,
    options?: RequestOptions,
  ): Promise<TResponse>;

  post<TRequest, TResponse>(
    path: string,
    body: TRequest,
    options?: RequestOptions,
  ): Promise<TResponse>;

  patch<TRequest, TResponse>(
    path: string,
    body: TRequest,
    options?: RequestOptions,
  ): Promise<TResponse>;

  delete<TResponse>(
    path: string,
    options?: RequestOptions,
  ): Promise<TResponse>;
}
```

The actual implementation may use `fetch` or another approved transport library, but callers should depend on the shared abstraction.

---

# Runtime Configuration

API origins and runtime behavior should come from validated configuration.

Examples:

```text
API base URL

Request timeout

Environment identifier

Observability endpoint

Feature-control endpoint
```

Configuration should be parsed during application startup.

Invalid critical configuration should fail clearly rather than causing silent request failures.

---

# URL Construction

Endpoints should be declared centrally within their owning module.

Example:

```text
/workspaces

/workspaces/{workspaceId}

/workspaces/{workspaceId}/members
```

Path parameters must be encoded safely.

Manual string construction scattered across components should be prohibited.

---

# Query Parameters

Query parameters should be created through a shared serialization strategy.

The serializer should handle:

* Optional values
* Arrays
* Booleans
* Dates
* Pagination
* Sorting
* Filters

Undefined values should normally be omitted rather than serialized as literal strings.

---

# Request Contracts

Each request should have an explicit typed contract.

Example:

```typescript
interface CreateProjectRequest {
  workspaceId: string;
  name: string;
  description?: string;
}
```

UI form values do not always need to match API request objects exactly.

Mapping should occur at the service or submission boundary.

---

# Response Contracts

Each response should have a typed representation.

Example:

```typescript
interface ProjectResponse {
  id: string;
  workspaceId: string;
  name: string;
  status: string;
  createdAt: string;
}
```

Backend responses should be validated where malformed or untrusted data would materially affect application behavior.

---

# Domain Mapping

Backend transport models may differ from frontend domain models.

Example:

```text
Backend Response
      │
      ▼
Validation and Mapping
      │
      ▼
Frontend Model
```

Mapping is appropriate when it:

* Normalizes dates
* Converts enums
* Flattens envelopes
* Renames unstable transport fields
* Protects UI code from backend implementation details

Mapping should not invent data that the backend did not provide.

---

# Shared Types

Types should follow the responsibility-first source structure.

Recommended placement:

```text
types/
    global/
    identity/
    workspace/
    billing/
```

Transport-specific types should remain distinguishable from UI-only models when their purposes differ.

---

# Schema Validation

Runtime schemas may be used for:

* Critical session responses
* Authentication results
* Environment configuration
* External integration payloads
* Realtime events
* High-risk financial or permission data

Schema failures should become normalized application errors.

Validation should not be duplicated in every component.

---

# Response Envelopes

If the backend uses a standard envelope, parsing should occur in the shared client or stable service boundary.

Example:

```text
data

meta

errors

requestId
```

Components should receive the useful result rather than repeatedly unpacking the same envelope.

Pagination metadata may remain available where consumers require it.

---

# Authentication Integration

The API client should obtain authentication material through the session architecture.

Depending on backend design, this may involve:

* Secure cookies
* Bearer access tokens
* CSRF tokens
* Device or session identifiers

Components must never manually attach authentication credentials.

---

# Cookie-Based Sessions

For cookie-based authentication:

* Credentials should be sent according to backend policy.
* CSRF protections must be respected.
* Authentication cookies should not be readable by frontend code when configured as HTTP-only.
* Cross-origin settings must be explicitly configured.

The frontend should not attempt to recreate backend cookie security.

---

# Token-Based Sessions

For token-based authentication:

* Token access should be centralized.
* Tokens should not be passed through component props.
* Token refresh should use one coordinated mechanism.
* Failed refresh should trigger session-expiration handling.
* Sensitive tokens should not be logged.

Storage behavior must follow the security and session architecture.

---

# Session Refresh

When a request fails because authentication requires renewal:

```text
Request
   │
   ▼
Authentication Failure
   │
   ▼
Coordinated Refresh
   │
   ├── Success → Retry Eligible Request
   └── Failure → Expire Session
```

Only one refresh attempt should be active at a time.

Concurrent eligible requests should wait for the same refresh result rather than starting independent refresh operations.

---

# Request Retries

Retries should be deliberate.

Automatic retries may be appropriate for:

* Temporary network failures
* Selected server errors
* Safe read operations
* Explicitly idempotent writes

Retries are usually inappropriate for:

* Validation failures
* Authorization failures
* Most client errors
* Non-idempotent submissions
* Repeated session refresh failure

Retry count and delay should remain bounded.

---

# Retry Backoff

Where retries are supported, use controlled backoff.

Example:

```text
Initial Request

↓

Short Delay

↓

Retry

↓

Longer Delay

↓

Final Failure
```

Jitter may be applied to reduce synchronized retry traffic.

The interface should distinguish active retry from final failure when useful.

---

# Idempotency

Operations that may be repeated due to retries or reconnects should support idempotency where the backend contract permits it.

Examples:

* Payment initiation
* Order creation
* Invitation submission
* Offline mutation replay

Idempotency identifiers should be generated and managed through shared infrastructure or module services, not ad hoc in components.

---

# Request Cancellation

Requests should support cancellation when:

* A component unmounts.
* A route changes.
* Search input changes rapidly.
* A newer request replaces an older one.
* The user cancels a long-running operation.

Cancellation should not be presented as an application error.

---

# Timeouts

The transport layer should support reasonable request timeouts.

Different operation categories may require different policies:

| Operation           | Policy                           |
| ------------------- | -------------------------------- |
| Standard reads      | Normal timeout                   |
| File uploads        | Extended timeout                 |
| Report generation   | Backend job or extended workflow |
| Realtime connection | Connection-specific lifecycle    |

Timeout errors should be normalized distinctly from general network failures.

---

# Request Deduplication

Identical concurrent reads should be deduplicated primarily by the query layer.

The transport client may also guard against duplicate session refresh or other infrastructure operations.

Write requests should not be deduplicated automatically unless the operation contract explicitly supports it.

---

# Error Normalization

Raw errors should be converted into a predictable application error model.

Possible categories include:

```text
Validation

Authentication

Authorization

Not Found

Conflict

Rate Limited

Network

Timeout

Server

Unexpected
```

The normalized error may contain:

```typescript
interface ApplicationError {
  category: string;
  code?: string;
  messageKey: string;
  fieldErrors?: Record<string, string>;
  retryable: boolean;
  requestId?: string;
}
```

User-facing text should come from translation resources rather than raw backend text whenever practical.

---

# Backend Error Mapping

Backend error codes should be mapped centrally.

Example:

```text
PROJECT_NAME_EXISTS
        │
        ▼
Conflict Error
        │
        ▼
Translated User Message
```

Unknown error codes should fall back safely while preserving request identifiers for diagnostics.

---

# HTTP Status Handling

HTTP status codes provide transport meaning but should not be the only source of application behavior.

Typical mapping:

| Status | Meaning                            |
| ------ | ---------------------------------- |
| 400    | Invalid request                    |
| 401    | Authentication required or expired |
| 403    | Authenticated but unauthorized     |
| 404    | Resource not found                 |
| 409    | State conflict                     |
| 422    | Validation failure                 |
| 429    | Rate limited                       |
| 5xx    | Server failure                     |

Backend-specific error codes should refine this mapping.

---

# Rate Limiting

When the backend returns rate-limit information, the frontend should:

* Stop immediate repeated attempts.
* Present clear feedback.
* Respect retry timing when supplied.
* Avoid multiple independent countdown implementations.

Authentication and resend operations may require dedicated UI behavior.

---

# Pagination

The service architecture should support:

* Page-number pagination
* Offset pagination
* Cursor pagination
* Infinite loading

Pagination contracts should be typed.

Example:

```typescript
interface PaginatedResponse<TItem> {
  items: TItem[];
  nextCursor?: string;
  total?: number;
}
```

UI code should not infer unavailable metadata.

---

# Sorting and Filtering

Sort and filter options should map through module-owned contracts.

Allowed fields should be explicit.

The frontend should not forward arbitrary user-provided field names directly to backend query construction.

---

# File Uploads

File uploads should use dedicated service operations.

The architecture should support:

* File type validation
* File size validation
* Upload progress where available
* Cancellation
* Backend validation errors
* Presigned upload flows
* Retry policy
* Security scanning states

Files should not be converted to base64 unless the backend contract explicitly requires it.

---

# Presigned Uploads

A presigned workflow may follow:

```text
Request Upload Authorization
          │
          ▼
Upload File to Storage
          │
          ▼
Confirm Upload with Backend
```

The frontend should treat completion as successful only after the backend confirms the final resource state.

---

# File Downloads

Downloads should:

* Use backend-authorized URLs or responses.
* Preserve filename and content type when provided.
* Avoid exposing credentials in URLs.
* Handle expiration of temporary links.
* Provide clear progress or failure feedback for large files.

---

# Long-Running Operations

Long-running work should generally use backend jobs rather than keeping a standard request open indefinitely.

Example:

```text
Start Job
   │
   ▼
Receive Job ID
   │
   ▼
Poll or Subscribe
   │
   ▼
Completed / Failed
```

Job state should integrate with the shared query and realtime architecture.

---

# Realtime Transport

Realtime transport should remain separate from standard request transport while sharing:

* Authentication context
* Runtime configuration
* Error normalization
* Observability conventions
* Backend-aligned event contracts

Realtime events should update the canonical state cache as defined in `state-and-data-management.md`.

---

# Offline Behavior

The API layer should detect network unavailability but should not independently invent offline workflows.

Offline behavior may include:

* Serving cached reads
* Deferring eligible mutations
* Reporting unavailable operations
* Resuming safe requests after reconnection

Mutation replay requires explicit operation support and idempotency.

---

# API Versioning

The frontend should consume an explicit supported API version where the backend uses versioned routes or headers.

Examples:

```text
/api/v1

Accept-Version header
```

Version selection should be centralized.

Pages should not target different API versions independently.

---

# Backward Compatibility

Backend changes should preserve documented client contracts or be introduced through controlled versioning.

The frontend should not silently depend on undocumented backend fields.

Deprecated fields should be removed through coordinated migration.

---

# Client-Agnostic Contracts

Backend APIs should remain usable by:

* Web application
* Installed PWA
* Future native mobile wrapper
* Future native mobile clients
* Approved integrations

Contracts should not assume browser-only state or browser-specific navigation behavior.

---

# Security Requirements

The API architecture must:

* Use secure transport.
* Protect authentication material.
* Respect CSRF policy.
* Encode path and query values.
* Avoid logging secrets.
* Avoid exposing internal stack traces.
* Validate high-risk responses.
* Treat backend authorization as authoritative.

Frontend validation improves UX but does not replace backend validation.

---

# Request Headers

Shared headers may include:

```text
Content-Type

Accept

Authorization

CSRF token

Locale

Client version

Correlation ID
```

Header construction should remain centralized.

Only required and approved context should be transmitted.

---

# Locale Headers

The current language may be transmitted when the backend returns localized content.

Changing language should invalidate only backend data whose representation depends on locale.

The API should not require localized strings for stable identifiers or permission codes.

---

# Correlation IDs

Requests should support correlation with backend logs.

A request identifier may be:

* Generated by the client
* Supplied by the backend
* Passed through both systems

Correlation identifiers may be included in diagnostics but should not expose sensitive information.

---

# Logging

The transport layer may log:

* Request category
* Operation identifier
* Duration
* Result category
* Retry count
* Request identifier

It must not log:

* Passwords
* Verification codes
* Access tokens
* Session cookies
* Private file contents
* Sensitive request bodies

Development logging and production logging should follow separate policies.

---

# Analytics

Business analytics should not be emitted automatically for every API call.

Transport metrics and product analytics have different purposes.

API operations may provide technical telemetry such as:

```text
api_request_completed

api_request_failed

api_retry_attempted
```

Product events should be emitted at the application workflow boundary.

---

# Folder Structure

Recommended source placement:

```text
src/
    services/
        global/
            apiClient.ts
            errorMapper.ts
            requestConfig.ts

        identity/
            identityService.ts

        workspace/
            workspaceService.ts

        billing/
            billingService.ts

    hooks/
        identity/
        workspace/
        billing/

    schemas/
        global/
        identity/
        workspace/

    types/
        global/
        identity/
        workspace/
```

This preserves responsibility-first organization with backend-aligned module subfolders.

---

# Naming Conventions

Service operations should use application intent.

Prefer:

```text
getWorkspace

createProject

inviteMember

cancelSubscription
```

Avoid names tied only to transport mechanics such as:

```text
postWorkspaceEndpoint

callProjectApi
```

Hooks should include their lifecycle purpose:

```text
useWorkspaceQuery

useCreateProjectMutation
```

---

# Dependency Boundaries

Allowed dependency direction:

```text
Page
  ↓
Hook
  ↓
Service
  ↓
API Client
```

The API client must not depend on:

* Pages
* UI components
* Navigation
* Module hooks

Global transport infrastructure should remain unaware of feature presentation.

---

# Mocking and Development

The architecture should support controlled API mocking for:

* Component development
* Automated tests
* Offline frontend development
* Error-state testing
* Demonstration environments

Mocks should implement the same typed contracts as real services.

Mock-only behavior must not leak into production contracts.

---

# Testing Requirements

## Unit Tests

Test:

* URL construction
* Query serialization
* Request mapping
* Response mapping
* Error normalization
* Retry eligibility
* Schema validation
* Header construction

## Service Tests

Test:

* Correct endpoint and method
* Request contract
* Response transformation
* Error mapping
* Cancellation
* File operations

## Integration Tests

Test:

* Query-to-service integration
* Session refresh coordination
* Permission failures
* Rate limiting
* API version configuration
* Runtime configuration

## End-to-End Tests

Test:

* Successful reads and writes
* Expired sessions
* Network failure and recovery
* Validation errors
* Unauthorized operations
* File upload and download
* Slow requests
* Duplicate submissions
* PWA reconnection behavior

---

# Acceptance Criteria

The API and service architecture is complete when:

* Pages and components never depend directly on raw transport logic.
* Backend-aligned modules expose typed service operations.
* One shared API client owns transport configuration and behavior.
* Authentication credentials are attached centrally.
* Session refresh is coordinated and duplicate refresh attempts are prevented.
* Request and response contracts are typed.
* Critical responses and runtime configuration can be validated.
* Errors are normalized into one predictable application model.
* Retries are bounded and limited to eligible operations.
* Requests can be cancelled where their results become obsolete.
* File transfers, pagination, and long-running jobs use documented patterns.
* API contracts remain platform-neutral for web, PWA, and future mobile clients.
* Logging and diagnostics never expose sensitive data.

---

# Architecture Rules

1. Pages and components must never call raw backend endpoints directly.
2. Query and mutation hooks must call backend-aligned module services.
3. Module services must depend on the shared API client rather than creating independent transport clients.
4. Authentication headers, cookies, refresh behavior, and request correlation must be managed centrally.
5. Every backend operation must have explicit typed request and response contracts.
6. Backend errors must be normalized before reaching UI consumers.
7. Automatic retries must be bounded and limited to safe or explicitly idempotent operations.
8. Obsolete requests must support cancellation or stale-result protection.
9. API URLs, versions, headers, and runtime configuration must not be scattered across feature code.
10. File transfer and offline replay workflows must follow explicit backend contracts.
11. Transport infrastructure must remain independent of routing, presentation, and business UI behavior.
12. Backend contracts must remain secure, bilingual-ready, PWA-compatible, and client-agnostic for future mobile applications.
