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
└── marketing/
    ├── brand-mark.tsx
    ├── marketing-header.tsx
    ├── marketing-hero.tsx
    ├── marketing-mega-menu.tsx
    ├── marketing-stage.tsx
    ├── platform-connections.tsx
    └── teed-overview.tsx
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
The current malformed `z-100'` class is a known code issue to correct during
the code-cleanup phase.

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
```

`NextIntlClientProvider` is composed by the locale layout around page content.
Provider order must remain deterministic. Future session and query providers
should document why they need global scope.

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

## Future identity component shape

Expected responsibilities may include:

```text
components/identity/
├── login-form.tsx
├── registration-form.tsx
├── email-verification-form.tsx
└── onboarding-form.tsx
```

Forms will consume identity hooks, schemas, services, types, and styles from
their respective responsibility-first directories. Those files should be
introduced one workflow at a time.
