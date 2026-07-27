# TEED Frontend Foundation

## Part 1 — Project Initialization, Tooling, Dependencies, and Base Configuration

---

# Document Information

| Field            | Value                                                                                                          |
| ---------------- | -------------------------------------------------------------------------------------------------------------- |
| Document         | Frontend Foundation                                                                                            |
| Project          | TEED — Technical Ecommerce Environment Development                                                             |
| Document Type    | Implementation Foundation Standard                                                                             |
| Status           | Draft                                                                                                          |
| Primary Audience | Frontend Developers, Backend Developers, Technical Leads, DevOps Engineers, QA Engineers, AI Coding Assistants |
| Scope            | Frontend project initialization, dependencies, tooling, configuration, scripts, and base source structure      |
| Depends On       | Frontend Architecture, Backend Architecture, API Standards, Security Architecture                              |
| Output           | A consistent, production-ready frontend foundation for later module implementation                             |

---

# Purpose

This document converts the TEED frontend architecture into a concrete implementation foundation.

It defines:

* How the frontend project should be initialized
* Which tools should be selected
* Which dependencies should be installed
* How source directories should be created
* How TypeScript should be configured
* How Vite should be configured
* How path aliases should be configured
* How environment values should be validated
* How linting and formatting should work
* How testing tools should be prepared
* How Tailwind and custom CSS should be initialized
* How internationalization should be prepared
* How PWA tooling should be introduced
* How the project should remain ready for future mobile wrapping

The goal is to establish a stable frontend platform before business modules are implemented.

---

# Foundation Objectives

The frontend foundation should provide:

* Reproducible project setup
* Strong typing
* Predictable file organization
* Centralized configuration
* Consistent code quality
* Reliable development scripts
* Module-aligned source folders
* Shared application providers
* API integration readiness
* Internationalization readiness
* PWA readiness
* Mobile-wrapper readiness
* Testing readiness
* Production build readiness

The foundation should remain small enough to understand while still supporting future platform growth.

---

# Project Location

The frontend application should live in a dedicated top-level directory.

Recommended repository structure:

```text
teed/
├── backend/
├── frontend/
├── docs/
├── infrastructure/
├── scripts/
├── .gitignore
├── README.md
└── compose.yaml
```

The frontend project root should be:

```text
frontend/
```

All frontend-specific package files, configuration, source code, tests, and build output should remain under this directory.

---

# Package Manager

TEED should use one package manager consistently.

Recommended options include:

* npm
* pnpm
* yarn

The selected package manager should be documented and used by:

* Local development
* Continuous integration
* Production builds
* Container builds
* Dependency updates
* AI coding instructions

The project should not mix lockfiles.

For example, when npm is selected:

```text
package-lock.json
```

should be committed, while unrelated lockfiles should not be added.

---

# Runtime Version

The supported Node.js version should be documented.

Recommended files may include:

```text
frontend/.nvmrc
frontend/.node-version
```

Example:

```text
22
```

The exact version should be selected according to the supported version required by Vite, React, testing tools, PWA tooling, and deployment infrastructure.

The same major runtime version should be used in:

* Local development
* CI
* Docker
* Production builds

---

# Project Initialization

The frontend should be initialized using Vite with React and TypeScript.

Conceptual initialization:

```bash
npm create vite@latest frontend -- --template react-ts
```

After initialization:

```bash
cd frontend
npm install
```

The generated project should then be cleaned and reorganized according to TEED architecture.

Generated demonstration assets and sample components that are not required should be removed.

Examples may include:

```text
src/assets/react.svg
src/App.css
src/index.css
example counter components
default Vite demonstration markup
```

The final source structure should follow the TEED responsibility-first organization.

---

# Core Technology Stack

The frontend foundation should use the following core technologies:

| Responsibility          | Technology                    |
| ----------------------- | ----------------------------- |
| UI framework            | React                         |
| Language                | TypeScript                    |
| Build tool              | Vite                          |
| Routing                 | React Router                  |
| Server state            | TanStack Query                |
| Forms                   | React Hook Form               |
| Validation              | Zod                           |
| Form schema integration | Hook Form resolvers           |
| Internationalization    | i18next and React integration |
| Utility styling         | Tailwind CSS                  |
| Custom styling          | CSS                           |
| Unit testing            | Vitest                        |
| Component testing       | React Testing Library         |
| End-to-end testing      | Playwright                    |
| PWA support             | Vite-compatible PWA tooling   |
| Linting                 | ESLint                        |
| Formatting              | Prettier                      |

Exact package versions should be pinned through the selected package manager and lockfile.

---

# Core Runtime Dependencies

The likely runtime dependencies include:

```text
react
react-dom
react-router-dom
@tanstack/react-query
react-hook-form
@hookform/resolvers
zod
i18next
react-i18next
```

Additional dependencies should be introduced only when a concrete foundation requirement exists.

---

# API Client Decision

TEED may use either:

* A controlled wrapper over the native Fetch API
* Axios with centralized configuration

The architecture requires one shared API client regardless of the underlying library.

The chosen client must support:

* Base URL configuration
* Request headers
* Authentication integration
* Request cancellation
* Timeouts
* Standard response parsing
* Error normalization
* Credential refresh coordination
* Upload support
* Future mobile compatibility

The project should not mix multiple general-purpose HTTP clients.

A decision should be recorded in an ADR before module implementation expands.

Recommended ADR:

```text
docs/adr/adr-frontend-api-client.md
```

---

# Development Dependencies

The likely development dependencies include:

```text
typescript
vite
@vitejs/plugin-react
eslint
prettier
vitest
jsdom
@testing-library/react
@testing-library/jest-dom
@testing-library/user-event
playwright
tailwindcss
postcss
autoprefixer
vite-plugin-pwa
```

Additional lint plugins may include:

```text
typescript-eslint
eslint-plugin-react-hooks
eslint-plugin-react-refresh
eslint-plugin-import
eslint-plugin-jsx-a11y
```

The final lint stack should avoid redundant or conflicting rule packages.

---

# Dependency Installation Groups

Dependencies should be installed by responsibility.

## Application dependencies

```bash
npm install \
  react-router-dom \
  @tanstack/react-query \
  react-hook-form \
  @hookform/resolvers \
  zod \
  i18next \
  react-i18next
```

## Testing dependencies

```bash
npm install --save-dev \
  vitest \
  jsdom \
  @testing-library/react \
  @testing-library/jest-dom \
  @testing-library/user-event \
  @playwright/test
```

## Code-quality dependencies

```bash
npm install --save-dev \
  eslint \
  prettier \
  typescript-eslint \
  eslint-plugin-react-hooks \
  eslint-plugin-react-refresh \
  eslint-plugin-import \
  eslint-plugin-jsx-a11y
```

## Styling dependencies

```bash
npm install --save-dev \
  tailwindcss \
  postcss \
  autoprefixer
```

## PWA dependencies

```bash
npm install --save-dev vite-plugin-pwa
```

Commands are illustrative. Installation should use the package manager selected by the project.

---

# Dependency Approval Rules

A dependency should be added only when:

* Its responsibility is clear
* An existing dependency does not already solve the problem
* It is actively maintained
* It supports TypeScript
* Its security history is acceptable
* Its bundle impact is understood
* It works with Vite
* It does not block PWA behavior
* It does not create future mobile-wrapper incompatibility
* Its license is acceptable

Major dependencies should be documented in an ADR.

---

# Initial Frontend Directory Structure

The initial source structure should be:

```text
frontend/
├── public/
│
├── src/
│   ├── app/
│   ├── pages/
│   ├── layouts/
│   ├── components/
│   ├── hooks/
│   ├── contexts/
│   ├── providers/
│   ├── api/
│   ├── schemas/
│   ├── types/
│   ├── constants/
│   ├── helpers/
│   ├── styles/
│   ├── locales/
│   ├── global/
│   ├── assets/
│   ├── tests/
│   ├── main.tsx
│   └── vite-env.d.ts
│
├── .env.example
├── .eslintignore
├── .gitignore
├── .prettierignore
├── eslint.config.js
├── index.html
├── package.json
├── postcss.config.js
├── prettier.config.js
├── tailwind.config.ts
├── tsconfig.json
├── tsconfig.app.json
├── tsconfig.node.json
├── vite.config.ts
└── vitest.config.ts
```

Not every folder needs to contain files immediately.

Folders should be populated as the foundation is implemented.

---

# Global Foundation Structure

The initial global structure should be:

```text
src/global/
├── api/
├── components/
├── contexts/
├── helpers/
├── hooks/
├── platform/
├── providers/
├── schemas/
├── styles/
├── types/
└── constants/
```

Recommended early files include:

```text
src/global/
├── api/
│   ├── client.ts
│   ├── errors.ts
│   ├── responses.ts
│   └── requests.ts
│
├── providers/
│   ├── app-provider.tsx
│   ├── query-provider.tsx
│   ├── translation-provider.tsx
│   ├── session-provider.tsx
│   ├── message-provider.tsx
│   └── theme-provider.tsx
│
├── styles/
│   ├── reset.css
│   ├── tokens.css
│   ├── globals.css
│   └── themes.css
│
├── platform/
│   ├── storage/
│   ├── network/
│   ├── notifications/
│   └── device/
│
└── types/
    ├── api.types.ts
    ├── environment.types.ts
    ├── message.types.ts
    └── session.types.ts
```

Only the files required for the first foundation milestone should be implemented immediately.

---

# Application Directory Structure

The application directory should contain frontend composition and configuration.

```text
src/app/
├── app.tsx
├── router.tsx
├── routes.ts
├── route-paths.ts
├── environment.ts
├── configuration.ts
└── feature-flags.ts
```

Initial responsibilities:

| File               | Responsibility                      |
| ------------------ | ----------------------------------- |
| `app.tsx`          | Root application component          |
| `router.tsx`       | Route-tree composition              |
| `routes.ts`        | Route definitions or route metadata |
| `route-paths.ts`   | Central route path constants        |
| `environment.ts`   | Validated environment configuration |
| `configuration.ts` | General application configuration   |
| `feature-flags.ts` | Typed feature-flag access           |

---

# TypeScript Configuration

TypeScript should use strict settings.

The configuration should enable checks that reduce unsafe behavior.

Recommended direction:

```json
{
  "compilerOptions": {
    "strict": true,
    "noUncheckedIndexedAccess": true,
    "noImplicitOverride": true,
    "noFallthroughCasesInSwitch": true,
    "noUnusedLocals": true,
    "noUnusedParameters": true,
    "exactOptionalPropertyTypes": true
  }
}
```

The exact configuration should remain compatible with Vite and the selected testing environment.

---

# TypeScript Rules

Application code should avoid:

* `any`
* Unsafe type assertions
* Non-null assertions without justification
* Broad object types
* Duplicate API interfaces
* Untyped environment access
* Untyped error handling

Preferred alternatives include:

* `unknown`
* Type guards
* Zod parsing
* Generic types
* Explicit discriminated unions
* Typed service interfaces

Example:

```typescript
function isApiError(value: unknown): value is ApiError {
  return (
    typeof value === "object" &&
    value !== null &&
    "code" in value
  );
}
```

---

# Path Aliases

The frontend should use path aliases to reduce fragile relative imports.

Recommended alias:

```text
@/
```

mapped to:

```text
src/
```

Example imports:

```typescript
import { Button } from "@/global/components/button";
import { useMessage } from "@/global/hooks/use-message";
import { LoginPage } from "@/pages/identity/login.page";
```

Path aliases must be configured consistently in:

* TypeScript
* Vite
* Vitest
* ESLint
* IDE settings
* Playwright where applicable

---

# Vite Alias Configuration

Conceptual Vite configuration:

```typescript
import { fileURLToPath, URL } from "node:url";
import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";

export default defineConfig({
  plugins: [react()],
  resolve: {
    alias: {
      "@": fileURLToPath(
        new URL("./src", import.meta.url),
      ),
    },
  },
});
```

The production configuration may later include:

* PWA plugin
* Bundle analysis
* Source-map policy
* Build metadata
* Environment validation
* Manual chunk rules

---

# Environment Files

The frontend may use environment files such as:

```text
.env
.env.local
.env.development
.env.test
.env.production
.env.example
```

Only `.env.example` should contain documented placeholder values.

Secrets must never be placed in frontend environment files.

---

# Environment Variable Naming

Vite-exposed environment variables should use the required public prefix.

Example:

```text
VITE_APP_ENVIRONMENT
VITE_APP_VERSION
VITE_API_BASE_URL
VITE_DEFAULT_LANGUAGE
VITE_FALLBACK_LANGUAGE
VITE_PWA_ENABLED
```

Names should be:

* Explicit
* Stable
* Documented
* Typed
* Validated

---

# Example Environment File

```text
VITE_APP_ENVIRONMENT=development
VITE_APP_VERSION=0.1.0
VITE_API_BASE_URL=http://localhost:8000/api/v1
VITE_DEFAULT_LANGUAGE=en
VITE_FALLBACK_LANGUAGE=en
VITE_PWA_ENABLED=true
```

This file should not include:

* Database passwords
* Django secrets
* Private signing keys
* Private payment keys
* Refresh secrets
* Administrative credentials

---

# Environment Validation

Environment configuration should be validated before use.

Recommended location:

```text
src/app/environment.ts
```

Conceptual schema:

```typescript
import { z } from "zod";

const environmentSchema = z.object({
  VITE_APP_ENVIRONMENT: z.enum([
    "development",
    "test",
    "staging",
    "production",
  ]),
  VITE_APP_VERSION: z.string().min(1),
  VITE_API_BASE_URL: z.string().url(),
  VITE_DEFAULT_LANGUAGE: z.string().min(2),
  VITE_FALLBACK_LANGUAGE: z.string().min(2),
  VITE_PWA_ENABLED: z.enum(["true", "false"]),
});

const parsedEnvironment = environmentSchema.parse(
  import.meta.env,
);

export const environment = {
  appEnvironment:
    parsedEnvironment.VITE_APP_ENVIRONMENT,
  appVersion:
    parsedEnvironment.VITE_APP_VERSION,
  apiBaseUrl:
    parsedEnvironment.VITE_API_BASE_URL,
  defaultLanguage:
    parsedEnvironment.VITE_DEFAULT_LANGUAGE,
  fallbackLanguage:
    parsedEnvironment.VITE_FALLBACK_LANGUAGE,
  pwaEnabled:
    parsedEnvironment.VITE_PWA_ENABLED === "true",
} as const;
```

All application code should consume the validated object rather than accessing `import.meta.env` directly.

---

# Application Configuration

Application configuration that is not deployment-specific should be centralized.

Recommended location:

```text
src/app/configuration.ts
```

Possible values include:

```typescript
export const applicationConfiguration = {
  applicationName: "TEED",
  queryDefaults: {
    retryCount: 1,
  },
  pagination: {
    defaultPageSize: 20,
  },
  messages: {
    defaultDurationMs: 5000,
  },
} as const;
```

Environment configuration and application configuration should remain separate.

---

# Package Scripts

The package scripts should support development, validation, testing, and production builds.

Recommended scripts:

```json
{
  "scripts": {
    "dev": "vite",
    "build": "tsc -b && vite build",
    "preview": "vite preview",
    "typecheck": "tsc -b --pretty",
    "lint": "eslint .",
    "lint:fix": "eslint . --fix",
    "format": "prettier . --write",
    "format:check": "prettier . --check",
    "test": "vitest",
    "test:run": "vitest run",
    "test:coverage": "vitest run --coverage",
    "test:e2e": "playwright test",
    "test:e2e:ui": "playwright test --ui",
    "validate": "npm run typecheck && npm run lint && npm run format:check && npm run test:run",
    "clean": "node ./scripts/clean.mjs"
  }
}
```

Scripts should be adjusted for the selected package manager.

---

# Validation Command

The project should provide one standard validation command.

Example:

```bash
npm run validate
```

It should run:

```text
Type checking
Linting
Formatting verification
Unit tests
```

CI may additionally run:

```text
Production build
End-to-end tests
PWA checks
Bundle checks
```

---

# ESLint Configuration

ESLint should enforce:

* TypeScript correctness
* React hook rules
* Accessibility practices
* Import consistency
* No unused code
* No accidental globals
* No unsafe debugging
* No prohibited import directions where practical

Recommended rule categories:

```text
JavaScript correctness
TypeScript correctness
React hooks
React refresh
Accessibility
Imports
Project-specific boundaries
```

---

# Import Boundary Enforcement

Where practical, lint rules should help enforce architecture.

Examples:

* `global/` must not import module code
* `api/` should not import UI components
* `schemas/` should not import pages
* Module code should not import private files from unrelated modules
* Pages should not use low-level HTTP clients directly

Some boundaries may require a dedicated ESLint plugin or custom configuration.

Manual review remains necessary even when lint rules exist.

---

# Prettier Configuration

Prettier should provide consistent formatting.

Possible configuration:

```javascript
export default {
  semi: true,
  singleQuote: false,
  trailingComma: "all",
  printWidth: 80,
  tabWidth: 2,
  useTabs: false,
  bracketSpacing: true,
};
```

The final style should be selected once and applied consistently.

Formatting rules should not be debated repeatedly inside pull requests.

---

# Editor Configuration

The repository should include editor-neutral defaults where useful.

Recommended file:

```text
.editorconfig
```

Example:

```text
root = true

[*]
charset = utf-8
end_of_line = lf
insert_final_newline = true
indent_style = space
indent_size = 2
trim_trailing_whitespace = true

[*.md]
trim_trailing_whitespace = false
```

Editor-specific settings may be documented separately.

---

# Git Ignore Rules

The frontend `.gitignore` should exclude:

```text
node_modules/
dist/
coverage/
playwright-report/
test-results/
.env
.env.local
.env.*.local
*.log
.DS_Store
```

Files such as the following should remain committed:

```text
.env.example
package-lock.json
configuration files
test configuration
public manifest assets
```

---

# Tailwind Foundation

Tailwind should be configured as part of the base project.

The exact configuration depends on the selected Tailwind version.

The foundation should include:

```text
tailwind.config.ts
postcss.config.js
src/global/styles/tokens.css
src/global/styles/globals.css
```

Tailwind content scanning should include all frontend source files.

Conceptual configuration:

```typescript
export default {
  content: [
    "./index.html",
    "./src/**/*.{ts,tsx}",
  ],
  theme: {
    extend: {},
  },
  plugins: [],
};
```

Design values should later be connected to TEED design tokens.

---

# Global CSS Loading Order

Global styles should load in a predictable order.

Recommended order:

```text
1. Reset
2. Design tokens
3. Theme definitions
4. Tailwind layers
5. Global application styles
```

Example in `main.tsx`:

```typescript
import "@/global/styles/reset.css";
import "@/global/styles/tokens.css";
import "@/global/styles/themes.css";
import "@/global/styles/globals.css";
```

The exact Tailwind import syntax should follow the selected version.

---

# Initial Design Tokens

The first foundation should define semantic token names even before final branding is complete.

Example:

```css
:root {
  --color-background: #ffffff;
  --color-surface: #ffffff;
  --color-text-primary: #111827;
  --color-text-secondary: #4b5563;
  --color-border: #d1d5db;
  --color-primary: #2563eb;
  --color-success: #15803d;
  --color-warning: #a16207;
  --color-error: #b91c1c;

  --font-family-primary:
    Inter,
    system-ui,
    sans-serif;

  --radius-sm: 0.25rem;
  --radius-md: 0.5rem;
  --radius-lg: 0.75rem;
}
```

These values are placeholders until the TEED design system is finalized.

Token names should be semantic rather than tied to one visual shade.

---

# Internationalization Foundation

Internationalization should be initialized before user-facing pages are built.

Initial structure:

```text
src/locales/
├── en/
│   ├── global.json
│   └── errors.json
│
└── sw/
    ├── global.json
    └── errors.json
```

Module translation files should be added when the module begins implementation.

For example:

```text
src/locales/en/identity.json
src/locales/sw/identity.json
```

---

# Internationalization Initialization

Recommended files:

```text
src/global/i18n/
├── i18n.ts
├── resources.ts
├── language.ts
└── formatters.ts
```

If internationalization is kept under providers instead, ownership must remain clear.

Conceptual initialization:

```typescript
import i18n from "i18next";
import { initReactI18next } from "react-i18next";

await i18n
  .use(initReactI18next)
  .init({
    lng: environment.defaultLanguage,
    fallbackLng: environment.fallbackLanguage,
    interpolation: {
      escapeValue: false,
    },
  });
```

The final implementation should support:

* Saved preference
* User account preference
* Browser preference
* Default language
* Fallback language

---

# Initial Translation Resources

Example English resource:

```json
{
  "applicationName": "TEED",
  "loading": "Loading",
  "retry": "Try again",
  "cancel": "Cancel",
  "save": "Save",
  "close": "Close"
}
```

Example Swahili resource:

```json
{
  "applicationName": "TEED",
  "loading": "Inapakia",
  "retry": "Jaribu tena",
  "cancel": "Ghairi",
  "save": "Hifadhi",
  "close": "Funga"
}
```

Translations should be reviewed for context and consistency before production release.

---

# Query Foundation

TanStack Query should be configured through one provider.

Recommended location:

```text
src/global/providers/query-provider.tsx
```

Conceptual configuration:

```typescript
const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      retry: 1,
      refetchOnWindowFocus: false,
    },
    mutations: {
      retry: false,
    },
  },
});
```

Actual defaults should be finalized based on:

* Backend behavior
* Network conditions
* Mobile usage
* PWA expectations
* Mutation sensitivity

---

# Query Provider Rules

The query client should be created once.

It should not be recreated during rendering.

The provider should support development tooling only in non-production environments.

Query defaults should avoid:

* Infinite retries
* Repeating failed authentication requests
* Retrying unsafe mutations
* Excessive mobile data usage
* Unexpected stale data persistence

---

# Router Foundation

The router should be introduced before business pages.

Initial routes may include:

```text
/
 /offline
 /error
 /*
```

Authentication and module routes should be added later.

Recommended initial pages:

```text
src/pages/global/
├── home.page.tsx
├── offline.page.tsx
├── error.page.tsx
└── not-found.page.tsx
```

These pages establish routing, layout, translation, and error-handling patterns.

---

# Route Constants

Recommended initial file:

```text
src/app/route-paths.ts
```

Example:

```typescript
export const ROUTE_PATHS = {
  home: "/",
  offline: "/offline",
  error: "/error",
  notFound: "*",
} as const;
```

Route strings should not be duplicated across the application.

---

# Provider Composition Foundation

The initial provider composition should be centralized.

Recommended file:

```text
src/global/providers/app-provider.tsx
```

Conceptual composition:

```tsx
export function AppProvider({
  children,
}: PropsWithChildren) {
  return (
    <TranslationProvider>
      <QueryProvider>
        <ThemeProvider>
          <MessageProvider>
            <SessionProvider>
              {children}
            </SessionProvider>
          </MessageProvider>
        </ThemeProvider>
      </QueryProvider>
    </TranslationProvider>
  );
}
```

The exact ordering should reflect dependency requirements.

For example, a message provider that uses translations must be inside the translation provider.

---

# Initial Provider Implementation Strategy

Providers should be introduced incrementally.

Recommended sequence:

```text
1. Translation Provider
2. Query Provider
3. Theme Provider
4. Message Provider
5. Network Provider
6. Session Provider
7. PWA Provider
```

A provider should not be created before its responsibility is understood.

---

# Testing Foundation

Vitest should be configured early.

Recommended configuration should support:

* TypeScript
* React
* JSX
* Path aliases
* JSDOM
* Testing Library
* Global test setup

Recommended structure:

```text
src/tests/
├── setup.ts
├── render.tsx
├── mocks/
└── fixtures/
```

---

# Test Setup File

Conceptual setup:

```typescript
import "@testing-library/jest-dom";
```

Additional safe global setup may include:

* Browser API mocks
* Translation initialization
* Cleanup behavior
* Network mocks

Global mocks should not hide important behavior.

---

# Custom Test Render

A reusable render helper should provide required providers.

Example location:

```text
src/tests/render.tsx
```

Conceptual responsibilities:

```text
Translation provider
Query provider
Router provider
Theme provider
Message provider
```

Tests should not manually rebuild the provider tree repeatedly.

---

# Playwright Foundation

Playwright should be initialized before critical user flows are implemented.

Recommended structure:

```text
frontend/
├── e2e/
│   ├── global/
│   ├── identity/
│   └── fixtures/
└── playwright.config.ts
```

Initial smoke tests should verify:

* Application loads
* Home route works
* Unknown routes show not-found page
* Language switching works
* Basic responsive layout works
* PWA manifest is accessible in production builds

---

# PWA Foundation

PWA tooling should be introduced after the base Vite application works correctly.

The initial PWA foundation should include:

* Web app manifest
* Application name
* Short name
* Theme color
* Background color
* Start URL
* Display mode
* Icons
* Service worker registration
* Update strategy
* Offline fallback planning

---

# Initial Manifest Direction

Example conceptual manifest:

```json
{
  "name": "TEED",
  "short_name": "TEED",
  "start_url": "/",
  "display": "standalone",
  "background_color": "#ffffff",
  "theme_color": "#2563eb",
  "lang": "en"
}
```

Final values should follow the design system and product decisions.

The manifest should be generated or managed through the selected PWA tooling.

---

# PWA Enablement by Environment

PWA behavior may be controlled by environment.

Example:

```text
Development → Optional or limited
Testing → Controlled
Staging → Enabled
Production → Enabled
```

Service worker caching during ordinary development can cause confusion and should be handled carefully.

---

# Platform Abstraction Foundation

The project should introduce a platform directory before browser-specific behavior spreads throughout the codebase.

Recommended structure:

```text
src/global/platform/
├── storage/
│   ├── storage.interface.ts
│   ├── web-storage.service.ts
│   └── index.ts
│
├── network/
│   ├── network.interface.ts
│   ├── web-network.service.ts
│   └── index.ts
│
├── notifications/
├── files/
└── device/
```

Only storage and network may need initial implementation.

Other abstractions should be introduced when required.

---

# Storage Interface

Conceptual interface:

```typescript
export interface StorageService {
  get<TValue>(key: string): TValue | null;
  set<TValue>(key: string, value: TValue): void;
  remove(key: string): void;
  clear(): void;
}
```

The production implementation should handle:

* Serialization
* Parsing failures
* Storage unavailability
* Quota failures
* Key versioning
* Sensitive-data restrictions

The interface may later be implemented through secure mobile storage.

---

# Storage Foundation Rules

The initial storage abstraction may store:

* Language
* Theme
* Safe UI preferences

It should not initially store:

* Access credentials
* Refresh credentials
* Sensitive user records
* Financial information
* Full API caches

Credential storage must wait for the approved frontend security design.

---

# Network Service Foundation

A network abstraction may expose:

```typescript
export interface NetworkStatus {
  isOnline: boolean;
}
```

The browser implementation may use:

```text
navigator.onLine
online event
offline event
```

Browser online status should be treated as an indicator, not proof that the backend is reachable.

---

# Base Global Components

The first global components should be minimal.

Recommended starting set:

```text
src/global/components/
├── button.tsx
├── input.tsx
├── loader.tsx
├── alert.tsx
├── page-container.tsx
└── error-boundary.tsx
```

Additional components should be added when real module requirements appear.

The project should avoid building a large unused component library before business requirements exist.

---

# Base Naming Conventions

File names should use kebab case.

Examples:

```text
login.page.tsx
login-form.tsx
use-login.ts
login.schema.ts
login.types.ts
login.api.ts
identity-layout.css
```

React component names should use PascalCase.

Examples:

```typescript
LoginPage
LoginForm
IdentityLayout
```

Hooks should use camelCase and begin with `use`.

Examples:

```typescript
useLogin
useMessage
useSession
```

Constants should use either:

```typescript
ROUTE_PATHS
STORAGE_KEYS
```

or typed constant objects with clear names.

One style should be used consistently.

---

# Index File Policy

Barrel files such as `index.ts` should be used selectively.

They are appropriate when:

* A folder exposes a clear public interface
* Imports become simpler
* Circular dependencies are not introduced
* Ownership remains visible

They should not be added automatically to every folder.

Deep internal files should not be re-exported unnecessarily.

---

# Initial Build Milestone

The first frontend foundation milestone is complete when:

```text
Vite application runs
TypeScript strict mode passes
Path aliases work
Environment validation works
Router renders
Translation works
Query provider works
Global styles load
Tailwind utilities work
Vitest runs
Playwright smoke test runs
Production build succeeds
PWA manifest is available
```

No business module is required for this milestone.

---

# Recommended Foundation Implementation Order

The frontend should be implemented in this order:

```text
1. Initialize Vite React TypeScript project
2. Select and document package manager
3. Configure runtime version
4. Remove sample Vite content
5. Create responsibility-first source folders
6. Configure TypeScript strict settings
7. Configure path aliases
8. Configure environment validation
9. Configure ESLint
10. Configure Prettier
11. Configure Tailwind and global CSS
12. Configure router
13. Configure i18next
14. Configure TanStack Query
15. Create application provider
16. Create base global pages
17. Configure Vitest
18. Configure Testing Library
19. Configure Playwright
20. Introduce storage abstraction
21. Introduce network abstraction
22. Configure PWA tooling
23. Add production build validation
24. Add CI validation scripts
```

---

# Foundation Rules Established in Part 1

The following rules are mandatory:

1. The frontend lives under the top-level `frontend/` directory.
2. One package manager and one lockfile are used.
3. React, TypeScript, and Vite form the base frontend stack.
4. TypeScript strict mode is enabled.
5. Path aliases are configured consistently.
6. Environment values are validated centrally.
7. Frontend environment values must not contain secrets.
8. Application code does not access `import.meta.env` directly outside the environment layer.
9. The source tree follows responsibility-first organization.
10. Backend-aligned module names are used.
11. Shared infrastructure lives under `src/global/`.
12. ESLint and Prettier are configured before module development.
13. One validation command is provided.
14. Tailwind and custom CSS share one token system.
15. Internationalization is initialized before user-facing modules.
16. TanStack Query is configured through one provider.
17. Application providers are composed centrally.
18. Browser storage is accessed through an abstraction.
19. Sensitive data is not persisted without an approved policy.
20. Testing tools are configured before critical modules.
21. PWA tooling is introduced as part of the foundation.
22. Dependencies are introduced by clear responsibility.
23. Duplicate tools for the same responsibility are avoided.
24. The production build must pass before the foundation is considered complete.

---

# Part 1 Summary

The TEED frontend foundation begins with a Vite, React, and TypeScript project organized according to the approved responsibility-first architecture.

The base project should establish:

* Strict TypeScript
* Consistent package management
* Centralized environment validation
* Path aliases
* ESLint
* Prettier
* Tailwind CSS
* Global design tokens
* React Router
* TanStack Query
* i18next
* Testing infrastructure
* PWA tooling
* Platform abstractions
* Centralized providers

This foundation should be completed before the frontend begins implementing substantial business-module behavior.

The next section should define:

* The global API client
* Standard request and response types
* Error normalization
* Field-error mapping
* Query-key factories
* Session-provider contracts
* Authentication integration boundaries
* Global message provider contracts
* Theme-provider contracts
* Network and storage service implementations