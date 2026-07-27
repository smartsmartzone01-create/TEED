# TEED Frontend — Next Chat Handoff

## How to resume

Continue the TEED frontend implementation locally in VS Code, one verified brick at a time. The frontend repository is:

```text
C:\Users\smart\OneDrive\Desktop\TEED\frontend
```

The user performs the edits and terminal commands locally. Give complete replacement files when a change touches several connected areas; avoid small partial edits that can leave inconsistent props or imports.

The immediate next task is the bilingual marketing hero. Before changing it, request the current versions of:

```text
src/app/[locale]/page.tsx
src/components/marketing/marketing-stage.tsx
src/styles/marketing/marketing-stage.module.css
src/i18n/messages/marketing/en.json
src/i18n/messages/marketing/sw.json
```

Then extract a reusable `MarketingHero` component, keep `page.tsx` thin, and preserve the existing animated marketing-stage background.

## Product direction

TEED is primarily a marketing and social-growth SaaS for small businesses and entrepreneurs. It should help users improve advertising, social-media presence, audience growth, and broader business performance.

The product is:

- English and Swahili by default.
- Web-first, mobile-first, accessible, and PWA-ready.
- Prepared for future mobile wrapping or packaging.
- Backed by an independent, client-agnostic API that can serve web, PWA, and mobile clients.
- Security-conscious, with business rules, authorization, validation, tenant isolation, ownership, and session validity remaining backend-authoritative.

## Current technical stack

- Next.js 16.2.10, App Router, `src/` directory.
- React 19.2.4.
- TypeScript 5.9.3.
- pnpm 11.15.1.
- Tailwind CSS 4.3.3.
- ESLint 9 with `eslint-config-next`.
- `next-intl` 4.13.3.
- `next-themes`.
- Radix primitives:
  - Slot
  - Dialog
  - Tooltip
  - Dropdown Menu
- `class-variance-authority`, `clsx`, `tailwind-merge`.
- `lucide-react`.
- Local `geist` npm package for Geist Sans and Geist Mono. Do not switch back to `next/font/google`; local fonts removed the build-time dependency on Google Fonts.

## Verified setup

These commands have passed during the setup:

```powershell
pnpm install
pnpm typecheck
pnpm lint
pnpm build
pnpm dev
```

Relevant package scripts:

```json
{
  "dev": "next dev",
  "build": "next build",
  "start": "next start",
  "lint": "eslint . --max-warnings=0",
  "typecheck": "tsc --noEmit"
}
```

If generated Next.js route types become stale, stop the development server before deleting only generated artifacts:

```powershell
if (Test-Path -LiteralPath ".next") {
  Remove-Item -LiteralPath ".next" -Recurse -Force
}

if (Test-Path -LiteralPath "tsconfig.tsbuildinfo") {
  Remove-Item -LiteralPath "tsconfig.tsbuildinfo" -Force
}
```

Never edit `.next/types/validator.ts`.

## Source organization

The frontend uses a responsibility-first structure, not feature-local folders:

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

Responsibility folders are subdivided by backend-aligned module:

```text
components/
├── global/
├── marketing/
├── identity/
├── workspace/
└── billing/
```

Do not mix components, hooks, services, schemas, types, and styles inside a feature-local folder. Application-wide infrastructure belongs under `global/`.

The Next App Router under `src/app/` is the thin route layer. It replaces separate frontend `pages/` and `routes/` directories.

## Styling decisions

Use Tailwind for most:

- Layout and flex/grid composition.
- Typography.
- Responsive behavior.
- State variants.
- Simple component styling.

Use custom CSS only when it adds clear value:

- Reusable global spacing and layout rules.
- Design tokens.
- Complex animations.
- Marketing-stage cloud/blob visuals.
- CSS that Tailwind would make awkward or repetitive.

Custom CSS must remain minimal and reusable. Use CSS Modules for complex feature-specific visuals and keyframes.

Existing reusable layout concepts include:

- `.page-container`
- `.page-section`
- Central spacing tokens
- Central motion tokens

## Brand system

Light-mode core colors:

```text
Navy:             #000080
Navy hover:       #000066
Navy active:      #00004D
Orange:           #FF6A00
Orange hover:     #E57200
Accessible orange text on white: #C45100
Foreground:       #111827
Muted foreground: #4B5563
Background:       #FFFFFF
Soft background:  #F7F8FC
Border:           #D9DEE8
Navy soft:        #EEEEFF
Orange soft:      #FFF1E6
```

Brand presentation:

- `TE` uses navy.
- `ED` uses orange.
- Primary buttons use navy.
- Secondary buttons use orange with dark/navy text; white text on bright orange does not provide reliable contrast.
- Dark mode uses lighter derived brand tones because exact `#000080` becomes nearly invisible on dark surfaces.

Theme styling is token-driven. Components should use semantic tokens such as `background`, `foreground`, `border`, `primary`, and `muted-foreground`, not hardcoded theme colors.

## Internationalization

Routing:

- English is the default locale at `/`.
- Swahili is available at `/sw`.
- `localePrefix: "as-needed"`.
- Locale detection is enabled.
- Locale cookie: `TEED_LOCALE`, one-year lifetime.

Current structure:

```text
src/i18n/
├── routing.ts
├── navigation.ts
├── request.ts
└── messages/
    ├── global/
    │   ├── en.json
    │   └── sw.json
    └── marketing/
        ├── en.json
        └── sw.json
```

Do not create one giant English file and one giant Swahili file. Add module-specific message files as new modules are implemented.

Use locale-aware `Link`, `useRouter`, and `usePathname` exports from:

```text
@/i18n/navigation
```

Avoid importing `Link` directly from `next/link` in localized application UI.

## Theme implementation

- `next-themes` is mounted through `GlobalProviders`.
- Theme values: `system`, `light`, and `dark`.
- Default: `system`.
- Storage key: `teed-theme`.
- The `<html>` element keeps `suppressHydrationWarning`.
- Theme colors are controlled through semantic CSS variables in `tokens.css`.
- The theme control is hydration-safe and does not assume the stored theme on the server.

## Header checkpoint

The marketing header currently includes:

- TEED wordmark.
- Desktop navigation.
- Desktop language icon with tooltip and branded dropdown.
- Desktop appearance icon with tooltip and branded dropdown.
- Log in and Get started actions.
- Radix Dialog mobile drawer.
- Mobile language and appearance controls.
- English and Swahili labels.
- Light, dark, and system theme selection.

The user likes the branded dropdown design, colors, tooltips, and keyboard navigation.

The mobile dropdown issue was ultimately fixed by adjusting the dropdown content layer only for drawer instances:

- Shared language and theme switchers accept an optional content class.
- Mobile drawer instances pass a higher valid z-index class.
- Desktop instances remain unchanged.
- Tooltips are not required for the visible, labelled mobile drawer rows.

Do not replace this working fix with the abandoned `portalled` experiment or inline mobile preference buttons unless the user explicitly requests a redesign.

Future header work:

- Features and Solutions will eventually use accessible desktop mega menus.
- The mega-menu width should run approximately from the TEED wordmark’s left edge to the Get started button’s right edge.
- How it works and Pricing remain direct links.
- Mobile uses expandable navigation suited to the existing drawer.
- Keep the header visually clean.

## Marketing stage checkpoint

The header, hero, and upcoming social-platform section share one animated marketing background.

Existing stage concept:

- Four animated CSS cloud/blob layers.
- Navy and orange brand influence.
- Slow transform animations.
- Blur and saturation remain static.
- Reduced-motion behavior is supported.
- The user rated the current visual as a good temporary foundation and wants to improve its uniqueness later.

Future visual direction:

- A recognizable TEED growth system rather than generic decorative blobs.
- Social platforms such as Instagram, Facebook, YouTube, and similar services may feed visually into TEED.
- Do not use the word “hub.”
- Do not copy proprietary Codex landing-page code.

Freeze major background redesign until the hero and platform section are present; tune the composition with real content visible.

## Hero next steps

Recommended component:

```text
src/components/marketing/marketing-hero.tsx
```

The hero should:

- Use translations from the existing `Home` or a focused marketing hero namespace.
- Keep `src/app/[locale]/page.tsx` thin.
- Use the existing `Button` primitive and locale-aware links.
- Provide one clear primary action and one secondary action.
- Be responsive from narrow mobile through desktop.
- Preserve the shared animated stage.
- Use accessible heading hierarchy and focus states.
- Avoid overloading the first screen with too many claims or calls to action.

After the hero:

1. Build the animated social-platform/growth section sharing the same background.
2. Reassess cloud placement with the three real sections present.
3. Implement desktop mega menus and mobile navigation expansion.
4. Build authentication pages using the shared authentication archetype.

## Working style

- Proceed brick by brick.
- Explain architecture decisions in plain language.
- Make a decision, implement it, verify it, then document it.
- Prefer complete replacement files when multiple small edits could create inconsistent code.
- Run `typecheck`, `lint`, and `build` after structural changes.
- Do not claim local changes were implemented unless the user actually applied and verified them.
- Preserve working visuals unless the requested task requires changing them.
- Challenge unnecessary complexity and redundant UI, especially tooltips that repeat visible text.

