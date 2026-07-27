# TEED Frontend Foundation

## Part 3 (continued) — Design Tokens, Accessibility, Responsive UI, and Shared Testing Utilities

---

# Design Token Architecture

Design tokens should define the shared visual language.

Recommended files:

```text
src/global/styles/
├── reset.css
├── tokens.css
├── themes.css
├── typography.css
├── utilities.css
└── globals.css
```

Tokens should use semantic names.

Avoid tokens tied only to one specific color value.

Preferred:

```text
--color-surface
--color-text-primary
--color-action-primary
--color-danger
```

Avoid:

```text
--blue-500-for-buttons
--gray-text
```

Raw scales may exist internally, but components should normally use semantic tokens.

---

# Token Categories

The initial token system should define:

```text
Colors
Typography
Spacing
Sizing
Borders
Radius
Shadows
Motion
Layering
Breakpoints
```

---

# Color Tokens

Recommended semantic color tokens:

```css
:root {
  --color-background: ...;
  --color-surface: ...;
  --color-surface-raised: ...;
  --color-surface-muted: ...;

  --color-text-primary: ...;
  --color-text-secondary: ...;
  --color-text-disabled: ...;
  --color-text-inverse: ...;

  --color-border-default: ...;
  --color-border-strong: ...;
  --color-border-focus: ...;

  --color-action-primary: ...;
  --color-action-primary-hover: ...;
  --color-action-primary-active: ...;
  --color-action-primary-text: ...;

  --color-success: ...;
  --color-warning: ...;
  --color-danger: ...;
  --color-information: ...;

  --color-focus-ring: ...;
  --color-overlay: ...;
}
```

Values should be approved by the design process.

---

# Typography Tokens

Typography tokens should define:

* Primary font family
* Monospace font family
* Font sizes
* Line heights
* Font weights
* Letter spacing

Example:

```css
:root {
  --font-family-sans:
    Inter,
    system-ui,
    -apple-system,
    BlinkMacSystemFont,
    "Segoe UI",
    sans-serif;

  --font-family-mono:
    "SFMono-Regular",
    Consolas,
    monospace;

  --font-size-xs: 0.75rem;
  --font-size-sm: 0.875rem;
  --font-size-md: 1rem;
  --font-size-lg: 1.125rem;
  --font-size-xl: 1.25rem;
  --font-size-2xl: 1.5rem;
  --font-size-3xl: 1.875rem;

  --line-height-tight: 1.25;
  --line-height-normal: 1.5;
  --line-height-relaxed: 1.75;

  --font-weight-regular: 400;
  --font-weight-medium: 500;
  --font-weight-semibold: 600;
  --font-weight-bold: 700;
}
```

The exact scale may change during design-system implementation.

---

# Spacing Tokens

Spacing should use a consistent scale.

Example:

```css
:root {
  --space-0: 0;
  --space-1: 0.25rem;
  --space-2: 0.5rem;
  --space-3: 0.75rem;
  --space-4: 1rem;
  --space-5: 1.25rem;
  --space-6: 1.5rem;
  --space-8: 2rem;
  --space-10: 2.5rem;
  --space-12: 3rem;
}
```

Layout primitives should consume these values.

Arbitrary spacing values should be exceptional.

---

# Sizing Tokens

Sizing tokens may define:

* Control heights
* Icon sizes
* Maximum page widths
* Sidebar widths
* Header heights
* Modal widths

Example:

```css
:root {
  --control-height-sm: 2rem;
  --control-height-md: 2.5rem;
  --control-height-lg: 3rem;

  --page-width-narrow: 32rem;
  --page-width-medium: 48rem;
  --page-width-wide: 80rem;

  --sidebar-width: 17rem;
  --header-height: 4rem;
}
```

---

# Radius Tokens

Example:

```css
:root {
  --radius-none: 0;
  --radius-sm: 0.25rem;
  --radius-md: 0.5rem;
  --radius-lg: 0.75rem;
  --radius-full: 9999px;
}
```

Component radius should come from these tokens.

---

# Shadow Tokens

Example:

```css
:root {
  --shadow-sm:
    0 1px 2px rgb(0 0 0 / 0.05);

  --shadow-md:
    0 4px 12px rgb(0 0 0 / 0.1);

  --shadow-lg:
    0 12px 24px rgb(0 0 0 / 0.14);
}
```

Shadows should remain subtle and theme-compatible.

---

# Motion Tokens

Example:

```css
:root {
  --duration-fast: 120ms;
  --duration-normal: 200ms;
  --duration-slow: 320ms;

  --easing-standard:
    cubic-bezier(0.2, 0, 0, 1);

  --easing-emphasized:
    cubic-bezier(0.2, 0, 0, 1.2);
}
```

Motion should communicate state and hierarchy rather than decoration.

---

# Layering Tokens

A controlled layering scale should avoid arbitrary `z-index` values.

Example:

```css
:root {
  --layer-base: 0;
  --layer-sticky: 100;
  --layer-dropdown: 200;
  --layer-overlay: 300;
  --layer-modal: 400;
  --layer-message: 500;
}
```

Modules should not use values such as:

```css
z-index: 999999;
```

without architectural review.

---

# Theme Implementation

Theme values should override semantic tokens.

Example:

```css
:root,
[data-theme="light"] {
  --color-background: #f8fafc;
  --color-surface: #ffffff;
  --color-text-primary: #0f172a;
  --color-text-secondary: #475569;
  --color-border-default: #cbd5e1;
}

[data-theme="dark"] {
  --color-background: #0f172a;
  --color-surface: #111827;
  --color-text-primary: #f8fafc;
  --color-text-secondary: #cbd5e1;
  --color-border-default: #334155;
}
```

These values are illustrative.

Final colors must pass contrast testing.

---

# Tailwind Integration

Tailwind should consume the design-token system rather than create a competing visual system.

Possible approaches include:

* Mapping Tailwind semantic colors to CSS variables
* Using CSS variables directly in utility classes
* Extending the theme with semantic token names

Example conceptual configuration:

```typescript
theme: {
  extend: {
    colors: {
      background:
        "var(--color-background)",
      surface:
        "var(--color-surface)",
      foreground:
        "var(--color-text-primary)",
      primary:
        "var(--color-action-primary)",
      danger:
        "var(--color-danger)",
    },
  },
}
```

The exact configuration depends on the selected Tailwind version.

---

# Global CSS

Global CSS should define only application-wide behavior.

Examples include:

* Body background
* Base typography
* Link defaults
* Focus-visible defaults
* Selection styling
* Root sizing
* Reduced-motion rules
* Utility classes
* Safe-area helpers

Global CSS should not contain module-specific page styles.

---

# CSS Reset

The reset should normalize browser defaults without removing useful native behavior.

It should consider:

* Box sizing
* Margin reset
* Image sizing
* Form font inheritance
* Button font inheritance
* Reduced motion
* Text rendering
* Root height
* Body minimum height

The reset should not remove focus outlines without providing a replacement.

---

# Focus-Visible Standard

All interactive components should show a clear focus-visible state.

Example:

```css
:focus-visible {
  outline:
    3px solid
    var(--color-focus-ring);

  outline-offset: 2px;
}
```

Components may use more tailored rings, but the result must remain clearly visible.

Mouse interaction should not remove keyboard focus behavior.

---

# Reduced Motion

The application should respect user preferences.

Example:

```css
@media (
  prefers-reduced-motion: reduce
) {
  *,
  *::before,
  *::after {
    scroll-behavior: auto !important;
    animation-duration: 0.01ms !important;
    animation-iteration-count: 1 !important;
    transition-duration: 0.01ms !important;
  }
}
```

Critical state changes must remain understandable without animation.

---

# Accessibility Contract

Accessibility requirements apply to all global and module components.

The foundation should establish a minimum contract for:

```text
Semantics
Keyboard use
Focus
Labels
Errors
Contrast
Motion
Announcements
Touch targets
Responsive behavior
```

Accessibility is not a separate final review step.

It is part of component completion.

---

# Semantic Structure

Pages should use one primary `main` region.

Layouts should provide:

* Header
* Navigation
* Main content
* Optional complementary regions
* Footer where appropriate

Heading levels should remain logical.

A page should not begin with an `h3` solely for visual reasons.

Visual style should be separated from semantic level.

---

# Skip Navigation

Authenticated and complex layouts should provide a skip link.

Example:

```text
Skip to main content
```

The link should become visible on focus.

It should target the primary main-content region.

---

# Keyboard Contract

All essential interactions should support:

* Tab navigation
* Shift and Tab
* Enter
* Space where appropriate
* Escape for dismissible overlays
* Arrow keys for composite widgets
* Home and End where expected

Custom keyboard behavior should follow recognized ARIA interaction patterns.

---

# Focus Management Contract

Components that open or close layered interfaces should manage focus.

Examples:

```text
Open modal
    → move focus into modal

Close modal
    → return focus to trigger

Route navigation
    → move focus to page heading or main region

Validation failure
    → focus first invalid field or error summary
```

Focus should not be moved unexpectedly during ordinary typing or background refresh.

---

# Accessible Names

Every interactive control must have an accessible name.

An accessible name may come from:

* Visible text
* Associated label
* `aria-label`
* `aria-labelledby`

Tooltips should not be the only source of a control name.

---

# Accessible Descriptions

Additional context may use:

```text
aria-describedby
```

Examples include:

* Field instructions
* Error messages
* Confirmation consequences
* Status details

Descriptions should not become excessively verbose.

---

# Error Summary

Long or complex forms should consider a form-level error summary.

The summary may:

* Announce the number of errors
* List affected fields
* Link to invalid controls
* Receive focus after failed submission

Simple forms may rely on field-level errors and a form-level alert.

---

# Status Announcements

Dynamic updates should be announced when important.

Examples:

* Item saved
* Network lost
* Network restored
* Search results updated
* Upload completed
* Session expired

Announcements should be concise.

Frequent background updates should not create excessive screen-reader noise.

---

# Color Contrast

All text and interface elements should meet the project’s selected accessibility target.

Contrast testing should include:

* Body text
* Secondary text
* Disabled states
* Focus rings
* Error messages
* Buttons
* Links
* Icons
* Borders for controls
* Dark theme

Disabled content may have reduced contrast but should remain understandable.

---

# Color Independence

Meaning should not depend only on color.

For example:

```text
Error
    → color + icon + text

Success
    → color + icon + text

Selected row
    → color + indicator + semantic state
```

Charts should also use labels, patterns, or other differentiators where needed.

---

# Touch Target Standard

Essential interactive controls should provide adequate touch targets.

A practical minimum target should be defined by the design system.

Targets should remain usable for:

* Mobile browsers
* Installed PWA
* Future mobile wrapper
* Users with reduced dexterity

Small visual icons may use larger invisible hit areas.

---

# Responsive Foundation

The frontend should use mobile-first responsive behavior.

Base styles should support narrow screens.

Enhancements should be applied progressively at larger breakpoints.

The design should not assume desktop width.

---

# Breakpoint Strategy

The project should define one breakpoint system.

Example conceptual breakpoints:

```text
small    → 40rem
medium   → 48rem
large    → 64rem
x-large  → 80rem
```

The exact values should align with Tailwind configuration and design requirements.

Modules should not invent unrelated breakpoints.

---

# Content-Based Responsiveness

Breakpoints should be chosen based on when content needs to change, not only on device names.

Examples:

* Actions no longer fit on one line
* Sidebar can remain visible
* Table columns become unreadable
* Form fields can display in multiple columns
* Navigation needs a drawer

Device categories may guide testing, but layout decisions should respond to content.

---

# Mobile Page Layout

Mobile pages should use:

* Appropriate horizontal padding
* Full-width controls where useful
* Stacked actions
* Compact but readable headers
* Touch-friendly navigation
* Safe-area spacing
* Minimal horizontal scrolling

Desktop layouts should not simply be scaled down.

---

# Responsive Form Layout

Forms should normally use one column on small screens.

Larger screens may use two columns when:

* Fields are related
* Labels remain readable
* Validation remains clear
* Keyboard order remains logical

Important fields should not be placed side by side only to reduce page height.

---

# Responsive Action Groups

Form and page actions should adapt.

Example:

```text
Desktop
    Cancel | Save

Mobile
    Save
    Cancel
```

Primary actions should remain easy to reach.

Action order should remain consistent and culturally appropriate.

---

# Responsive Tables

The table strategy should be selected per data requirement.

Supported patterns may include:

* Horizontal scrolling
* Priority columns
* Responsive cards
* Expandable row details
* Dedicated mobile detail route

The global table component should not hide data automatically without module configuration.

---

# Horizontal Scrolling

Where horizontal scrolling is used:

* The container should indicate scrollability
* Important identifiers should remain visible where practical
* Actions should remain reachable
* Keyboard scrolling should work
* The layout should not force the entire page to scroll horizontally

---

# Responsive Navigation

The application shell should define:

```text
Large screen
    Persistent sidebar
    Full header

Medium screen
    Collapsible sidebar
    Reduced header actions

Small screen
    Drawer or bottom navigation
    Compact header
```

Navigation labels should remain translated and readable.

Icon-only navigation should not be introduced unless accessible names and discoverability are preserved.

---

# Bottom Navigation

A future bottom-navigation pattern may be appropriate for a mobile wrapper or installed PWA.

It should be limited to a small number of primary destinations.

It should account for:

```css
env(safe-area-inset-bottom)
```

It should not cover page content or action buttons.

---

# Responsive Modals

On large screens, modals may use centered constrained widths.

On small screens, they may become:

* Near-full width
* Full-screen
* Bottom sheets where appropriate

Accessibility behavior must remain consistent across responsive presentations.

---

# Safe-Area Utilities

The global styles may define helpers such as:

```css
.safe-area-top {
  padding-top:
    env(safe-area-inset-top);
}

.safe-area-bottom {
  padding-bottom:
    env(safe-area-inset-bottom);
}
```

Safe areas are especially important for:

* Fixed headers
* Fixed footers
* Bottom navigation
* Full-screen modals
* Installed PWA mode
* Mobile wrappers

---

# Viewport Height

Mobile browser viewport height can change as browser controls appear and disappear.

Layouts should prefer modern units where supported.

Examples:

```text
dvh
svh
lvh
```

Fallbacks should be considered.

Using only `100vh` may create overflow or hidden controls on mobile browsers.

---

# Text Expansion

Components should support longer translated content.

They should avoid:

* Fixed text widths
* Fixed button widths without need
* Truncating essential labels
* Assuming one-line headings
* Tight navigation layouts

Text wrapping should be accepted unless truncation has a documented purpose.

---

# Text Truncation

Truncation may be used for:

* Long resource names in dense tables
* Breadcrumb labels
* Compact cards

When truncating important text:

* Full text should remain available
* Tooltip or detail view may be provided
* Screen readers should receive the full value
* Essential distinctions should not be hidden

---

# Bidirectional Readiness

Although the initial languages are left-to-right, global components should avoid unnecessary directional assumptions.

Preferred CSS properties:

```text
margin-inline-start
margin-inline-end
padding-inline-start
padding-inline-end
inset-inline-start
border-inline-start
```

Directional icons such as arrows should account for document direction.

---

# Message and Feedback Responsiveness

Messages, alerts, and banners should:

* Wrap long translated text
* Avoid overflowing small screens
* Keep close actions reachable
* Respect safe-area insets
* Avoid covering primary controls
* Support keyboard dismissal where appropriate

---

# Component Styling Ownership

Global component styles should live under:

```text
src/global/styles/
```

or beside components only if the project formally adopts CSS Modules for global components.

Module-specific styles should remain under:

```text
src/styles/<module>/
```

A module should not override global component internals using fragile selectors.

Preferred customization methods include:

* Supported props
* Semantic variants
* CSS variables
* Controlled `className`
* Composition

---

# CSS Modules Decision

If CSS Modules are adopted, the naming pattern may be:

```text
button.module.css
modal.module.css
page-header.module.css
```

The project should choose deliberately between:

* Global semantic classes
* CSS Modules
* Tailwind utilities
* A controlled combination

The same component should not use several unrelated styling strategies without reason.

---

# Component Variants

Variants should represent meaningful design decisions.

Good variants:

```text
primary
secondary
danger
compact
outlined
```

Avoid variants based on one arbitrary color:

```text
blue
green
red2
```

Semantic variants support theming and redesign.

---

# Component Composition

Global components should support composition where possible.

Example:

```tsx
<Card>
  <CardHeader />
  <CardContent />
  <CardFooter />
</Card>
```

Compound-component APIs should only be used when they improve clarity.

Simple components should remain simple.

---

# Controlled and Uncontrolled Components

Form controls should follow React conventions.

Where practical, components may support:

* Controlled usage
* Uncontrolled usage
* Ref forwarding

Complex stateful components should clearly document their ownership model.

A component should not switch unpredictably between controlled and uncontrolled modes.

---

# Ref Forwarding

Refs should be forwarded for controls requiring:

* Focus management
* Form-library integration
* Measurement
* Accessibility behavior

Examples include:

* Input
* Textarea
* Select
* Button
* Modal focus target

Ref forwarding should not expose unnecessary internal DOM structure.

---

# Component Documentation

Each global component should have minimal documentation covering:

* Purpose
* Props
* Variants
* Accessibility behavior
* Responsive behavior
* Common examples
* Restrictions

Documentation may initially live in:

```text
docs/frontend/components/
```

or alongside a component-preview environment if one is adopted later.

---

# Component Preview Environment

A component-preview tool may be introduced when the global component library grows.

Possible uses include:

* Visual development
* Theme comparison
* Responsive testing
* Accessibility checks
* Translation testing
* Component documentation

A tool such as Storybook should not be introduced automatically.

Its bundle, maintenance, and workflow costs should be evaluated first.

---

# Shared Testing Utilities

The frontend should provide reusable test utilities for global and module components.

Recommended structure:

```text
src/tests/
├── setup.ts
├── render.tsx
├── accessibility.ts
├── user.ts
├── providers/
├── fixtures/
└── mocks/
```

---

# Test Render Utility

A shared `render` utility should compose the providers most components require.

Example:

```typescript
export interface RenderOptions {
  route?: string;
  language?: string;
  theme?: ThemePreference;
  session?: Partial<SessionContextValue>;
}
```

Conceptual usage:

```typescript
renderWithApp(
  <LoginForm />,
  {
    route: "/login",
    language: "sw",
  },
);
```

The helper should remain configurable without hiding important test setup.

---

# Test Query Client

Tests should create a fresh query client per test.

Recommended defaults:

```text
Retries disabled
Cache isolated
Logging controlled
Garbage collection short
```

Tests should not share query cache state.

---

# Test Translation Setup

Tests should use real translation resources where user-visible text matters.

Mock translation functions may be used for isolated logic, but component tests should preferably verify actual translated output.

Both supported languages should be exercised in critical components.

---

# Test User Utility

A shared user-event setup may simplify tests.

Example:

```typescript
export function setupUser() {
  return userEvent.setup();
}
```

Tests should use realistic user interaction rather than calling event handlers directly.

---

# Accessibility Test Helper

A shared helper may run automated accessibility checks if an approved accessibility-testing library is added.

The project should still perform manual checks for:

* Keyboard navigation
* Focus order
* Screen-reader behavior
* Responsive layout
* Color contrast

Automated testing does not prove full accessibility.

---

# Global Component Test Requirements

Each global component should test its critical behavior.

## Button

* Renders text
* Activates by keyboard
* Disables correctly
* Shows loading state
* Preserves accessible name
* Applies variants

## Input

* Associates label
* Supports invalid state
* Connects error description
* Supports disabled and read-only states

## Alert

* Renders variant
* Uses appropriate role
* Supports actions
* Handles long translated text

## Modal

* Moves focus inside
* Traps focus
* Closes on Escape where allowed
* Returns focus
* Exposes accessible title

## Message region

* Announces messages
* Dismisses messages
* Auto-dismisses
* Supports persistent messages
* Handles multiple messages

## Theme provider

* Applies light theme
* Applies dark theme
* Resolves system preference
* Persists preference

---

# Responsive Component Tests

Critical global components should be checked at representative sizes.

Examples:

```text
320px
375px
768px
1024px
1440px
```

Exact values may be adjusted.

Responsive tests should verify:

* No unintended horizontal overflow
* Actions remain reachable
* Text wraps correctly
* Modals remain usable
* Navigation transforms correctly
* Safe-area behavior is supported

---

# Visual Regression Testing

Visual regression testing may be introduced later for stable global components and critical pages.

It may help detect:

* Unintended spacing changes
* Theme regressions
* Responsive breakage
* Translation overflow
* Overlay positioning issues

Visual snapshots should not replace behavioral tests.

---

# Theme Testing

Global components should be tested in:

```text
Light theme
Dark theme
System-resolved theme
```

Theme testing should verify more than background color.

It should include:

* Text contrast
* Borders
* Focus rings
* Disabled states
* Alerts
* Overlays
* Skeletons
* Message presentation

---

# Internationalization Testing

Global components should support:

* English
* Swahili
* Missing-key fallback
* Long text
* Interpolation
* Pluralization where applicable

Generic components should not depend on one language’s word order.

---

# Foundation Story Page

Before business-module implementation, the project may create a development-only foundation page.

Recommended route:

```text
/dev/foundation
```

It may display:

* Buttons
* Form controls
* Alerts
* Loaders
* Skeletons
* Cards
* Typography
* Theme switching
* Language switching
* Responsive layout primitives

This page must not be available in production unless intentionally protected.

It provides a practical way to verify the UI foundation before full component-preview tooling is introduced.

---

# Initial UI Foundation Milestone

The first UI milestone should include:

```text
Design tokens
Light theme
Dark theme
Global typography
Button
Input
Textarea
Select
Checkbox
Form field
Alert
Loader
Skeleton
Page container
Stack
Inline
Card
Empty state
Error state
Message region
Offline banner
Modal
Error boundary
```

Additional components should be added based on module requirements.

---

# Foundation Implementation Order

Recommended implementation order:

```text
1. Define design tokens
2. Implement light theme
3. Implement dark theme
4. Implement global typography
5. Implement focus-visible styles
6. Implement reduced-motion styles
7. Implement class-name helper
8. Implement Button
9. Implement Input and Textarea
10. Implement Label and Form Field
11. Implement Select and Checkbox
12. Implement Alert
13. Implement Loader and Skeleton
14. Implement Page Container
15. Implement Stack and Inline
16. Implement Card
17. Implement Empty State
18. Implement Error State
19. Implement Message Region
20. Implement Offline Banner
21. Implement Modal
22. Implement Error Boundary
23. Add test render utility
24. Add global component tests
25. Test themes
26. Test English and Swahili text
27. Test mobile widths
28. Add development foundation page
```

---

# Foundation Acceptance Criteria

Part 3 is complete when:

* Semantic design tokens exist
* Light and dark themes work
* Global typography is defined
* Focus-visible behavior is clear
* Reduced-motion preferences are respected
* Base global components use typed interfaces
* Form controls use native semantics
* Labels and errors are correctly associated
* Loading patterns are consistent
* Empty and error states are reusable
* Global messages are rendered accessibly
* Modal focus behavior works
* Global components support narrow screens
* Safe-area behavior is available
* Long translated text does not break components
* Shared test utilities exist
* Critical global components have automated tests
* Components are tested in both supported languages
* Components are tested in light and dark themes
* The development foundation page demonstrates the system

---

# Foundation Rules Established in Part 3

The following rules are mandatory:

1. Global components remain independent of business modules.
2. Global components use typed and focused public interfaces.
3. Native HTML controls are preferred where they satisfy requirements.
4. Buttons represent commands and links represent navigation.
5. Icon-only controls require accessible labels.
6. Form placeholders do not replace labels.
7. Field descriptions and errors are programmatically associated.
8. Invalid states do not depend only on color.
9. Loading indicators include accessible text.
10. Loading patterns match the scope of the operation.
11. Empty states explain the next available action.
12. Error states do not expose sensitive backend details.
13. Temporary global messages use one presentation layer.
14. Modal components manage focus and keyboard behavior.
15. Design tokens use semantic names.
16. Tailwind and custom CSS consume one token system.
17. Arbitrary visual values should be exceptional.
18. One controlled layering scale is used.
19. Light and dark themes override semantic tokens.
20. Focus-visible states must remain clearly visible.
21. Reduced-motion preferences must be respected.
22. Essential interactions must be keyboard-accessible.
23. Essential controls require accessible names.
24. Mobile-first behavior is the default.
25. Modules must use the shared breakpoint system.
26. Safe-area insets are supported for fixed mobile interfaces.
27. Components must tolerate translated text expansion.
28. Shared components must have behavioral tests.
29. Critical components must be checked in both supported languages.
30. Global components must be tested in light and dark themes.

---

# Part 3 Summary

The TEED frontend should build its visual foundation from a small, accessible, typed, and reusable set of global components.

Forms should use native semantic controls, shared labels, descriptions, and error relationships. Feedback patterns should distinguish between temporary messages, inline alerts, loading indicators, empty states, page errors, and offline state.

The design system should use semantic tokens for color, typography, spacing, sizing, radius, shadows, motion, and layering. Tailwind CSS and custom CSS should both consume this shared system.

The responsive foundation should be mobile-first, safe-area aware, resilient to translated text, compatible with installed PWA mode, and suitable for future mobile wrapping.

The next section should define:

* Route configuration
* Public and protected layouts
* Authentication guards
* Permission guards
* Session restoration interfaces
* Navigation configuration
* Breadcrumb architecture
* Page metadata
* Offline and application-error routes
* Route testing