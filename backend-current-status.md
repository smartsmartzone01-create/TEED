# Backend Current Status

## Overview
This backend repo is a Django + Django REST Framework project with a clean separation between core configuration, shared infrastructure, and application-level code. The current implementation focuses on project structure, environment-based settings, API documentation, and centralized helper modules.

## Implemented Components

### Project Entry Points
- `backend/manage.py`
  - Django command-line utility for server, migrations, shell, etc.
- `backend/config/asgi.py`
  - ASGI application entrypoint for async deployment.
- `backend/config/wsgi.py`
  - WSGI application entrypoint for traditional hosting.

### Configuration
- `backend/config/settings/base.py`
  - Shared settings across environments.
  - Uses `decouple.AutoConfig` for environment configuration.
  - Defines `BASE_DIR`, `SECRET_KEY`, `ALLOWED_HOSTS`.
  - Database connection configured for PostgreSQL.
  - Uses separate app lists:
    - `DJANGO_APPS`
    - `THIRD_PARTY_APPS`
    - `LOCAL_APPS`
  - Sets up `MIDDLEWARE`, `TEMPLATES`, `STATIC`, `MEDIA`, logging, and DRF configuration.
- `backend/config/settings/development.py`
  - Imports base settings and enables `DEBUG = True`.
- `backend/config/settings/production.py`
  - Imports base settings and sets `DEBUG = False`.

### Routing and API Documentation
- `backend/config/urls.py`
  - Registers Django admin.
  - Exposes API documentation endpoints:
    - `/schema/`
    - `/swagger/`
    - `/redoc/`
  - Uses `drf_spectacular` for schema and docs generation.

### Shared Infrastructure (`common/`)
The `common/` package provides reusable infrastructure for backend features and is the main place for shared utilities.

- `common/constants/`
  - Centralized constants for notifications, status, and system values.
- `common/database/`
  - Custom base models, managers, querysets, and UUID utilities.
- `common/exceptions/`
  - Custom exception handling and domain-level exception modules.
  - Includes `teed_exception_handler` used by DRF.
- `common/logging/`
  - Custom logging configuration utilities.
- `common/pagination/`
  - Defines `TEEDPagination` used as the default DRF paginator.
- `common/permissions/`
  - Placeholder for custom permission classes.
- `common/responses/`
  - Response helper modules for success, error, and pagination formats.
- `common/types/`
  - Shared type definitions.
- `common/utils/`
  - General utility functions.
- `common/validators/`
  - Custom validation helpers.

### App Scaffolding
- `backend/apps/`
  - Currently present as a package but without active app registrations.
  - Designed to host domain-specific Django applications in the future.

### Requirements and Environment
- `backend/requirements/`
  - `base.txt`
  - `development.txt`
  - `production.txt`
  - Dependency pinning for different deployment environments.

## Current Status
- Backend skeleton is implemented and ready for domain apps.
- Core settings and environment-aware configuration are in place.
- API documentation is configured.
- Shared infrastructure is organized under `common/`.
- No concrete business apps or API endpoints are currently wired into `LOCAL_APPS`.

## Recommended Next Steps
1. Create and register Django apps under `backend/apps/`.
2. Add app-specific URLs to `backend/config/urls.py`.
3. Implement serializers, models, views, and tests for each domain.
4. Expand `LOCAL_APPS` in `backend/config/settings/base.py`.
5. Add contextual docs or README content for app structure and conventions.
