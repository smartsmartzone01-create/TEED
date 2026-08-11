# Backend Project Organization

## Current tree

```text
backend/
├── manage.py
├── config/
│   ├── asgi.py
│   ├── urls.py
│   ├── wsgi.py
│   └── settings/
│       ├── base.py
│       ├── development.py
│       └── production.py
├── apps/
│   ├── identity/
│   └── profiles/
├── common/
├── requirements/
│   ├── base.txt
│   ├── development.txt
│   └── production.txt
├── routes/
└── tests/
    └── common/
```

The `routes/` directory is a concise development reference. Durable ownership
and architecture contracts belong under `docs/backend/structure/`.

## `config/`

`config/` owns composition and deployment entry points:

- settings;
- root URL registration;
- ASGI and WSGI applications.

It may register modules and shared framework behavior. It must not contain
module business rules.

## `apps/`

Each subdirectory is a Django business module. The identity module establishes
the current internal pattern:

`apps.workspaces` owns Business tenancy and fixed-role authorization. Future
tenant applications depend on its membership policy instead of defining roles
or workspace tables again. See `workspace-and-rbac-module.md`.

```text
apps/{module}/
├── api/
├── managers/
├── migrations/
├── models/
├── repositories/
├── selectors/
├── serializers/
├── services/
├── tests/
├── admin.py
├── apps.py
└── urls.py
```

Only create a directory when the module actually needs that responsibility.
Empty architecture ceremony is not required.

### Module API

`api/` contains DRF views. A module-level `__init__.py` may export its supported
view classes. `urls.py` maps routes using relative module imports.

### Models and managers

Larger modules use a `models/` package rather than a single `models.py`.
Managers live under `managers/` when their behavior is module-specific.

### Services

Each service file groups a coherent workflow, such as registration,
verification, onboarding, or authentication. Avoid a generic `services.py`
that grows without ownership boundaries.

### Selectors and repositories

Selectors and repositories are separated by read versus persistence
responsibility. Their public functions may be re-exported from package
`__init__.py` files.

### Tests

Module tests live beside their module under `apps/{module}/tests/` and mirror
observable responsibilities:

```text
test_{workflow}_serializer.py
test_{workflow}_service.py
test_{workflow}_api.py
```

Model, manager, selector, repository, and token tests use responsibility-based
names.

## `common/`

`common/` contains stable infrastructure reusable by multiple modules. It is
not a miscellaneous dumping ground and cannot contain identity, workspace,
billing, or other business policy.

Current categories:

```text
common/
├── constants/
├── database/
├── exceptions/
├── http/
├── localization/
├── logging/
├── mixins/
├── pagination/
├── permissions/
├── responses/
├── types/
├── utils/
└── validators/
```

Promote code into `common/` only after its responsibility is business-agnostic
and reuse is real or clearly foundational.

## `tests/`

Root backend tests cover shared infrastructure and cross-module integration.
Business-module tests remain inside their owning module.

## Import rules

The backend execution root is `backend/`. Imports therefore use:

```python
from apps.identity.services import login_email_user
from common.responses import SuccessResponse
```

Do not use:

```python
from backend.apps.identity ...
```

Relative imports are preferred within one module. Absolute `apps.*` and
`common.*` imports make cross-package dependencies explicit.

## Adding a module

1. Define its ownership and public service contracts.
2. Create `apps/{module}/` and its `AppConfig`.
3. Register it in `LOCAL_APPS`.
4. Add only the responsibility directories it uses.
5. Create and review migrations.
6. include its URL configuration under `/api/v1/{module}/`.
7. add module tests and documentation.
8. verify it does not bypass another module's services.

## Naming

- Python files and directories: `snake_case`;
- classes: `PascalCase`;
- functions and variables: `snake_case`;
- test files: `test_*.py`;
- stable error codes: `snake_case`;
- URL paths: lowercase kebab-case or simple lowercase nouns, used consistently.
