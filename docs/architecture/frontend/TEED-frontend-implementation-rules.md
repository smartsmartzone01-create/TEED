# TEED Frontend Implementation Rules and Architecture

## 1. Purpose

This document is the durable implementation reference for the TEED frontend. It translates the broader architecture documentation into concrete rules for day-to-day coding.

It applies to the web frontend, PWA behavior, and frontend contracts intended to remain compatible with a future mobile wrapper or mobile client.

## 2. Core architectural position

TEED uses a hybrid-rendered Next.js frontend with an independent backend.

Next.js may perform:

- Static generation for marketing pages.
- Server rendering where it improves discovery, initial delivery, or request-aware presentation.
- Client rendering for interactive controls, cached server state, forms, dashboards, and offline-aware experiences.

Using SSR does not make Next.js the authoritative backend. The independent backend remains the source of truth for:

- Authentication and session validity.
- Authorization and permissions.
- Business validation.
- Ownership.
- Workspace and tenant isolation.
- Billing authority.
- Protected operations.
- Durable business data.

The same backend API should support the web application, installed PWA, and future mobile clients.

## 3. Local-first development

Development begins locally and should remain usable without paid hosting.

Required local checks:

```powershell
pnpm typecheck
pnpm lint
pnpm build
pnpm dev
```

Hosting decisions are deferred until the application has meaningful implementation. Vercel is a compatible deployment option, not an architectural dependency.

Avoid build-time dependencies on remote assets where practical. Geist Sans and Geist Mono are installed through the local `geist` npm package rather than fetched from Google Fonts during every build.

## 4. Responsibility-first source structure

Organize code first by technical responsibility:

```text
src/
├── app/
├── components/
├── hooks/
├── providers/
├── services/
├── schemas/
├── types/
├── styles/
├── config/
├── constants/
├── assets/
├── i18n/
├── utils/
└── lib/
```

Inside a responsibility folder, organize by backend-aligned module:

```text
components/
├── global/
├── marketing/
├── identity/
├── workspace/
├── billing/
└── ...
```

Apply the same module pattern to hooks, services, schemas, types, styles, and similar responsibilities.

Rules:

- Application-wide infrastructure goes under `global/`.
- Do not put a page, hook, service, schema, type, component, and stylesheet together in one feature-local folder.
- Do not create speculative empty folders.
- Add a module directory when real implementation requires it.

## 5. App Router responsibilities

`src/app/` is the route layer.

Route files should:

- Resolve route parameters.
- Validate locale or route-level inputs.
- Select the correct layout.
- Fetch or coordinate route-level server data where appropriate.
- Compose module components.
- Define localized metadata.

Route files should not:

- Contain large reusable UI implementations.
- Duplicate service logic.
- Define business authorization.
- Become universal configuration-driven page builders.

Keep pages thin. Extract meaningful sections such as `MarketingHero` into responsibility-appropriate component folders.

## 6. Component hierarchy

Use three broad component categories.

### Global primitives

Examples:

```text
components/global/primitives/button.tsx
components/global/primitives/tooltip.tsx
components/global/primitives/dropdown-menu.tsx
```

These are locally owned abstractions over accessible primitives. They centralize repeated behavior and visual rules.

### Global controls and infrastructure UI

Examples:

```text
components/global/controls/language-switcher.tsx
components/global/controls/theme-switcher.tsx
```

These use global primitives and application infrastructure.

### Module components

Examples:

```text
components/marketing/marketing-header.tsx
components/marketing/marketing-stage.tsx
components/marketing/marketing-hero.tsx
```

These compose global building blocks into module-specific experiences.

## 7. Reuse rules

Reuse behavior and stable visual foundations, not every piece of wording or structure.

Prefer:

- Shared buttons, menus, tooltips, cards, fields, containers, and motion primitives.
- Shared layout patterns for authentication, onboarding, dashboard, and workspace archetypes.
- Explicit module content passed into those foundations.

Avoid:

- A single mega-component configured by dozens of props.
- A universal card that becomes responsible for every module.
- Configuration objects that hide simple, readable JSX.
- Duplicating the same long Tailwind class groups across controls.

Extract reuse after a pattern is stable or when a second real consumer appears.

## 8. Tailwind and custom CSS

Tailwind is the default for:

- Flexbox and grid.
- Responsive layouts.
- Typography.
- Spacing within components.
- Borders, shadows, and ordinary states.
- Focus, hover, selected, and disabled styles.

Custom CSS is appropriate for:

- Global design tokens.
- Reusable page spacing.
- Complex coordinated animation.
- Feature-specific cloud/blob visuals.
- Keyframes and effects that would be unreadable as utilities.

Custom CSS rules:

- Keep it minimal.
- Prefer reusable variables and classes.
- Use CSS Modules for complex module-specific visuals.
- Do not create one-off global selectors for ordinary component layout.
- Respect `prefers-reduced-motion`.

## 9. Spacing

Page and section spacing should be consistent by default.

Use shared concepts such as:

```css
--page-inline-space
--section-block-space
--content-max-width
```

Existing global helpers include:

```text
.page-container
.page-section
```

Only deviate when a section’s visual composition genuinely requires special positioning. Avoid arbitrary spacing drift between pages.

## 10. Brand color rules

Core light palette:

```text
Navy              #000080
Navy hover        #000066
Navy active       #00004D
Orange            #FF6A00
Orange hover      #E57200
Accessible orange #C45100
```

Usage:

- TE in navy.
- ED in orange.
- Navy is the primary action color.
- Orange is the secondary action and accent color.
- Bright orange buttons should use sufficiently dark text rather than white when contrast requires it.
- Use semantic tokens in components.

Dark mode:

- Do not force exact navy onto near-black backgrounds.
- Use accessible derived tones through dark theme tokens.
- Keep brand relationships recognizable while prioritizing legibility.

## 11. Semantic theming

Components should consume semantic values:

```text
background
foreground
primary
primary-foreground
secondary
secondary-foreground
muted-foreground
soft-background
border
```

Theme-specific values belong in centralized CSS token overrides.

Do not scatter:

```tsx
className="bg-[#080b1a] text-[#f7f8ff]"
```

when semantic utilities already express the purpose.

Theme configuration:

- `next-themes`.
- `attribute="class"`.
- `defaultTheme="system"`.
- System preference enabled.
- Storage key `teed-theme`.
- Transition suppression during theme changes.
- `suppressHydrationWarning` on `<html>`.

## 12. Internationalization

English and Swahili are first-class requirements, not later translations.

Routing:

```text
/    English
/sw  Swahili
```

Use `next-intl` with modular messages:

```text
i18n/messages/
├── global/
│   ├── en.json
│   └── sw.json
├── marketing/
│   ├── en.json
│   └── sw.json
├── identity/
├── workspace/
└── ...
```

Rules:

- Never create one enormous `en.json` and `sw.json`.
- Keep namespaces aligned with responsibility and module ownership.
- Use locale-aware navigation from `@/i18n/navigation`.
- Preserve the current logical page when changing locale.
- Ensure Swahili text has enough layout room; do not design only around shorter English labels.
- Localize visible text, labels, accessibility text, metadata, validation messages, and notifications.

## 13. Accessibility

Accessibility is a default implementation constraint.

Required practices:

- Semantic landmarks and heading hierarchy.
- Keyboard-operable interactive controls.
- Visible focus indicators.
- Accessible names for icon-only controls.
- Sufficient color contrast.
- Reduced-motion support.
- Proper dialog titles and descriptions.
- Focus management through tested accessible primitives.
- Responsive targets appropriate for touch.

Tooltips:

- Use for icon-only or genuinely ambiguous controls.
- Do not add tooltips that merely repeat visible button text.
- A tooltip never replaces `aria-label`.
- Avoid relying on hover-only information on touch devices.

## 14. Accessible primitives and local ownership

Use accessible headless primitives for complex interaction behavior, currently Radix.

TEED owns the wrapper components and their styling. This follows the shadcn/ui ownership approach without handing visual control to an external component theme.

Current wrappers include:

- Button.
- Tooltip.
- Dropdown menu.

Rules:

- Keep primitive wrappers global.
- Preserve keyboard and focus behavior.
- Do not bypass primitives with ad hoc click handlers for complex menus or dialogs.
- When overlays are nested, test layering, focus, dismissal, and pointer behavior on desktop and mobile.

## 15. Overlay layers

Dropdowns, tooltips, drawers, dialogs, and future modals require a predictable layer strategy.

Current mobile drawer dropdown fix:

- The drawer-specific language and theme controls pass an optional content class to their shared switchers.
- That class raises dropdown content above the drawer.
- Desktop instances retain default shared styling.

Rules:

- Use valid Tailwind arbitrary z-index utilities when a custom value is required, for example `z-[100]`.
- Keep layer overrides scoped to the consumer that needs them.
- Do not make every dropdown globally extreme to fix one drawer.
- Later consolidate layer values into named design tokens when more overlay types exist.

## 16. Data flow

Expected request flow:

```text
User action
→ page or component
→ hook
→ service
→ shared API client
→ backend
→ schema validation and normalization
→ query cache or state
→ UI
```

Rules:

- Components and pages do not issue direct HTTP requests.
- Services own backend endpoint interaction.
- External responses are validated before trusted use.
- Hooks coordinate UI behavior and server-state tools.
- Backend DTOs are normalized before broad UI consumption.

## 17. State categories

Keep state types distinct:

- Server state: backend-owned resources and query cache.
- Client UI state: drawer state, selected tabs, temporary filters.
- Form state: values, touched state, validation, submission.
- Persistent client preference state: locale, theme, safe non-sensitive preferences.

Do not put all state into one global store.

Sensitive or authoritative data must not depend on client storage.

## 18. Security boundary

The browser is untrusted.

Frontend route guards and hidden controls improve usability but do not provide security.

The backend must enforce:

- Authentication.
- Authorization.
- Tenant membership.
- Object ownership.
- Business constraints.
- File access.
- Billing permissions.
- Session validity.

Do not expose secrets in public environment variables or frontend bundles.

## 19. Marketing UI archetype

The current marketing composition uses:

```text
MarketingStage
├── MarketingHeader
├── MarketingHero
└── future platform/growth section
```

The three sections share one animated brand background.

Rules:

- Preserve meaningful whitespace.
- Keep the first screen focused.
- Use one primary and one secondary call to action.
- Avoid generic decoration with no connection to the product.
- Introduce platform imagery and motion only when it clarifies TEED’s growth workflow.
- Tune the animated background after real content is present.

## 20. UI archetypes

The planned interface families are:

1. Marketing/home.
2. Authentication: Log in and Sign up share an archetype.
3. Onboarding: Registration and business selection share an archetype.
4. Dashboard.
5. Workspace/module views sharing a stable shell with module-specific card counts and wording.

Share foundations within each archetype without forcing every page into one universal layout.

## 21. PWA and future mobile compatibility

Design web features so they can later support:

- Installability.
- Offline-aware states.
- Service-worker-managed caching.
- Safe client storage abstraction.
- Touch-friendly responsive UI.
- Mobile safe areas where required.
- Platform-neutral backend contracts.

Do not put critical business capabilities exclusively into Next.js server-only endpoints if future mobile clients also need them. Shared business capabilities belong in the independent backend.

## 22. Quality gates

After structural changes:

```powershell
pnpm typecheck
pnpm lint
pnpm build
```

Also verify:

- English and Swahili.
- Light, dark, and system themes.
- Narrow mobile and wider desktop layouts.
- Keyboard navigation.
- Focus visibility.
- Refresh persistence.
- Reduced-motion behavior where motion changed.

Do not treat a visually successful browser refresh as sufficient verification.

## 23. Generated artifacts and cache recovery

`.next` and `tsconfig.tsbuildinfo` are generated.

Never edit generated validator files.

If Next.js produces stale route errors:

1. Stop `pnpm dev`.
2. Delete `.next`.
3. Delete `tsconfig.tsbuildinfo` if present.
4. Run build and checks again.

OneDrive can temporarily lock generated files. Stop running Node processes for this project and retry after the lock releases; do not delete source files to solve a cache problem.

## 24. Implementation workflow

Use this sequence:

1. Clarify the next visible or architectural outcome.
2. Make the smallest coherent decision.
3. Implement complete connected files.
4. Verify type checking, linting, build, and relevant interaction.
5. Keep working code stable.
6. Document the settled decision later in an overview.

The user prefers building momentum over spending days documenting decisions before implementation.

## 25. Current next task

Build the bilingual marketing hero.

Before editing, inspect:

```text
src/app/[locale]/page.tsx
src/components/marketing/marketing-stage.tsx
src/styles/marketing/marketing-stage.module.css
src/i18n/messages/marketing/en.json
src/i18n/messages/marketing/sw.json
```

Then:

- Create `components/marketing/marketing-hero.tsx`.
- Move hero presentation out of the route.
- Reuse the global Button and localized Link.
- Preserve the animated stage.
- Verify both locales and themes.
- Keep the hero content focused and responsive.

