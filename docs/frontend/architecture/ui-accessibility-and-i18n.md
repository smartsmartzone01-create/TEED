# Frontend UI, Accessibility, and Internationalization

## UI layers

```text
Design tokens
    ↓
Global primitives
    ↓
Global controls and layouts
    ↓
Module components
    ↓
Routes
```

Higher layers may compose lower layers. A primitive must not import a marketing
or identity component.

## Design tokens

Global tokens live in `src/styles/global/tokens.css` and represent:

- brand colors;
- semantic background and foreground colors;
- borders and muted states;
- spacing and radius decisions where centralized;
- light and dark theme values.

Components should consume semantic tokens such as `background`, `foreground`,
`border`, and `primary`. Brand navy and orange are appropriate for deliberate
brand expression, not arbitrary replacement of semantic colors.

## Styling ownership

- `base.css`: document-level defaults and resets;
- `tokens.css`: variables and themes;
- `layouts.css`: reusable global layout classes;
- `animations.css`: shared keyframes and motion rules;
- Tailwind utilities: routine component composition;
- CSS modules: complex, component-owned visual behavior.

Avoid inline style objects for static design and avoid repeating long,
identical class combinations when a primitive or helper should own them.

## Components

Global primitives:

- expose typed props;
- support class extension;
- own keyboard, focus, disabled, and variant behavior;
- forward semantic behavior through `asChild` only when safe;
- remain independent of one business module.

Module components own product meaning and translated copy. Promote a module
component to global only when reuse and semantics are genuinely shared.

## Responsive behavior

Design mobile-first:

- start with the smallest supported viewport;
- add enhancements at wider breakpoints;
- avoid fixed widths that cause translation overflow;
- preserve touch targets and readable line lengths;
- test navigation, dialogs, forms, and dense content at phone, tablet, and
  desktop widths;
- account for safe areas when installed/PWA layouts are implemented.

## Accessibility requirements

Every interactive element must provide:

- correct semantic role;
- accessible name;
- keyboard access;
- visible focus state;
- disabled/loading semantics;
- appropriate target size;
- usable contrast.

Dialogs and menus must manage focus, escape behavior, outside interaction, and
screen-reader naming. Decorative images use empty alternative text or
`aria-hidden`. Informative images need localized meaningful text.

Use `aria-live` deliberately for asynchronous validation, submission outcomes,
session expiration, and background updates.

## Motion

- Respect `prefers-reduced-motion`.
- Motion must communicate state or provide restrained atmosphere.
- Never require animation to understand content.
- Avoid long or continuous motion that harms readability or battery life.

## Internationalization

Current locales:

```text
en — English
sw — Swahili
```

`next-intl` owns route locale resolution, navigation helpers, client context,
and server translation loading.

Message files are divided by responsibility:

```text
i18n/messages/
├── global/
│   ├── en.json
│   └── sw.json
└── marketing/
    ├── en.json
    └── sw.json
```

Future modules follow the same pattern, for example `identity/en.json`.

## Translation rules

- No user-facing product sentence should be hard-coded in a reusable
  component.
- Translation keys describe meaning, not English word order.
- Both locale files change in the same commit.
- Interpolation is preferred over string concatenation.
- Dates, numbers, currencies, and relative time use locale-aware formatters.
- Error codes map to localized messages.
- Layout must handle longer Swahili or English text without clipping.

Brand names and platform names may remain untranslated where they are proper
names.

## Language switching

The language switcher preserves the current locale-aware pathname and replaces
only the locale. It uses a transition and disables repeat interaction while
navigation is pending. The locale cookie remembers the preference.

## Theme switching

Theme supports system, light, and dark choices through `next-themes`.
Hydration-sensitive rendering waits for client mount. Theme controls expose
translated accessible labels.

## Verification checklist

- keyboard-only operation;
- visible focus;
- screen-reader labels;
- light/dark contrast;
- reduced motion;
- English and Swahili;
- narrow and wide viewports;
- 200% zoom;
- no clipped translated text;
- lint, typecheck, and production build.
