# Backend Architecture Principles

## Purpose

This document defines the durable rules for the TEED backend. It governs new
backend work unless an explicit architecture decision replaces a rule.

## Current architectural style

TEED is a Django and Django REST Framework modular monolith:

- one deployable backend;
- business capabilities live in Django applications under `backend/apps/`;
- shared, business-agnostic infrastructure lives under `backend/common/`;
- PostgreSQL is the authoritative persistent store;
- HTTP APIs are versioned and client-agnostic;
- the same backend must support the web frontend, a future installed PWA, and
  future mobile clients.

## Source-of-truth order

When sources disagree, use this order:

1. verified behavior and tests;
2. current application code and migrations;
3. these approved architecture documents;
4. planned or proposed documentation.

An inconsistency must be corrected. It must not be hidden by describing
unimplemented behavior as implemented.

## Module ownership

Each business module owns its:

- models and database tables;
- business rules;
- services and workflows;
- selectors and repositories;
- serializers and API views;
- routes, migrations, and tests.

Other modules must not directly change a module's tables. Cross-module
operations must use an explicit service contract. Circular imports and
bidirectional module dependencies are prohibited.

## Layer responsibilities

### API views

API views own HTTP concerns:

- permissions and authentication declarations;
- request deserialization;
- calling one application service;
- converting the result to the standard response envelope;
- selecting the HTTP status.

Views must remain thin. They must not contain reusable business workflows or
direct ORM writes.

### Serializers

Serializers validate and normalize transport input. They may enforce
field-level and request-shape rules. They must not become workflow services or
own database transactions.

### Services

Services own business workflows, orchestration, transaction boundaries, and
domain decisions. A service may call selectors and repositories and may
coordinate other approved services.

### Selectors

Selectors own reusable read queries. They must not change persistent state or
hide business decisions inside query construction.

### Repositories

Repositories own persistence operations and write-oriented data access. They
must not decide business policy.

### Models and managers

Models define persistent state, intrinsic entity behavior, and database
constraints. Managers and querysets define consistent collection behavior,
including the soft-delete visibility policy.

## Dependency direction

The normal dependency direction is:

```text
API → Serializer → Service → Selector/Repository → Model
```

Shared infrastructure may be imported from `common/`. `common/` must never
import a business module. A lower layer must not depend on an API view or
serializer.

## Backend authority

The backend is authoritative for:

- authentication and session validity;
- authorization and permissions;
- validation of protected operations;
- ownership and future tenant isolation;
- uniqueness and database integrity;
- workflow transitions;
- audit and security decisions.

Frontend validation and route guards improve usability but never replace these
controls.

## Data principles

- Persistent entities use UUID version 4 primary keys.
- Shared timestamps and soft-delete fields come from the platform foundation.
- `objects` exposes non-deleted rows; `all_objects` is explicit administrative
  access to all rows.
- Soft deletion is the default where the shared base model is used.
- Hard deletion must be explicit and justified.
- Database constraints protect invariants that remain valid regardless of the
  calling client.
- Transactions protect multi-write workflows.
- All stored timestamps use UTC.

## API principles

- Public application APIs use the `/api/v1/` namespace.
- Requests and responses use JSON unless an endpoint explicitly handles files.
- Success and error payloads use the TEED response envelope.
- Domain failures use stable machine-readable error codes.
- Public endpoints declare `AllowAny` explicitly.
- Protected endpoints require authentication and then apply their domain
  permissions.
- APIs must not expose secrets, passwords, verification codes, or internal
  exception details.

## Security principles

- Default deny is the target permission posture.
- Credentials and verification codes are never stored in plaintext.
- Authentication failures should avoid account enumeration.
- Rate-sensitive endpoints require throttling before production.
- Secrets belong in environment configuration, never source control.
- Logs must not contain tokens, passwords, verification codes, or sensitive
  personal data.
- Security-relevant state changes should become auditable as the audit
  foundation is implemented.

## Quality rules

- Behavior is not complete without tests at the appropriate layer.
- Fixes should include a regression test.
- Migrations are immutable after use; changes require a new migration.
- Imports use the configured application namespace (`apps.identity`, not
  `backend.apps.identity`).
- Formatting and static checks must be automated rather than dependent on
  memory.
- Documentation is updated when a contract or architectural rule changes.

## Current and future scope

### Implemented

- shared UUID, timestamp, and soft-delete infrastructure;
- standard responses, exceptions, pagination, and logging foundations;
- identity registration, email verification, JWT issuing, onboarding, and
  email login layers;
- versioned identity routes and OpenAPI tooling.

### Required next

- stabilize and fully test the identity authentication contract;
- enforce safer global permissions and configuration;
- add refresh, logout, current-session, and password-recovery contracts;
- harden verification delivery, concurrency, and throttling.

### Planned

- audit actor tracking;
- background workers for external delivery;
- workspace and tenant isolation;
- additional business modules and external integrations.
