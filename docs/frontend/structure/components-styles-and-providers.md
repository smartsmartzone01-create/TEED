# Frontend Components, Styles, and Providers

## Current component map

```text
components/
├── global/
│   ├── controls/
│   │   ├── language-switcher.tsx
│   │   └── theme-switcher.tsx
│   └── primitives/
│       ├── button.tsx
│       ├── dropdown-menu.tsx
│       └── tooltip.tsx
├── dashboard/
├── identity/
├── marketing/
└── profile/
    ├── contact-information.tsx
    ├── personal-information.tsx
    ├── profile-edit-form.tsx
    ├── profile-navigation.tsx
    ├── profile-overview.tsx
    └── profile-page.tsx
```

## Global primitives

### Button

The button primitive owns size and visual variants through
`class-variance-authority`. `asChild` allows a locale-aware link to receive
button presentation without nesting interactive elements.

### Dropdown menu

The dropdown wrapper centralizes Radix behavior and TEED styling for labels,
radio groups, items, and content.

### Tooltip

The tooltip wrapper centralizes delay, portal, positioning, and visual style.
Compact dashboard destinations use tooltips to explain their purpose without
replacing visible navigation labels.

## Global controls

### Language switcher

- reads the current locale;
- replaces the locale while preserving the pathname;
- indicates pending navigation;
- uses translated labels;
- composes dropdown and tooltip primitives.

### Theme switcher

- supports system, light, and dark;
- avoids hydration mismatch through mounted-state detection;
- uses translated labels;
- delegates persistence to `next-themes`.

## Marketing components

### Brand mark

Renders the TEED wordmark as a locale-aware home link with brand colors.

### Header

Owns desktop navigation, mobile dialog navigation, language/theme controls,
login/register actions, and the feature mega-menu composition.

### Mega-menu

Owns pointer, keyboard escape, blur, outside-click, focus return, and expanded
state. It is marketing-specific until a genuinely shared navigation menu
emerges.

### Stage

Owns the shared animated marketing background and content stacking. Complex
blob visuals live in a CSS module.

### Hero, platform connections, overview

These are server components that obtain translated marketing content and
compose reusable primitives and imported assets.

## Provider map

```text
GlobalProviders
└── ThemeProvider
    └── TooltipProvider
        └── IdentitySessionProvider
```

`NextIntlClientProvider` is composed by the locale layout around page content.
Provider order must remain deterministic. `ProfileProvider` is intentionally
scoped to the protected dashboard layout. It loads the profile overview and
personal record, retries once through the session refresh flow, and keeps the
dashboard state and Identity session display synchronized after edits.

## Style map

```text
styles/
├── global/
│   ├── animations.css
│   ├── base.css
│   ├── layouts.css
│   └── tokens.css
└── marketing/
    ├── marketing-stage.module.css
    └── platform-connections.module.css
```

`app/globals.css` is the single global entry point and imports the global style
layers.

## Asset map

Marketing platform SVGs are imported from:

```text
assets/marketing/platforms/
```

Imports provide build-time ownership and image optimization. Add an SVG module
declaration so TypeScript's standalone check recognizes the asset type.

## Component creation rules

1. start in the owning module;
2. keep one clear responsibility;
3. use translations for visible copy;
4. compose existing primitives;
5. include responsive, keyboard, focus, loading, disabled, and error states;
6. use semantic tokens;
7. add a CSS module only for complex owned styling;
8. promote to global after verified cross-module reuse.

## Profile component behavior

Profile pages consume APIs owned by the Profiles and Identity backend
applications. The frontend provider does not redefine domain ownership.
Identity-managed contacts are read-only in profile screens and direct users to
Security & access for future protected replacement flows. Image uploads use
multipart form data; identity presentation fields and region share the same
audited update endpoint.
