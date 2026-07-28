# Backend Dependencies and Configuration

## Purpose

This document defines dependency ownership and configuration rules for the
TEED Django backend.

## Runtime

The backend currently targets:

- Python 3;
- Django 5.2;
- Django REST Framework;
- PostgreSQL through `psycopg2-binary`;
- Simple JWT with refresh-token blacklisting;
- `drf-spectacular` for OpenAPI;
- `django-filter`;
- `django-cors-headers`;
- `python-decouple`.

Pinned versions live in:

```text
backend/requirements/
├── base.txt
├── development.txt
└── production.txt
```

`base.txt` contains runtime dependencies. Environment-specific files should
include or extend the base set and contain only environment-specific packages.
Requirement files must be UTF-8 text so standard Python tooling can read them.
`development.txt` also owns development-only tools such as Ruff.

## Dependency rules

A dependency is acceptable only when it:

- solves a current, identified requirement;
- is actively maintained and compatible with the supported runtime;
- has an acceptable security and licensing posture;
- does not duplicate an existing dependency;
- has clear ownership and removal criteria;
- is pinned reproducibly.

Do not install a package merely because an old document proposed it. Update
dependencies and documentation in the same change.

## Settings organization

```text
backend/config/settings/
├── base.py
├── development.py
└── production.py
```

- `base.py` owns settings common to all environments.
- `development.py` imports the base and applies local-development overrides.
- `production.py` imports the base and applies secure production overrides.
- Test-specific settings should be introduced when the automated test
  environment is standardized.

A setting must be declared once. Repeated dictionaries such as duplicate
`REST_FRAMEWORK` declarations are prohibited because later declarations
silently replace earlier ones.

## Environment configuration

Configuration is read through `python-decouple`. The repository provides
`.env.example`; the real `.env` is excluded from Git.

Required categories include:

- Django secret key and allowed hosts;
- PostgreSQL name, user, password, host, and port;
- JWT lifetimes;
- outbound email configuration;
- allowed frontend origins;
- future cache, queue, storage, and integration credentials.

Rules:

- never commit real credentials;
- fail clearly when a required production setting is missing;
- provide safe development defaults only for non-secret values;
- parse lists, integers, and booleans explicitly;
- keep production `DEBUG` disabled;
- rotate secrets without changing application code.

## Django applications

Installed applications are grouped as:

- `DJANGO_APPS`;
- `THIRD_PARTY_APPS`;
- `LOCAL_APPS`.

Every business module must use its application configuration class. The custom
user model must remain configured before the first production migration.

## Middleware

Middleware order is security-sensitive. CORS middleware must be installed when
cross-origin browser access is enabled and placed according to the package's
documented ordering requirements. Middleware must not be added without a
specific responsibility.

Development allows only the known local frontend origins. Production reads its
origin allowlist from `CORS_ALLOWED_ORIGINS`. Credentialed cross-origin requests
remain disabled while authentication uses bearer tokens rather than cookies.

## Formatting and linting

Ruff is the backend formatter and linter. Its configuration lives in the
repository-level `pyproject.toml`. Migrations are excluded to keep generated
history stable, while application and configuration code must pass both:

```powershell
python -m ruff format backend --check
python -m ruff check backend
```

## REST Framework

The shared DRF configuration owns:

- schema generation;
- pagination;
- exception handling;
- JSON renderers and parsers;
- JWT authentication;
- default permission policy.

The target default permission posture is authenticated access. Public identity
views opt out explicitly with `AllowAny` and no authentication classes where
appropriate.

## JWT configuration

Current JWT rules include:

- short-lived access tokens;
- longer-lived refresh tokens;
- refresh-token rotation;
- blacklisting after rotation;
- `Bearer` authorization headers;
- UUID user identifiers in the `user_id` claim.

Production configuration must use secure signing secrets, HTTPS, controlled
token lifetimes, and tested refresh/logout behavior.

## Email

Verification email currently uses Django's email interface synchronously.
Development and tests may use console or in-memory backends. Production must
use a configured provider and should eventually deliver through a background
job after the relevant database transaction commits.

## Logging

Logging configuration belongs in settings, while reusable formatters and
helpers live under `common/logging/`. Environment overrides may change
handlers and levels, not the semantic meaning of log events.

## Configuration verification

Before a backend change is accepted:

```powershell
python -m ruff format backend --check
python -m ruff check backend
python manage.py check
python manage.py makemigrations --check
python manage.py test
```

Production deployment must additionally validate environment variables,
database connectivity, migrations, static files, security settings, and
health checks.
