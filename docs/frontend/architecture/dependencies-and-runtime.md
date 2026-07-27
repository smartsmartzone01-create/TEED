# Frontend Dependencies and Runtime

## Current runtime

The frontend currently uses:

- Next.js 16 App Router;
- React 19;
- TypeScript 5;
- `next-intl` for locale routing and messages;
- `next-themes` for theme persistence;
- Tailwind CSS 4;
- Radix primitives for accessible overlays;
- Lucide React icons;
- `class-variance-authority`, `clsx`, and `tailwind-merge`;
- Geist local package fonts;
- pnpm with a committed lockfile.

`package.json` and `pnpm-lock.yaml` are authoritative for installed versions.

## Package manager

Use pnpm consistently:

```powershell
pnpm install --frozen-lockfile
pnpm dev
pnpm lint
pnpm typecheck
pnpm build
```

Do not commit `node_modules/` or `.next/`.

## Dependency rules

Add a package only when it has:

- a current requirement;
- a clear responsibility and owner;
- compatibility with server/client rendering boundaries;
- acceptable maintenance, security, accessibility, and bundle impact;
- no adequate existing solution.

Old documents that mentioned Vite, React Router, Axios, TanStack Query, React
Hook Form, Zod, Vitest, or Playwright did not install those technologies.
Adoption remains a future decision based on the actual implementation need.

## Next.js responsibilities

Next.js owns:

- App Router file conventions;
- server and client component boundaries;
- static generation and server rendering;
- metadata;
- image optimization;
- production builds;
- proxy behavior.

Do not add a second client router or Vite-based application entry point.

## Rendering rules

- Prefer server components for static and server-resolved content.
- Use client components for interactive controls and providers.
- Do not access `window`, storage, or browser-only APIs during server render.
- Avoid turning large trees into client bundles for one small interaction.
- Keep provider order explicit in the locale layout.

## Environment variables

- Server-only values must not use the public prefix.
- Browser-readable values must be intentionally exposed through Next.js
  public configuration.
- Never expose secrets in client bundles.
- API origins and environment names should be validated centrally.
- `.env*` files remain untracked.

## Fonts and assets

Geist is loaded from the installed package rather than fetched at runtime.
Static icons and images live under `src/assets/` when imported by code or
`public/` when they require stable public URLs.

SVG imports need an explicit TypeScript module declaration or another approved
asset strategy so standalone `pnpm typecheck` succeeds.

## Provider runtime

The current provider order is:

```text
Locale layout
└── GlobalProviders
    ├── ThemeProvider
    └── TooltipProvider
        └── NextIntlClientProvider
```

Add providers only for cross-cutting runtime concerns. Module state should not
be placed globally by convenience.

## Dependency boundaries

- route files import components and providers;
- components may import global primitives and module utilities;
- services must not import React components;
- schemas and types remain framework-light;
- server-only modules must be marked and isolated;
- global modules must not import business-specific implementations.

## Verification

Required frontend checks:

```powershell
pnpm lint
pnpm typecheck
pnpm build
```

Current repository note: lint and production build pass; standalone typecheck
requires SVG module declarations. This is known work, not an accepted permanent
failure.

## Future decisions

Before implementing authenticated UI, decide and record:

- shared API-client strategy;
- schema-validation library;
- form-state library;
- server-state/cache library;
- unit/component test runner;
- browser end-to-end framework;
- PWA tooling.

Each decision should be introduced with the first real consumer, verification,
and removal of superseded documentation.
