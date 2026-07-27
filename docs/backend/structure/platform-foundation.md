# Backend Platform Foundation Structure

## Purpose

The platform foundation under `backend/common/` provides business-agnostic
building blocks used by Django modules.

## Database foundation

```text
common/
├── database/
│   ├── base_model.py
│   ├── managers.py
│   ├── querysets.py
│   └── uuid.py
└── mixins/
    └── database.py
```

- `UUIDMixin` provides UUID4 identifiers.
- `TimestampMixin` provides creation and update timestamps.
- `SoftDeleteMixin` provides lifecycle operations and deletion fields.
- `BaseModel` composes the mixins.
- `BaseQuerySet` provides alive, deleted, restore, soft-delete, and hard-delete
  collection operations.
- `BaseManager` exposes only alive rows.
- `AllObjectsManager` includes deleted rows.

The identity `User` uses its specialized manager for user creation while
retaining the safe default-query behavior.

## Exceptions

```text
common/exceptions/
├── base.py
├── handlers.py
└── modules/
    ├── identity.py
    └── ...
```

`TEEDException` represents expected domain failures with:

- a human-readable message;
- a stable machine code;
- an HTTP status.

The DRF exception handler converts domain and framework exceptions into the
standard error envelope. Module exception files define errors without placing
business workflows in `common/`.

## Responses

```text
common/responses/
├── response.py
├── success.py
├── error.py
└── pagination.py
```

`SuccessResponse` and `ErrorResponse` provide consistent envelopes.
Pagination responses add navigation and count metadata without changing the
meaning of the envelope.

Views should use these response types rather than manually recreating payload
shapes.

## Pagination

```text
common/pagination/
├── constants.py
└── default.py
```

`TEEDPagination` is the shared DRF paginator. Default and maximum page sizes
belong in this foundation. Modules may specialize pagination only when their
contract requires it.

## Logging

```text
common/logging/
├── formatters.py
├── handlers.py
└── logger.py
```

Logging helpers must produce structured, operationally useful events and must
redact credentials and sensitive identity data. Request correlation and audit
events remain future foundation work.

## Constants

`common/constants/` contains stable, cross-module constants. Module-only
choices remain with the owning module. Do not duplicate Django settings as
constants.

## Permissions

`common/permissions/` is reserved for reusable, business-agnostic permission
building blocks. Module-specific ownership and role policies belong in their
modules.

## Validators

`common/validators/` is reserved for genuinely reusable normalization and
validation. Transport-only validation belongs in serializers; business
validation belongs in services; database invariants belong in constraints.

## Types and utilities

- `types/` contains shared type contracts.
- `utils/` contains small, deterministic, business-agnostic helpers.

Neither directory may become an unowned collection of unrelated code.

## Foundation maturity

### Implemented

- UUID and base-model composition;
- safe managers and querysets;
- soft deletion;
- exception and response envelopes;
- pagination;
- initial logging organization.

### Partially implemented

- production-grade logging;
- reusable permission policy;
- validation and shared types;
- complete foundation test coverage.

### Planned

- audit actor and request correlation;
- background-task integration;
- storage and cache adapters;
- health and observability primitives.

## Promotion checklist

Before adding code to `common/`:

- Is it independent of every business module?
- Does more than one module need it, or is it foundational?
- Is its API stable enough to support dependents?
- Can it be tested without module data?
- Does it introduce an upward dependency?
- Is its ownership documented?
