# Backend Development and Testing

## Development method

Backend work proceeds in small, reviewable bricks:

1. confirm the contract and architectural owner;
2. write or update tests;
3. implement the smallest coherent behavior;
4. run focused tests;
5. run the full backend verification suite;
6. review the diff and documentation;
7. commit one intentional unit of work.

Mechanical repository-wide formatting belongs in a dedicated brick and pull
request. Do not combine it with behavior changes unless the formatter is being
introduced for the first time and the combined scope is explicitly agreed.

## Definition of done

A backend change is complete when:

- behavior and error cases are explicit;
- permissions are intentional;
- service and persistence boundaries are respected;
- migrations are reviewed;
- relevant tests pass;
- the full test suite passes;
- Django system checks pass;
- no secrets or debug artifacts are included;
- API and architecture documentation remain accurate.

## Test layers

### Model and manager tests

Verify entity behavior, constraints, custom managers, soft deletion, and
intrinsic properties.

### Serializer tests

Verify valid input, normalization, required fields, format errors, and
field-level error mapping without unnecessary database access.

### Selector and repository tests

Verify query visibility, case handling, persistence results, and database
effects.

### Service tests

Verify workflows, domain exceptions, transactions, rollback, tokens, and
external-effect coordination.

### API tests

Verify routes, permissions, authentication, HTTP status, response envelopes,
field exposure, and integration between serializers and services.

### Foundation tests

Shared infrastructure requires tests for exception conversion, responses,
pagination, database mixins, logging behavior, and permission defaults.

## Identity test coverage

Implemented tests currently cover:

- user manager and selectors;
- registration serializer, service, and API;
- email verification model, serializer, service, and API;
- verification locking, resend limits, delivery callbacks, security events, and
  resend throttles;
- token service;
- session model, service, authentication, rotation, reuse, and API behavior;
- onboarding serializer, service, and API;
- email authentication serializer, service, API, and throttles.

Password-recovery tests will accompany that future contract.

## External effects

Email tests use Django's in-memory backend and patch code generation where a
known value is necessary. Tests must assert that plaintext codes are delivered
but not persisted.

Tests should not call real external services.

## Database testing

PostgreSQL is the production authority. A faster test database may be useful,
but database-specific constraints and concurrency behavior require PostgreSQL
coverage before release.

Test configuration must be reproducible and must never connect to production
data.

## Required commands

From `backend/` with the virtual environment active:

```powershell
python manage.py check
python manage.py makemigrations --check
python manage.py test
```

Run a focused identity module:

```powershell
python manage.py test apps.identity.tests
```

Run one test module:

```powershell
python manage.py test apps.identity.tests.test_authentication_service
```

## Continuous integration target

The repository should add automated checks for:

- dependency installation;
- formatting and linting;
- static type analysis when configured;
- migrations;
- Django checks;
- all tests against an isolated database;
- OpenAPI schema generation;
- secret scanning.

CI must use the same commands developers can run locally.

## Review checklist

- Is the change in the correct module and layer?
- Does a lower layer import a higher layer?
- Are public and protected permissions explicit?
- Are transaction boundaries correct?
- Can concurrent requests violate the rule?
- Are errors stable and non-sensitive?
- Are tests checking observable outcomes?
- Is unrelated cleanup excluded?
- Is formatter-only work isolated from behavior changes?
- Does the documentation still describe reality?
