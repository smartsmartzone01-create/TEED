# TEED Documentation

## Purpose

This directory is the durable technical reference for TEED. It describes the
approved architecture and the organization of the current repository.

The running code and verified tests describe current implementation behavior.
These documents define intended constraints and explain that behavior. When
documentation and code disagree, resolve the disagreement explicitly.

## Source-of-truth order

1. verified tests and observable behavior;
2. current source code and migrations;
3. approved architecture and structure documents;
4. planned or proposed sections.

## Status language

- **Implemented** — present and verified in the repository.
- **Required** — approved rule governing current work.
- **Planned** — accepted direction not implemented yet.
- **Proposed** — requires a decision before implementation.

Temporary chat handoffs, copied folder trees, and session progress notes are
not architecture documents.

## Backend

### Architecture

- [Principles](backend/architecture/principles.md)
- [Dependencies and configuration](backend/architecture/dependencies-and-configuration.md)
- [Database and data integrity](backend/architecture/database-and-data-integrity.md)
- [API, security, and responses](backend/architecture/api-security-and-responses.md)
- [Development and testing](backend/architecture/development-and-testing.md)

### Structure

- [Project organization](backend/structure/project-organization.md)
- [Platform foundation](backend/structure/platform-foundation.md)
- [Identity module](backend/structure/identity-module.md)

## Frontend

### Architecture

- [Principles](frontend/architecture/principles.md)
- [Dependencies and runtime](frontend/architecture/dependencies-and-runtime.md)
- [UI, accessibility, and internationalization](frontend/architecture/ui-accessibility-and-i18n.md)
- [API, state, and security](frontend/architecture/api-state-and-security.md)
- [PWA and future mobile](frontend/architecture/pwa-and-future-mobile.md)

### Structure

- [Project organization](frontend/structure/project-organization.md)
- [Routing and layouts](frontend/structure/routing-and-layouts.md)
- [Components, styles, and providers](frontend/structure/components-styles-and-providers.md)

## Commands

- [Git](commands/git.md)
- [Backend](commands/backend.md)
- [Frontend](commands/frontend.md)

## Maintenance rules

- Update the relevant document in the same change as an architectural or
  structural change.
- Keep architecture rules separate from folder descriptions.
- Mark future behavior as planned or proposed.
- Do not add handoff documents to the repository.
- Prefer focused references over repeating the same rule in several files.
- Ensure commands are safe, scoped, and tested against the current project.
