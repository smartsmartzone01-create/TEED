# Frontend Architecture Principles

## Purpose

This document defines durable rules for the TEED web frontend. The current
implementation is a bilingual Next.js App Router application.

## Architectural position

- Next.js owns routing, rendering, and build behavior.
- TypeScript is required for application source.
- The frontend is responsibility-first, not feature-local.
- Responsibilities are grouped at the top level and subdivided by
  backend-aligned module.
- Shared application-wide infrastructure belongs under `global/`.
- `src/app/` remains a thin route and layout composition layer.
- The backend remains authoritative for business and security decisions.

## Responsibility-first organization

As the application grows, use:

```text
src/
├── app/
├── assets/
├── components/
├── hooks/
├── i18n/
├── lib/
├── providers/
├── schemas/
├── services/
├── styles/
├── types/
└── utils/
```

Within a responsibility:

```text
components/
├── global/
├── identity/
├── marketing/
├── workspace/
└── billing/
```

Do not create a feature-local directory that mixes components, hooks,
services, schemas, types, and styles together. Do not create unused top-level
folders before their responsibility exists.

## Thin App Router

Route files may:

- resolve locale and route parameters;
- define route metadata;
- compose layouts and page components;
- call server-safe data access;
- handle framework redirects and not-found states.

Route files should not accumulate reusable UI, form workflows, API-client
configuration, or module state.

## Server and client components

Server components are the default. Use client components only when browser
state, effects, event handling, client-only libraries, or interactive
providers require them.

Keep `"use client"` boundaries low and explicit. A server component may
compose a client component; client modules must not import server-only APIs.

## Data flow

The target authenticated flow is:

```text
Route/Page → Component → Hook → Service → Shared API Client → Backend
                                      ↓
                         Schema validation/normalization
                                      ↓
                               UI state/cache
```

Components and pages must not create unrelated ad hoc `fetch` calls.
Server-side access may use the same contract through a server-safe adapter.

## Backend alignment

Frontend modules use the same domain names as backend modules where possible:
`identity`, `workspace`, `billing`, and so on. Alignment improves discovery
without forcing identical implementation layers.

## Global ownership

`global/` is for application-wide primitives and infrastructure:

- design-system primitives;
- theme and localization controls;
- global providers;
- shared API behavior;
- cross-module messages and errors;
- generic utilities.

Marketing-only components remain under `marketing/`; identity-only behavior
will remain under `identity/`.

## State principles

Use the narrowest correct owner:

- server state belongs in the approved server-state mechanism;
- session state belongs in the session provider;
- form state belongs in the form;
- local interaction state belongs in the component;
- persistent browser state is allowed only through an explicit storage policy.

Do not mirror server data into a second global store without a proven need.

## Internationalization

- English and Swahili are supported from the beginning.
- User-visible application copy belongs in locale resources.
- Navigation uses locale-aware helpers.
- Layouts set the document language.
- UI must tolerate longer translated strings.
- Backend error codes map to localized frontend messages; raw backend prose
  must not become the only translation mechanism.

## Styling

- Tailwind utilities handle routine composition and responsive styling.
- Global CSS defines reset, tokens, shared layout, and global animation rules.
- CSS modules own complex component-specific visuals and animations.
- Use semantic design tokens rather than repeated arbitrary colors.
- Shared primitives own variants and interaction states.

## Accessibility

Accessibility is part of completion:

- semantic elements and labels;
- complete keyboard operation;
- visible focus;
- correct dialog/menu/tooltip primitives;
- sufficient contrast;
- reduced-motion support;
- touch-friendly targets;
- meaningful loading and error announcements.

## Security boundary

The browser is untrusted. The frontend may hide unavailable controls for user
experience, but it cannot grant permission, validate ownership, establish
identity, or protect secrets.

## Quality rules

- `pnpm lint`, `pnpm typecheck`, and `pnpm build` must pass.
- Critical workflows require automated tests as testing tools are adopted.
- Components should have one clear responsibility.
- Reuse follows demonstrated similarity, not premature abstraction.
- Dependency and architecture changes update documentation.

## Current versus planned

### Implemented

- Next.js App Router and static locale routes;
- English/Swahili resources and locale navigation;
- global theme and tooltip providers;
- marketing page, header, hero, platform connections, and overview;
- reusable buttons, dropdown menus, and tooltips;
- global design tokens and marketing CSS modules.

### Planned

- identity pages and contracts;
- shared API client, schemas, services, and hooks;
- session restoration and protected application shell;
- automated component and end-to-end testing;
- installable PWA and offline behavior;
- future mobile-wrapper adapters.
