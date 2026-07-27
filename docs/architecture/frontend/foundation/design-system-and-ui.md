# `docs/frontend/foundation/design-system-and-ui-foundations.md`

# Design System and UI Foundations

## Purpose

This document defines the visual and structural foundations of the TEED frontend design system.

It establishes the shared rules, tokens, primitives, conventions, and ownership boundaries that make the interface consistent across modules while remaining flexible enough for future product growth.

The design system should support bilingual content, responsive layouts, accessibility, PWA usage, and future mobile packaging without requiring separate visual implementations for each platform.

---

# Objectives

The design system should:

* Establish one shared visual language.
* Centralize design tokens.
* Provide reusable UI primitives.
* Reduce one-off styling decisions.
* Improve accessibility and consistency.
* Support theming and responsive behavior.
* Remain easy to consume across frontend modules.
* Support future product and platform expansion.

---

# Scope

This document covers:

* Design-system architecture
* Design tokens
* Color system
* Typography
* Spacing
* Sizing
* Borders and radius
* Elevation
* Motion
* Iconography
* Theme behavior
* UI primitives
* Component states
* Density
* Responsive foundations
* Accessibility foundations
* Internationalization considerations
* Documentation and testing

Detailed component composition and styling implementation rules belong in `component-and-styling-architecture.md`.

---

# Core Principle

Visual decisions should be expressed through shared semantic foundations rather than repeated literal values.

```text
Design Tokens
      │
      ▼
UI Primitives
      │
      ▼
Reusable Components
      │
      ▼
Pages and Modules
```

Pages should consume the system rather than invent local visual languages.

---

# Design-System Layers

The design system consists of four primary layers:

1. Foundation tokens
2. Semantic tokens
3. UI primitives
4. Product components

Each layer should depend only on the layers below it.

---

# Foundation Tokens

Foundation tokens represent raw design values.

Examples:

```text
Color scales

Font families

Font sizes

Spacing scale

Radius scale

Shadow scale

Motion durations

Breakpoints
```

Foundation tokens should rarely be consumed directly by product pages.

---

# Semantic Tokens

Semantic tokens express visual intent.

Examples:

```text
text.primary

text.secondary

surface.default

surface.raised

border.muted

action.primary

status.success

status.warning

status.danger
```

Semantic tokens allow themes and visual updates without changing component code.

---

# Component Tokens

Reusable components may define narrowly scoped tokens.

Examples:

```text
button.primary.background

input.border.focus

dialog.surface

navigation.active.background
```

Component tokens should be introduced only when semantic tokens are insufficient.

They should not duplicate arbitrary implementation values.

---

# Token Naming

Token names should describe purpose rather than appearance.

Prefer:

```text
surface.raised

text.muted

border.focus

action.destructive
```

Avoid:

```text
gray300

blueButton

darkBorder

redText
```

Raw palette names may exist at the foundation level but should not drive product styling directly.

---

# Token Source of Truth

Design tokens should have one canonical source.

The source should generate or expose values for:

* CSS variables
* TypeScript types
* Component documentation
* Tests
* Future platform adapters where practical

Duplicated token definitions across stylesheets and JavaScript configuration should be avoided.

---

# Color Architecture

The color system should separate raw palette values from semantic usage.

```text
Raw Palette

↓

Semantic Color Tokens

↓

Component States
```

The same semantic token may resolve to different raw values in different themes.

---

# Color Categories

The semantic color system should include:

* Text
* Surfaces
* Borders
* Actions
* Focus
* Selection
* Status
* Data visualization
* Overlays
* Skeletons

Each category should define default, hover, active, disabled, and inverse behavior where relevant.

---

# Text Colors

Recommended semantic roles include:

```text
text.primary

text.secondary

text.muted

text.disabled

text.inverse

text.link

text.danger
```

Text contrast must remain compliant with the application's accessibility standard.

---

# Surface Colors

Recommended surface roles include:

```text
surface.page

surface.default

surface.subtle

surface.raised

surface.overlay

surface.inverse

surface.disabled
```

Components should not choose arbitrary background colors outside approved tokens.

---

# Border Colors

Recommended border roles include:

```text
border.default

border.muted

border.strong

border.focus

border.danger

border.disabled
```

Borders should communicate structure without becoming the sole indicator of status.

---

# Action Colors

Action tokens should describe interaction intent.

Examples:

```text
action.primary

action.secondary

action.neutral

action.destructive

action.disabled
```

Each action role should define:

* Default
* Hover
* Active
* Focus
* Disabled

---

# Status Colors

Status colors may include:

```text
status.info

status.success

status.warning

status.danger

status.neutral
```

Status must never be communicated through color alone.

Icons, labels, text, or patterns should provide additional meaning.

---

# Data Visualization Colors

Charts and reporting interfaces require a separate semantic color set.

The palette should support:

* Distinguishable series
* Light and dark themes
* Color-vision deficiencies
* Printed or exported output
* Positive and negative values
* Selected and muted states

Chart colors should not automatically reuse action colors.

---

# Theme Architecture

The design system should support at least:

```text
Light Theme

Dark Theme

System Theme
```

Additional branded or high-contrast themes may be introduced later.

Components should consume semantic tokens so theme switching does not require component-specific logic.

---

# Theme Resolution

The initial theme may be resolved through:

```text
Authenticated User Preference

↓

Persisted Local Preference

↓

System Preference

↓

Application Default
```

Theme initialization should occur early enough to minimize visible flashing.

---

# Dark Theme

Dark theme should be designed intentionally rather than produced by mechanically inverting light-theme colors.

Dark theme should account for:

* Surface hierarchy
* Reduced glare
* Accessible contrast
* Muted borders
* Status colors
* Images and illustrations
* Elevation representation

---

# Typography

Typography should provide a clear hierarchy and remain readable across supported languages and screen sizes.

The typography system should define:

* Font families
* Font weights
* Font sizes
* Line heights
* Letter spacing
* Paragraph spacing
* Text styles

---

# Font Selection

Fonts should support all required characters in both TEED languages.

Fallback stacks should be defined explicitly.

Font loading should avoid blocking application startup unnecessarily and should minimize layout shifts.

---

# Typography Scale

Recommended semantic text styles include:

```text
display

heading.large

heading.medium

heading.small

body.large

body.default

body.small

label

caption

code
```

Pages should use semantic styles instead of arbitrary font-size values.

---

# Heading Hierarchy

Heading levels should reflect document structure.

Visual appearance and semantic HTML level are related but not identical.

Components should allow the correct heading element while applying the intended visual style.

---

# Body Text

Default body text should remain readable at mobile widths and common desktop viewing distances.

Line length should be controlled in content-heavy layouts.

Dense operational interfaces may use smaller approved text styles but must remain accessible.

---

# Numeric Typography

Tables, reports, and financial interfaces may require numeric formatting conventions such as:

* Tabular numbers
* Consistent decimal alignment
* Emphasized totals
* Signed values
* Currency formatting

Numeric presentation should integrate with localization rather than manual string formatting.

---

# Spacing System

Spacing should use a consistent scale.

Example progression:

```text
0

xs

sm

md

lg

xl

2xl

3xl
```

The underlying values should follow a deliberate rhythm.

Arbitrary margins and padding should be avoided.

---

# Spacing Responsibilities

Spacing tokens should support:

* Component internals
* Inline gaps
* Stack gaps
* Grid gutters
* Page padding
* Section separation
* Overlay spacing

Semantic layout components should be preferred over repeated custom spacing declarations.

---

# Density

The system may support multiple density levels where operational workflows require them.

Possible modes:

```text
Comfortable

Compact
```

Density should change coordinated component dimensions rather than applying isolated smaller padding.

Touch accessibility must not be compromised.

---

# Sizing

Sizing tokens should define shared dimensions such as:

* Input heights
* Button heights
* Icon sizes
* Header height
* Sidebar width
* Avatar sizes
* Dialog widths
* Maximum content widths

Hard-coded dimensions should be limited to documented exceptions.

---

# Border Radius

Radius tokens should define a controlled scale.

Example:

```text
radius.none

radius.small

radius.medium

radius.large

radius.full
```

Different components may use different semantic radii, but the visual language should remain consistent.

---

# Border Width

Approved border widths should remain limited.

Typical roles include:

* Standard structural border
* Emphasized border
* Focus ring
* Divider

Components should not create visually inconsistent stroke systems.

---

# Elevation

Elevation communicates layering.

Possible levels include:

```text
base

raised

dropdown

sticky

modal

toast
```

Elevation may use:

* Shadows
* Surface changes
* Borders
* Backdrops

Dark theme may require different elevation treatment than light theme.

---

# Layering and Z-Index

Z-index values should be centralized into semantic layers.

Example:

```text
content

sticky

dropdown

popover

drawer

modal

toast

critical
```

Components should not use arbitrary large z-index numbers.

The stacking model should be documented and predictable.

---

# Motion

Motion should support understanding without delaying interaction.

Motion tokens should define:

* Duration
* Easing
* Delay
* Distance
* Opacity transitions

Common motion categories include:

```text
instant

fast

standard

slow
```

---

# Reduced Motion

The design system must respect reduced-motion preferences.

When reduced motion is enabled:

* Non-essential animation should be removed.
* Movement should become opacity or instant transitions where appropriate.
* Core functionality must remain understandable.
* Auto-playing decorative motion should be disabled.

---

# Iconography

The icon system should use one approved icon family or a controlled set of compatible families.

Icons should have standardized:

* Sizes
* Stroke weight
* Alignment
* Optical balance
* Accessible labeling behavior

Icons should not be imported from unrelated libraries without review.

---

# Icon Usage

Icons may support:

* Recognition
* Status
* Navigation
* Actions
* Emphasis

Icons should not replace text where the action would become ambiguous.

Icon-only controls require accessible labels and often tooltips.

---

# Illustrations and Brand Assets

Illustrations, logos, and other brand assets should be treated separately from functional icons.

They should define:

* Approved variants
* Minimum size
* Clear space
* Theme behavior
* Localization considerations
* Accessible alternative text

Decorative images should not receive redundant screen-reader descriptions.

---

# UI Primitives

Primitives are low-level reusable components built directly on design tokens.

Examples:

```text
Text

Heading

Stack

Inline

Grid

Surface

Divider

Icon

VisuallyHidden
```

Primitives should provide consistent behavior without embedding product-specific meaning.

---

# Layout Primitives

Recommended layout primitives include:

* Stack
* Inline
* Cluster
* Grid
* Container
* Center
* Sidebar layout
* Scroll area

These primitives reduce repeated page-level CSS patterns.

---

# Surface Primitive

A Surface component may standardize:

* Background
* Border
* Radius
* Padding
* Elevation
* Theme behavior

Cards, panels, menus, and dialogs may compose from the same underlying surface system.

---

# Text Primitive

A Text primitive may standardize:

* Semantic typography style
* Color
* Alignment
* Truncation
* Wrapping
* Element selection

It must not encourage incorrect semantic HTML.

---

# Control Foundations

Interactive components should share common foundations for:

* Focus
* Disabled state
* Loading state
* Error state
* Size
* Density
* Keyboard behavior
* Accessible naming

Buttons, inputs, selects, and other controls should not independently redefine these behaviors.

---

# Component States

Reusable interactive components should account for:

```text
Default

Hover

Active

Focus Visible

Disabled

Loading

Error

Selected

Read Only
```

Not every component uses every state, but applicable states should be intentionally designed.

---

# Focus System

Focus indicators should:

* Be clearly visible
* Work in light and dark themes
* Not rely solely on subtle color change
* Remain visible against adjacent surfaces
* Use `:focus-visible` where appropriate

Removing focus outlines without an approved replacement is prohibited.

---

# Disabled State

Disabled controls should:

* Communicate unavailability
* Use correct semantic attributes
* Avoid misleading hover behavior
* Remain readable where necessary
* Not receive focus when native semantics exclude them

Where users need to understand why an action is unavailable, a disabled control may require explanatory text.

---

# Loading State

Loading controls should:

* Prevent duplicate actions where appropriate
* Preserve layout dimensions
* Communicate progress accessibly
* Retain the original action context
* Avoid replacing labels with ambiguous indicators

---

# Selection State

Selected state should be visually and semantically distinct from hover and focus states.

Applicable components include:

* Tabs
* Navigation items
* Menu options
* Rows
* Cards
* Filters

Selection should not be communicated through color alone.

---

# Form Foundations

Form control foundations should define:

* Label placement
* Help text
* Required indicators
* Error messages
* Input sizing
* Focus behavior
* Read-only behavior
* Disabled behavior
* Group spacing

Detailed form workflows belong in `forms-validation-and-file-handling.md`.

---

# Feedback Components

The design system should provide consistent foundations for:

* Alerts
* Banners
* Toasts
* Inline messages
* Empty states
* Progress indicators
* Skeletons
* Error panels

Feedback type should correspond to scope and urgency.

---

# Navigation Foundations

Navigation components should share consistent:

* Active-state treatment
* Hover and focus behavior
* Icon alignment
* Spacing
* Responsive adaptation
* Badge treatment

Navigation architecture remains defined in `navigation-overview.md`.

---

# Table Foundations

Operational tables should define:

* Header style
* Row height
* Alignment
* Selection
* Hover
* Sorting indicators
* Empty state
* Loading state
* Responsive fallback
* Sticky behavior

Tables should remain semantically valid and keyboard-accessible where interactive.

---

# Overlay Foundations

Overlay components include:

```text
Tooltip

Popover

Dropdown

Drawer

Dialog

Modal
```

They should share infrastructure for:

* Portals
* Focus management
* Escape behavior
* Outside interaction
* Layering
* Backdrops
* Scroll locking

Behavioral details should be centralized rather than recreated per module.

---

# Responsive Foundations

The design system should use a mobile-first responsive strategy.

Breakpoints should represent layout needs rather than specific device models.

Components should prefer fluid behavior over unnecessary breakpoint-specific variants.

---

# Breakpoints

Breakpoints should be centralized.

Example semantic categories:

```text
small

medium

large

wide
```

Components should not define private breakpoint scales without strong justification.

---

# Container Widths

Content containers should define approved maximum widths for:

* Authentication pages
* Standard application pages
* Dense dashboards
* Long-form content
* Dialogs

Page layouts should select from shared container patterns.

---

# Touch Targets

Interactive controls should provide adequate touch targets even when visual content appears smaller.

Compact layouts should preserve accessible hit areas.

Adjacent controls should maintain sufficient separation to avoid accidental activation.

---

# Safe Areas

Installed PWA and future mobile wrapper layouts should account for platform safe areas.

Relevant areas include:

* Top status region
* Bottom navigation region
* Device cutouts
* Gesture areas

Safe-area handling should be centralized through layout tokens or utilities.

---

# Accessibility Foundations

The design system should make accessible implementation the easiest default.

Foundations should include:

* Semantic HTML
* Keyboard interaction
* Visible focus
* Contrast compliance
* Screen-reader labels
* Reduced motion
* Error announcements
* Touch target sizing

Accessibility must be built into primitives rather than added only at page level.

---

# Contrast

Text, icons, borders, controls, and focus indicators should meet the adopted contrast requirements.

Disabled content may follow different standards but must remain understandable.

Contrast should be tested across all approved themes.

---

# High Contrast

The system should avoid implementation choices that prevent future high-contrast support.

Examples to avoid:

* Meaning encoded only in background images
* Invisible native control replacement
* Hard-coded colors outside tokens
* Removed outlines without semantic alternatives

---

# Internationalization Foundations

UI foundations must support bilingual text without layout breakage.

Components should accommodate:

* Longer labels
* Different word lengths
* Different plural forms
* Localized numbers
* Localized dates
* Localized currencies
* Dynamic text direction readiness

Fixed widths based on one language should be avoided.

---

# Text Direction Readiness

Even if initial supported languages use the same direction, components should avoid assumptions that make future right-to-left support unnecessarily difficult.

Prefer logical properties such as:

```text
margin-inline

padding-inline

border-start-start-radius
```

Avoid hard-coding left and right when start and end are the real intent.

---

# Truncation

Text truncation should be used deliberately.

Critical labels, errors, and instructions should not be truncated without an accessible way to obtain the full text.

Responsive layouts should prefer wrapping before truncating meaningful content.

---

# Content Guidelines

The design system should support consistent content patterns for:

* Button labels
* Field labels
* Empty states
* Errors
* Confirmations
* Destructive actions
* Loading messages

Detailed product copy may live elsewhere, but component APIs should not force awkward wording.

---

# Destructive Actions

Destructive controls should use consistent:

* Visual treatment
* Labels
* Confirmation patterns
* Focus behavior
* Error recovery

Color alone should not define destructive meaning.

---

# Third-Party Components

Third-party UI libraries may be used only when they:

* Support accessibility requirements
* Can consume TEED tokens
* Allow bilingual content
* Support required responsive behavior
* Do not force incompatible architecture
* Can be upgraded or replaced safely

Third-party visual defaults should not create a competing design system.

---

# Customization Boundaries

Product components may extend system primitives through documented variants.

They should not:

* Override tokens arbitrarily
* Reach into private component styles
* Depend on generated class names
* Fork shared components for minor visual differences
* Introduce module-specific theme systems

New variants should represent reusable product needs.

---

# Design-System Ownership

The shared design system belongs under the global frontend area.

Recommended placement:

```text
src/
    components/
        global/
            primitives/
            controls/
            feedback/
            overlays/
            navigation/
            data-display/

    styles/
        global/
            tokens/
            themes/
            reset/
            utilities/
            foundations/

    types/
        global/
            design-system/
```

Module-specific product components remain under their backend-aligned module folders.

---

# Documentation

Each shared component should document:

* Purpose
* Supported variants
* States
* Accessibility behavior
* Responsive behavior
* Content guidance
* Examples
* Unsupported usage

Documentation should be optimized for both human developers and AI-assisted implementation.

---

# Canonical Examples

The design system should provide canonical implementation examples for common patterns such as:

* Page header
* Form section
* Confirmation dialog
* Empty state
* Error panel
* Responsive card grid
* Data table
* Settings row

Examples should demonstrate approved composition rather than introduce separate abstractions.

---

# Change Management

Changes to widely used tokens or primitives should be treated as architectural changes.

A change should assess:

* Visual impact
* Accessibility
* Theme impact
* Localization
* Responsive behavior
* Migration cost
* Breaking component behavior

Deprecated tokens and variants should have documented replacements.

---

# Versioning

The design system should support controlled evolution.

Possible change categories include:

```text
Patch

Minor

Breaking
```

The repository does not necessarily require an independently published package, but changes should still follow clear compatibility rules.

---

# Visual Regression Testing

Shared components and foundational patterns should support visual regression testing.

Coverage should include:

* Themes
* Viewport sizes
* Interactive states
* Long translated content
* Error states
* Loading states
* Disabled states

Visual testing complements but does not replace behavioral and accessibility testing.

---

# Testing Requirements

## Token Tests

Test:

* Required semantic tokens exist.
* Themes implement the same token contract.
* No unresolved token references remain.
* Generated types match token names.

## Component Tests

Test:

* Supported variants
* Interactive states
* Keyboard behavior
* Accessible names
* Focus behavior
* Long-content handling
* Theme consumption

## Accessibility Tests

Test:

* Contrast
* Semantic structure
* Screen-reader output
* Reduced motion
* Focus visibility
* Touch targets

## Visual Regression Tests

Test:

* Light theme
* Dark theme
* Mobile width
* Desktop width
* Long bilingual labels
* Loading, empty, error, and disabled states

## Integration Tests

Test:

* Theme switching
* Runtime token application
* Layout primitive composition
* Overlay stacking
* Global component interoperability

---

# Acceptance Criteria

The design-system foundation is complete when:

* One canonical token source defines shared visual values.
* Components consume semantic tokens rather than arbitrary literals.
* Light, dark, and system theme behavior is defined.
* Typography, spacing, sizing, radius, elevation, motion, and icon rules are documented.
* Core UI and layout primitives are available.
* Interactive states behave consistently across shared controls.
* Accessibility behavior is built into component foundations.
* Components tolerate bilingual content and responsive resizing.
* Overlay, focus, layering, and safe-area behavior are centralized.
* Shared UI documentation and canonical examples are available.
* Visual and accessibility tests cover core themes, states, and viewport sizes.

---

# Architecture Rules

1. All reusable visual decisions must originate from the shared design-token system.
2. Product components must consume semantic tokens rather than raw palette or spacing values wherever practical.
3. The design system must maintain one canonical token source for styles, types, documentation, and tests.
4. Light, dark, and system themes must implement the same semantic token contract.
5. Accessibility, focus, contrast, keyboard interaction, and reduced-motion behavior must be built into shared primitives.
6. Pages and modules must compose shared primitives and components rather than creating independent visual systems.
7. Responsive behavior must be mobile-first, fluid where practical, and based on centralized breakpoints and layout tokens.
8. UI components must tolerate bilingual content, localized formatting, text expansion, and future direction changes.
9. Z-index, overlays, motion, sizing, and density must use centralized semantic foundations rather than arbitrary values.
10. Third-party UI components must be adapted to TEED's tokens and must not introduce a competing design language.
11. Changes to shared tokens and primitives must include accessibility, theme, responsive, localization, and migration review.
12. The design system must remain typed, testable, PWA-compatible, future-mobile-ready, and optimized for both developer and AI-assisted consumption.
