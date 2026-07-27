# Frontend Project Organization

## Current tree

```text
frontend/
├── public/
├── src/
│   ├── app/
│   │   ├── [locale]/
│   │   │   ├── layout.tsx
│   │   │   └── page.tsx
│   │   ├── favicon.ico
│   │   └── globals.css
│   ├── assets/
│   │   └── marketing/platforms/
│   ├── components/
│   │   ├── global/
│   │   │   ├── controls/
│   │   │   └── primitives/
│   │   └── marketing/
│   ├── i18n/
│   │   ├── messages/
│   │   ├── navigation.ts
│   │   ├── request.ts
│   │   └── routing.ts
│   ├── lib/
│   │   └── global/
│   ├── providers/
│   │   └── global/
│   ├── styles/
│   │   ├── global/
│   │   └── marketing/
│   └── proxy.ts
├── next.config.ts
├── package.json
├── pnpm-lock.yaml
├── postcss.config.mjs
└── tsconfig.json
```

## Responsibility-first growth

The current tree contains only responsibilities already needed. Future
identity work adds parallel responsibility folders:

```text
src/
├── components/identity/
├── hooks/identity/
├── schemas/identity/
├── services/identity/
├── styles/identity/
└── types/identity/
```

Cross-module items live under the relevant `global/` directory:

```text
components/global/
hooks/global/
providers/global/
services/global/
styles/global/
types/global/
```

Do not create `src/features/identity/` containing every layer. Do not create a
separate `pages/` router because Next.js App Router owns routes in `src/app/`.

## Import aliases

`@/` resolves to `frontend/src/`. Use it for stable cross-directory imports:

```typescript
import { Button } from "@/components/global/primitives/button";
```

Relative imports are acceptable for tightly related files in one small
directory. Avoid deep `../../..` traversal.

## `app/`

Owns:

- route and layout files;
- route metadata;
- locale entry points;
- global CSS import;
- framework-specific loading, error, and not-found files as introduced.

Reusable page sections live in `components/`, not inside large route files.

## `components/`

- `global/primitives/`: Button, dropdown, tooltip, and future base controls.
- `global/controls/`: composed application-wide controls such as theme and
  language switching.
- `marketing/`: brand and public marketing components.
- future business directories align with backend modules.

## `providers/`

Providers are grouped by responsibility. `global/global-providers.tsx`
currently composes theme and tooltip providers. Future query and session
providers should be introduced only with their real contracts.

## `i18n/`

- `routing.ts` defines locales and prefix behavior;
- `navigation.ts` exports locale-aware navigation helpers;
- `request.ts` loads server messages;
- `messages/{module}/{locale}.json` stores user-facing copy.

## `styles/`

- global tokens, base styles, layouts, and shared animations;
- module-specific CSS modules for complex visuals;
- Tailwind utilities colocated in component markup for routine composition.

## `assets/` and `public/`

Imported, component-owned assets live under `src/assets/{module}/`.
Stable URL resources, future manifests, and public platform files belong under
`public/`.

## `lib/` and future utilities

`lib/` contains integration helpers and low-level reusable code such as class
name composition. Pure generic helpers may use `utils/` when introduced.
Business services do not belong in `lib/`.

## File naming

- components, hooks, services, and utilities: `kebab-case.ts[x]`;
- React components and types: `PascalCase`;
- functions and variables: `camelCase`;
- CSS modules: `{component}.module.css`;
- locale files: locale code such as `en.json` and `sw.json`.

## Dependency direction

```text
app → layouts/components → hooks → services → API client
                         ↘ schemas/types
```

Styles and assets support components. Services, schemas, and types must not
import UI components.
