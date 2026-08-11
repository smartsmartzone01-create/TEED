# Frontend Routing and Layout Structure

## Current routes

The current App Router exposes localized marketing and identity routes:

```text
src/app/
└── [locale]/
    ├── layout.tsx
    ├── page.tsx
    ├── register/
    ├── verify-email/
    ├── login/
    ├── forgot-password/
    ├── password-reset/
    │   ├── verify/
    │   └── new/
    ├── onboarding/
    └── dashboard/
        ├── layout.tsx
        ├── page.tsx
        ├── ai/
        ├── profile/
        │   ├── personal/
        │   ├── edit/
        │   └── contacts/
        ├── preferences/
        ├── security/
        ├── notifications/
        ├── workspaces/
        │   ├── create/
        │   └── access/
        ├── billing/
        └── help/
    └── workspace/
        └── [businessId]/
```

`generateStaticParams` produces English and Swahili variants. The canonical
policy uses `localePrefix: "always"`, so application routes consistently start
with `/en` or `/sw`.

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
3. loads dashboard, global, identity, marketing, and profile message bundles;
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

## Route categories

```text
Public marketing
Identity guest routes
Protected application routes
System/error routes
Future administration
```

Implemented identity routes include:

```text
/{locale}/register
/{locale}/verify-email
/{locale}/login
/{locale}/onboarding
/{locale}/forgot-password
/{locale}/password-reset/verify
/{locale}/password-reset/new
```

Password-reset routes are guest-only and follow the backend's request,
verification, and confirmation sequence. The verification route accepts the
email only as UI continuity; the reset authorization itself remains an
HttpOnly, device-bound backend cookie. Confirmation always returns to login.

## Protected dashboard shell

`dashboard/layout.tsx` owns the authenticated application shell:

- responsive and collapsible sidebar;
- sidebar navigation and account footer;
- sticky account header;
- dashboard content boundary;
- one shared `IdentityAccessBoundary`.

The shell is a frontend composition namespace. It owns no backend model, API,
permission, or duplicated domain state. Profile, identity, notification,
workspace, and billing screens will consume APIs owned by those applications.

The overview currently renders authenticated identity information, four compact
live-state destinations, and explicit extension states only. On desktop,
secondary destination cards provide focused explanations; mobile keeps the four
live-state cards to avoid unnecessary vertical scrolling. Tooltips clarify
compact controls and destination cards without replacing visible labels.
Profile is integrated with its owning backend API and exposes overview,
personal-information, edit, and contact-information routes. Its desktop
navigation expands beneath Profile; mobile uses compact section links rather
than a persistent nested sidebar. The dashboard profile state reads the same
provider and updates immediately after a successful edit.

Placeholder destinations must not simulate workspace, notification, billing,
or AI records before their APIs exist. TEED AI is reserved as a
navigation boundary until its permissions and data contracts are defined.

Workspace selection is URL-owned through the Business UUID. The canonical
route is `/{locale}/workspace/{businessId}`; `/{locale}/workspace` resolves to
the caller's first available membership or returns to the personal workspace
list. This prevents a hidden global selection from becoming the authorization
boundary. Backend membership and fixed-role policies remain authoritative.

The dashboard routes are:

```text
/{locale}/dashboard
/{locale}/dashboard/ai
/{locale}/dashboard/profile
/{locale}/dashboard/profile/personal
/{locale}/dashboard/profile/edit
/{locale}/dashboard/profile/contacts
/{locale}/dashboard/preferences
/{locale}/dashboard/security
/{locale}/dashboard/notifications
/{locale}/dashboard/workspaces
/{locale}/dashboard/workspaces/create
/{locale}/dashboard/workspaces/access
/{locale}/dashboard/billing
/{locale}/dashboard/help
/{locale}/workspace
/{locale}/workspace/{businessId}
```

Future layouts may include a system/error layout and administration layout.

Layouts own repeated visual structure and provider boundaries. They must not
pretend to authorize backend operations.

## Route protection

Protected navigation waits for session initialization. Guest-only pages handle
already-authenticated users according to backend/session state. Direct access,
reload, expiration, and multi-tab logout must be tested.

`IdentityAccessBoundary` is the single client-side owner for guest,
onboarding-only, and dashboard access decisions. Route files declare their
category and remain thin. Components must not recreate these redirects.

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
