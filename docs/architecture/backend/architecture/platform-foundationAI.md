# TEED Platform Foundation — AI-Ready Development Reference

**Document type:** Working architecture specification  
**Project:** TEED — Technical Ecommerce Environment Development  
**Status:** Active  
**Version:** 1.0  
**Primary audience:** Developers, technical reviewers, and AI coding assistants  
**Source of truth:** This document governs shared backend infrastructure until replaced by a formally approved architecture specification.

---

## 1. Purpose

The TEED Platform Foundation defines the shared technical infrastructure used by every backend module.

Its purpose is to prevent individual applications from creating incompatible models, utilities, exceptions, response formats, pagination rules, logging behavior, and API conventions.

Every new TEED backend module must follow this document.

---

## 2. How to Use This Document

Before generating or reviewing TEED code:

1. Read the relevant foundation section.
2. Reuse existing shared components before creating new ones.
3. Respect module boundaries.
4. Do not introduce a new platform-wide convention without updating this document.
5. Treat explicit rules as mandatory unless an Architecture Decision Record replaces them.

### Status definitions

- **Implemented:** The architecture and implementation are considered complete.
- **In progress:** The design is accepted, but implementation or integration is not complete.
- **Deferred:** Intentionally postponed because another module or decision must exist first.
- **Verification required:** Documentation says the component exists, but the repository should be checked before relying on it.

---

## 3. Platform Principles

TEED follows these architectural principles:

- API first
- Modular monolith
- Domain-oriented modules
- Composition over inheritance
- Single responsibility
- Convention over configuration
- UUID-based persistent models
- Thin views
- Service-layer business logic
- Repository pattern for persistence workflows
- Selector pattern for read queries
- Stateless business logic where practical
- Explicit module boundaries
- Stable machine-readable API contracts

---

## 4. Backend Architecture

```text
backend/
├── apps/
│   └── <module>/
│       ├── api/              # views, serializers, routes
│       ├── models/           # domain models
│       ├── repositories/     # persistence and write-oriented data access
│       ├── selectors/        # read-oriented queries
│       ├── services/         # business workflows and orchestration
│       ├── tests/            # module tests
│       ├── admin.py
│       └── apps.py
│
├── common/
│   ├── constants/            # platform-wide constants only
│   ├── database/             # UUIDs, base models, managers, querysets
│   ├── exceptions/           # shared exception contract and handlers
│   ├── logging/              # logging access, handlers, formatters
│   ├── mixins/               # reusable composable behavior
│   ├── pagination/           # shared pagination behavior
│   ├── permissions/          # shared permission infrastructure
│   ├── responses/            # standard API response contract
│   ├── types/                # reusable platform types
│   ├── utils/                # generic helpers
│   └── validators/           # reusable validation primitives
│
├── config/
│   ├── settings/
│   │   ├── base.py
│   │   ├── development.py
│   │   └── production.py
│   ├── urls.py
│   ├── asgi.py
│   └── wsgi.py
│
├── logs/
├── media/
├── static/
├── requirements/
├── tests/                    # cross-module and system tests
└── manage.py
```

### Module responsibility rules

- **Views** handle HTTP concerns and delegate work.
- **Serializers** validate and transform API data.
- **Services** enforce business rules and coordinate workflows.
- **Repositories** perform persistence-oriented operations and complex writes.
- **Selectors** perform reusable read queries.
- **Models** represent domain state and essential model invariants.
- **Permissions** decide whether an actor may perform an action.
- **Exceptions** communicate expected failure conditions.
- **Tests** verify behavior at the correct architectural layer.

Business workflows must not be implemented directly in views, serializers, managers, or shared utilities.

---

## 5. Foundation Dependency Order

```text
PF-01  Common Constants and Types
   ↓
PF-02  UUID Strategy
   ↓
PF-03  Base Model
   ↓
PF-04  Timestamp Mixins
   ↓
PF-05  Managers and QuerySets
   ↓
PF-06  Soft Delete
   ↓
PF-07  Audit Framework (deferred until Identity)
   ↓
PF-08  Exception Framework
   ↓
PF-09  API Response Standard
   ↓
PF-10  Logging Framework
   ↓
PF-11  Pagination Framework
   ↓
PF-12  Django REST Framework Configuration
   ↓
PF-13  OpenAPI Documentation
```

This sequence represents architectural dependency, not necessarily migration dependency.

---

# 6. Platform Foundation Components

## PF-01 — Common Constants and Types

**Status:** Implemented

### Purpose

Provide centralized locations for values and reusable types that are genuinely shared across the platform.

### Location

```text
common/
├── constants/
│   ├── system.py
│   ├── status.py
│   └── notifications.py
└── types/
```

### Rules

- Business-specific constants belong inside their owning module.
- `system.py` contains platform defaults, limits, and global configuration constants.
- `status.py` contains only statuses used by multiple platform domains.
- `notifications.py` contains shared notification channels or types only when they are truly cross-module.
- Empty shared files may remain empty until a valid platform-wide need exists.
- Do not move a constant into `common` merely to avoid duplication between unrelated concepts.

---

## PF-02 — UUID Strategy

**Status:** Implemented

### Purpose

Provide one consistent identifier strategy for every persistent TEED business model.

### Decision

TEED uses UUID version 4 as the primary key for persistent business models.

### Location

```text
common/database/uuid.py
```

### Rules

- Every persistent business model uses a UUID4 primary key.
- UUIDs are generated by the application.
- UUIDs are exposed through APIs.
- UUIDs are used in URLs.
- Sequential integer identifiers are not used for business models.
- UUID generation is defined centrally and reused.

### Rationale

UUID4:

- is supported by Python, Django, and PostgreSQL;
- avoids predictable sequential identifiers;
- supports future distribution and horizontal scaling;
- integrates well with external systems;
- provides one consistent identifier format across modules.

### Reference implementation

```python
import uuid


def generate_uuid() -> uuid.UUID:
    return uuid.uuid4()
```

---

## PF-03 — Base Model

**Status:** Implemented

### Purpose

Provide the common abstract model composition used by persistent TEED models.

### Location

```text
common/database/base_model.py
common/mixins/database.py
```

### Composition

```text
UUIDMixin
TimestampMixin
SoftDeleteMixin
      ↓
BaseModel
```

### Rules

- `BaseModel` is abstract.
- It must never create its own database table.
- It contains infrastructure behavior only.
- Business logic must never be added to `BaseModel`.
- New reusable behavior should normally be introduced as a focused mixin.
- Avoid turning `BaseModel` into a large inheritance hierarchy.

### Expected managers

```python
objects = BaseManager()
all_objects = AllObjectsManager()
```

---

## PF-04 — Timestamp Mixins

**Status:** Implemented

### Purpose

Provide automatic creation and modification timestamps.

### Fields

- `created_at`
- `updated_at`

### Rules

- `created_at` is assigned when the record is created.
- `created_at` is not user-editable.
- `updated_at` changes when the model is saved.
- Timestamps are stored in UTC.
- The mixin is abstract.
- Presentation-layer timezone conversion must not change stored values.

### Expected field behavior

```python
created_at = models.DateTimeField(auto_now_add=True, editable=False)
updated_at = models.DateTimeField(auto_now=True)
```

---

## PF-05 — Managers and QuerySets

**Status:** Implemented

### Purpose

Provide reusable, platform-level query behavior and safe default access to persistent records.

### Location

```text
common/database/managers.py
common/database/querysets.py
```

### Core query operations

- `alive()`
- `deleted()`
- `soft_delete()`
- `restore()`
- `hard_delete()`

### Managers

#### `objects`

- Returns non-deleted records.
- Hides soft-deleted records.
- Is used by normal application code.

#### `all_objects`

- Returns all records.
- Includes soft-deleted records.
- Is reserved for administration, recovery, audits, and maintenance.

### Rules

- Managers and querysets contain reusable database-query behavior.
- They must not contain business workflows.
- Module-specific querying belongs in module querysets, selectors, or repositories.
- The base queryset does not implement platform-wide search.
- Search behavior belongs to the domain that understands the searchable data.
- Complex workflows remain in services.

---

## PF-06 — Soft Delete

**Status:** Implemented according to the current architecture record; repository verification recommended

### Purpose

Prevent accidental permanent data loss by marking records as deleted instead of removing them immediately.

### Fields

- `is_deleted`
- `deleted_at`

### Required behavior

- Instance `delete()` performs a soft delete by default.
- Queryset `soft_delete()` marks matching records as deleted.
- `restore()` reactivates soft-deleted records.
- `hard_delete()` permanently removes records and must be explicit.
- `objects` hides deleted records.
- `all_objects` includes deleted records.

### Rules

- Permanent deletion is an exceptional administrative action.
- Soft deletion is not an audit log.
- A deletion reason does not belong in the generic soft-delete mixin.
- Actor tracking belongs to the Audit Framework.
- Unique constraints and restoration behavior must be reviewed per domain model.
- Services must decide whether deletion is allowed before deletion behavior is invoked.

---

## PF-07 — Audit Framework

**Status:** Deferred

### Purpose

Track who created, updated, or deleted important records.

### Reason for deferral

The audit framework depends on the Identity module because actor fields reference the platform User model.

### Planned fields

- `created_by`
- `updated_by`
- `deleted_by`

### Rules

- Audit tracking is separate from application logging.
- Actor fields must reference the canonical TEED User model.
- The mixin must not be implemented with a temporary user model.
- Full audit-event history may require a separate append-only audit model.

---

## PF-08 — Exception Framework

**Status:** Implemented according to the current architecture record; handler integration should be verified

### Purpose

Provide one predictable exception contract for all TEED modules.

### Location

```text
common/exceptions/
├── base.py
├── handlers.py
└── modules/
```

### Failure flow

```text
Service
   ↓
Raise TEEDException
   ↓
Global DRF exception handler
   ↓
TEED error response
   ↓
HTTP response
```

### Base exception contract

Every expected platform exception must provide:

- `default_message`
- `default_code`
- `default_status_code`

### Rules

- Do not raise generic `Exception` for expected business failures.
- Business exceptions inherit from `TEEDException`.
- Machine-readable error codes are mandatory and stable.
- Services raise domain and workflow exceptions.
- Views must not duplicate business validation.
- The global handler converts known exceptions into PF-09 responses.
- Unexpected exceptions are logged without leaking sensitive internals.
- Module exceptions are grouped by owning domain.

---

## PF-09 — API Response Standard

**Status:** Implemented according to the current architecture record; endpoint integration should be verified

### Purpose

Provide a stable response envelope across TEED APIs.

### Success response

```json
{
  "success": true,
  "message": "Resource retrieved successfully.",
  "data": {},
  "errors": null,
  "meta": {}
}
```

### Error response

```json
{
  "success": false,
  "message": "The request could not be completed.",
  "data": null,
  "errors": [
    {
      "code": "resource_not_found",
      "message": "The requested resource was not found."
    }
  ],
  "meta": {}
}
```

### Rules

- HTTP status codes are authoritative.
- Every API response uses the standard top-level envelope unless a protocol requirement makes this impossible.
- Frontend logic must rely on HTTP status and stable error codes, not translated messages.
- `errors[].code` is mandatory for structured failures.
- Messages may be translated into English or Swahili.
- Error codes remain stable across languages.
- DRF `Response` is wrapped through shared helpers, not replaced with a custom transport.
- Sensitive implementation details must never be returned to clients.

---

## PF-10 — Logging Framework

**Status:** In progress

### Purpose

Provide centralized application logging for debugging, monitoring, operational visibility, and security-relevant events.

### Location

```text
common/logging/
├── logger.py
├── handlers.py
└── formatters.py
```

Django logging configuration belongs in `config/settings/base.py`.

### Namespaces

- `django.*` — Django framework logs
- `teed.*` — TEED application logs

### Rules

- Do not use `print()` for application events.
- Logs must contain useful context without exposing secrets.
- Exceptions are logged centrally when appropriate.
- Logging is separate from audit tracking.
- Do not log passwords, tokens, secret keys, complete payment details, or unnecessarily sensitive personal data.
- Module code must not create conflicting logging configurations.
- Environment-specific destinations and levels belong in settings.

### Future integrations

- Error monitoring
- Central log aggregation
- Structured JSON logs
- Trace and correlation identifiers

---

## PF-11 — Pagination Framework

**Status:** In progress

### Purpose

Provide one default pagination standard for list APIs.

### Location

```text
common/pagination/
├── constants.py
└── default.py
```

### Defaults

- Default page size: `20`
- Maximum page size: `100`
- Client query parameter: `page_size`

### Default strategy

TEED uses page-number pagination for normal dashboard, administrative, and reporting APIs.

### Required metadata

```json
{
  "page": 1,
  "page_size": 20,
  "total_items": 250,
  "total_pages": 13
}
```

### Rules

- List endpoints use the shared default pagination class.
- Pagination metadata is returned through the PF-09 `meta` field.
- Modules must not introduce a different pagination strategy without a documented need.
- Cursor pagination may be introduced for high-volume feeds or timelines.
- Pagination behavior must be documented in OpenAPI.

---

## PF-12 — Django REST Framework Configuration

**Status:** In progress

### Purpose

Centralize DRF behavior and connect TEED API infrastructure.

### Location

```text
config/settings/base.py
```

### Responsibilities

- Register Django REST Framework.
- Apply the global exception handler.
- Apply default pagination.
- Configure schema generation.
- Configure parsers and renderers.
- Define safe authentication and permission defaults.

### Rules

- Global DRF configuration is centralized.
- Modules must not redefine platform-wide behavior.
- Identity owns authentication implementation.
- RBAC owns authorization policy.
- Authentication must not be guessed before the Identity architecture is approved.
- Production APIs should use explicit secure defaults rather than accidental permissive behavior.
- Temporary empty authentication or permission settings must be clearly documented and removed when Identity/RBAC are integrated.

---

## PF-13 — OpenAPI Documentation

**Status:** Implemented according to the current architecture record; generated schema should be verified

### Purpose

Provide a machine-readable contract for TEED APIs.

### Technology

`drf-spectacular`

### Endpoints

| Endpoint | Purpose |
|---|---|
| `/api/schema/` | OpenAPI schema |
| `/api/docs/` | Swagger UI |
| `/api/redoc/` | ReDoc UI |

### Rules

- Every public API must be represented in the schema.
- Request serializers define request structures.
- Response schemas follow PF-09.
- Error schemas follow PF-08 and PF-09.
- Pagination parameters and metadata must be documented.
- Authentication schemes are added when Identity authentication is implemented.
- Descriptions explain business meaning, not merely field names.
- Schema generation should later be included in CI validation.

---

# 7. Global Development Rules

## Models

- Use UUID4 primary keys.
- Inherit from the approved abstract base model where appropriate.
- Use UTC timestamps.
- Use soft deletion unless the domain explicitly requires permanent deletion.
- Keep cross-model workflows out of model methods.
- Define database constraints for invariants the database can enforce.

## API layer

- Keep views thin.
- Validate input through serializers.
- Delegate business workflows to services.
- Use the standard response envelope.
- Use stable error codes.
- Document endpoints in OpenAPI.

## Services

- Own business decisions and workflow orchestration.
- Use transactions for multi-write workflows.
- Raise TEED exceptions for expected failures.
- Call repositories and selectors instead of duplicating complex data access.
- Avoid direct HTTP concerns.

## Repositories

- Own complex persistence operations and write-focused data access.
- Do not decide business policy.
- Do not format API responses.

## Selectors

- Own reusable read queries.
- Return domain data or querysets suitable for the caller.
- Do not mutate persistent state.

## Logging and security

- Never log secrets.
- Never expose stack traces to API clients.
- Never use client-facing messages as programmatic identifiers.
- Treat authentication and authorization as separate concerns.
- Apply least privilege.

---

# 8. AI Coding Instructions

Any AI assistant generating TEED code must:

1. Read this document before proposing code.
2. Preserve the modular-monolith structure.
3. Reuse existing shared components.
4. Avoid duplicate UUID, response, exception, pagination, or logging frameworks.
5. Keep views and serializers free of business workflows.
6. Put business orchestration in services.
7. Put reusable reads in selectors.
8. Put complex writes and persistence workflows in repositories.
9. Use UUID4 for persistent business models.
10. Use the PF-09 response contract.
11. Use stable machine-readable exception codes.
12. Never use translated messages for frontend branching.
13. Never use `print()` for application events.
14. Do not add actor-based audit fields before the canonical User model exists.
15. Do not silently change an architectural convention.
16. Document a new convention before implementing it.
17. State assumptions when repository code has not been inspected.
18. Generate tests for business rules and failure paths.
19. Prefer small, focused files and composable components.
20. Maintain backward compatibility unless a documented migration is approved.

---

# 9. Current Readiness

## Ready for continued development

- UUID strategy
- Base-model composition
- Timestamp behavior
- Manager and queryset responsibilities
- Soft-delete contract
- Exception contract
- API response contract
- OpenAPI direction

## Complete or verify before production-facing APIs

- Django logging configuration
- Global exception-handler behavior
- Pagination integration with PF-09
- DRF authentication and permission defaults
- Generated OpenAPI schema
- Audit framework after Identity
- Security and production settings

---

# 10. Immediate Next Phase

Before implementing authentication endpoints, prepare the Identity architecture:

- canonical User model;
- authentication identifiers;
- email and phone strategy;
- password and account lifecycle;
- verification flows;
- session or token strategy;
- tenant and business membership boundaries;
- Identity-to-RBAC responsibilities;
- audit-field integration plan.

Do not create temporary audit actors or duplicate user concepts before this design is approved.

---

# 11. Architecture Decision Summary

| ID | Decision |
|---|---|
| ADR-001 | TEED uses UUID4 for persistent business identifiers. |
| ADR-002 | Shared behavior is composed through focused mixins. |
| ADR-003 | Base models contain infrastructure, not business logic. |
| ADR-004 | Soft deletion is the default deletion strategy. |
| ADR-005 | `objects` hides deleted records; `all_objects` includes them. |
| ADR-006 | Search belongs to domain modules, not `BaseQuerySet`. |
| ADR-007 | Services own business workflows. |
| ADR-008 | HTTP status codes are authoritative. |
| ADR-009 | Frontend branching uses stable error codes, never messages. |
| ADR-010 | Logging and auditing are separate systems. |
| ADR-011 | Page-number pagination is the default list strategy. |
| ADR-012 | `drf-spectacular` provides OpenAPI documentation. |
| ADR-013 | Audit waits for the canonical Identity User model. |

---

# 12. Change Control

When changing this foundation:

1. Describe the problem.
2. Record the proposed architectural decision.
3. Identify affected modules.
4. Define migration or compatibility impact.
5. Update this document.
6. Update implementation and tests.
7. Verify OpenAPI and API-contract changes.

A code change that conflicts with this document must either be corrected or accompanied by an approved documentation change.
