# Frontend Routing and Layout Structure

## Current routes

The current App Router exposes one localized marketing route:

```text
src/app/
└── [locale]/
    ├── layout.tsx
    └── page.tsx
```

`generateStaticParams` produces English and Swahili variants. With
`localePrefix: "as-needed"`, English uses the default unprefixed path and
Swahili can use the locale prefix.

## Locale routing

`src/i18n/routing.ts` defines:

- locales: `en`, `sw`;
- default locale: `en`;
- automatic detection;
- one-year `TEED_LOCALE` cookie.

`src/i18n/navigation.ts` exports the only approved navigation helpers:

- `Link`;
- `redirect`;
- `getPathname`;
- `usePathname`;
- `useRouter`.

Components must use these helpers rather than plain Next.js navigation when
locale preservation is required.

## Request configuration

`src/i18n/request.ts`:

1. resolves the requested locale;
2. falls back to the default;
3. loads global and marketing message bundles;
4. merges them for `next-intl`.

Future module messages should be loaded intentionally. Avoid putting all
translations in one ever-growing global file.

## Locale layout

`[locale]/layout.tsx` owns:

- locale validation;
- static locale parameters;
- request locale initialization;
- document `lang`;
- Geist font variables;
- global providers;
- internationalization client context;
- application metadata;
- the global stylesheet.

The layout is the runtime composition boundary, not a location for module
business logic.

## Home page

`[locale]/page.tsx` is intentionally thin:

```text
MarketingStage
├── MarketingHeader
└── main
    ├── MarketingHero
    ├── PlatformConnections
    └── TeedOverview
```

It resolves locale state and composes reusable marketing sections.

## Proxy

`src/proxy.ts` integrates locale routing at the request boundary. Changes to
its matcher must be checked against:

- static assets;
- Next.js internal paths;
- API routes if introduced;
- locale prefixes;
- future protected routing.

## Planned route categories

The following are architecture targets, not current files:

```text
Public marketing
Identity guest routes
Protected application routes
System/error routes
Future administration
```

Likely identity routes include:

```text
/{locale}/register
/{locale}/verify-email
/{locale}/login
/{locale}/onboarding
/{locale}/forgot-password
/{locale}/reset-password
```

Final names should be chosen when implementing each workflow.

## Layout targets

Future layouts may include:

- marketing layout;
- identity layout;
- protected application shell;
- system/error layout;
- administration layout.

Layouts own repeated visual structure and provider boundaries. They must not
pretend to authorize backend operations.

## Route protection

Protected navigation waits for session initialization. Guest-only pages handle
already-authenticated users according to backend/session state. Direct access,
reload, expiration, and multi-tab logout must be tested.

Frontend redirects are usability behavior. Every protected backend endpoint
still enforces authentication and permissions.

## Metadata

Public pages should provide localized titles and descriptions. Sensitive
authenticated pages must avoid exposing private information in metadata,
history, or previews.

## Adding a route

1. identify public, guest-only, or protected category;
2. define the backend contract first when data is required;
3. create a thin route file;
4. compose module components;
5. add English and Swahili copy;
6. define loading, empty, error, and unauthorized states;
7. test direct navigation and responsive behavior;
8. update this structure document.
