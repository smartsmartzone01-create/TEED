# `docs/frontend/foundation/component-and-styling-architecture.md`

# Component and Styling Architecture

## Purpose

This document defines how TEED frontend components are organized, composed, styled, extended, tested, and consumed.

It establishes clear boundaries between global reusable components, backend-aligned module components, page composition, design-system primitives, styles, hooks, schemas, and types.

The architecture is intended to prevent inconsistent component APIs, oversized components, duplicated UI patterns, unscoped styling, and feature-local folder structures that mix unrelated technical responsibilities.

---

# Objectives

The component and styling architecture should:

* Enforce responsibility-first source organization.
* Distinguish global reusable UI from module-specific UI.
* Define consistent component responsibilities.
* Encourage composition over large configurable components.
* Centralize shared styling foundations.
* Prevent visual and behavioral duplication.
* Support responsive and bilingual interfaces.
* Preserve accessibility by default.
* Remain compatible with PWA and future mobile packaging.
* Provide predictable conventions for developers and AI-assisted implementation.

---

# Scope

This document covers:

* Component categories
* Component ownership
* Source organization
* Component composition
* Public component APIs
* Props and variants
* Controlled and uncontrolled behavior
* Styling ownership
* CSS architecture
* Responsive styles
* State-dependent styles
* Global and module styles
* Third-party component adaptation
* Testing and documentation

Design tokens and visual foundations are defined in `design-system-and-ui-foundations.md`.

Form workflow behavior is defined in `forms-validation-and-file-handling.md`.

---

# Core Principle

Components should be organized first by technical responsibility and then by backend-aligned module.

```text
src/
    components/
        global/
        identity/
        workspace/
        billing/

    hooks/
        global/
        identity/
        workspace/
        billing/

    styles/
        global/
        identity/
        workspace/
        billing/

    types/
        global/
        identity/
        workspace/
        billing/
```

Pages, hooks, components, schemas, types, and styles must not be grouped together inside feature-local folders.

---

# Architecture Layers

The TEED component architecture contains five primary layers:

1. Design-system primitives
2. Shared global components
3. Module components
4. Page composition
5. Application layouts

Each layer should have a distinct responsibility.

---

# Design-System Primitives

Primitives are the lowest reusable UI building blocks.

Examples include:

```text
Text

Heading

Stack

Inline

Grid

Surface

Button

Input

Icon

Divider

VisuallyHidden
```

Primitives should:

* Consume global design tokens.
* Contain no module-specific business rules.
* Provide accessible defaults.
* Expose a narrow and stable API.
* Support approved visual variants.

Primitives belong under:

```text
components/
    global/
        primitives/
```

---

# Shared Global Components

Global components are reusable across unrelated application modules.

Examples include:

```text
AppDialog

ConfirmationDialog

PageHeader

EmptyState

ErrorPanel

DataTable

Pagination

SearchInput

FileDropzone

NotificationToast
```

A component belongs under `global/` only when its behavior and meaning are genuinely reusable across the application.

Global placement must not be used merely because more than one component imports it inside the same module.

---

# Module Components

Module components represent UI concepts owned by a backend-aligned module.

Examples:

```text
components/
    workspace/
        WorkspaceCard
        WorkspaceMemberList
        WorkspaceSwitcher

    billing/
        InvoiceSummary
        PaymentMethodCard
        BillingStatusBadge
```

Module components may compose global components and primitives.

They should not become globally reusable until their API and meaning are independent of the original module.

---

# Page Components

Pages are route-level composition units.

A page should primarily:

* Read route and URL state.
* Call module hooks.
* Coordinate page-level interactions.
* Compose layouts and components.
* Handle page loading, empty, and error states.
* Initiate navigation.

A page should not normally:

* Define reusable visual primitives.
* Contain raw API requests.
* Own transport configuration.
* Duplicate shared form or error behavior.
* Contain large amounts of low-level styling.

---

# Layout Components

Layouts define persistent structural regions around routes.

Examples include:

```text
GuestLayout

AuthenticatedLayout

WorkspaceLayout

SettingsLayout
```

Layouts may own:

* Navigation placement
* Page containers
* Sidebars
* Headers
* Responsive shell behavior
* Route-level outlets

Layouts should not own module-specific data unless the layout represents that module's route boundary.

---

# Component Ownership

Every component must have one explicit owner.

Ownership is determined by the narrowest scope in which the component has stable meaning.

```text
Application-wide reuse
        ↓
components/global/

Module-specific meaning
        ↓
components/{module}/

Single-page-only composition
        ↓
pages/{module}/
```

A component should not be moved into `global/` only to shorten an import path.

---

# Component Promotion

A module component may be promoted to `global/` when:

* It is used by unrelated modules.
* Its API no longer depends on module-specific types.
* Its copy and behavior are generic.
* Its visual behavior follows shared design-system rules.
* Its ownership can be clearly assigned to global UI infrastructure.

Promotion should include API review and removal of hidden module assumptions.

---

# Component Demotion

A global component should be moved back into a module when:

* It has only one meaningful consumer.
* Its API contains module-specific concepts.
* Its variants exist only for one workflow.
* Its name is generic but its behavior is not.

Global components should remain broadly reusable rather than becoming a collection of disguised feature components.

---

# Source Structure

Recommended component structure:

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
            layout/

        identity/
        workspace/
        projects/
        billing/
```

Global components may be grouped by UI responsibility because they are application-wide infrastructure.

Module components should remain grouped by backend-aligned module.

---

# Component Folder Structure

A reusable component may use a dedicated folder when it has multiple closely related files.

Example:

```text
components/
    global/
        overlays/
            AppDialog/
                AppDialog.tsx
                AppDialog.test.tsx
                AppDialog.styles.ts
                AppDialog.types.ts
                index.ts
```

Small components may remain single files when additional folders provide no organizational benefit.

---

# Separation from Hooks

Reusable hooks must live under `hooks/`, not inside component folders.

Example:

```text
hooks/
    workspace/
        useWorkspaceSelection.ts

components/
    workspace/
        WorkspaceSelector.tsx
```

A component-specific internal hook may remain colocated only when:

* It is private to that component.
* It is not reusable.
* It exists solely to simplify that component's implementation.

Once reusable, it must move to the appropriate `hooks/` module.

---

# Separation from Types

Shared component and module types should live under `types/`.

Example:

```text
types/
    workspace/
        workspace.ts

components/
    workspace/
        WorkspaceCard.tsx
```

A tiny private prop type may remain in the component file.

Reusable types must not be hidden inside implementation files.

---

# Separation from Schemas

Runtime validation schemas belong under `schemas/`.

Components may import schemas through hooks or form infrastructure, but should not define duplicated business validation rules locally.

Example:

```text
schemas/
    identity/
        loginSchema.ts

components/
    identity/
        LoginForm.tsx
```

---

# Separation from Styles

Reusable style definitions should follow the same technical-responsibility structure.

Recommended placement:

```text
styles/
    global/
    identity/
    workspace/
    billing/
```

Component-private styles may be colocated when supported by the approved styling system, but shared module style utilities must live under `styles/{module}/`.

---

# Component Responsibilities

A component should have one primary responsibility.

Examples:

```text
WorkspaceCard
    → Display workspace summary and approved actions

MemberRoleSelect
    → Allow role selection

InvoiceTable
    → Present invoice collection
```

A component should not combine unrelated data loading, navigation, form state, modal coordination, and visual rendering without clear boundaries.

---

# Presentational Components

Presentational components focus on rendering and interaction.

They should generally receive:

* Data
* Display state
* Event callbacks
* Approved variants

They should avoid hidden data fetching when the parent already owns the workflow.

Example:

```typescript
interface WorkspaceCardProps {
  workspace: WorkspaceSummary;
  onOpen: () => void;
  onArchive?: () => void;
}
```

---

# Connected Components

Connected components may consume hooks or context when the dependency is intrinsic to their purpose.

Examples:

* Global language switcher
* Active workspace switcher
* Notification center
* Session menu

Connected components should still delegate complex visual rendering to focused children when practical.

---

# Data Fetching Boundaries

Pages and route-level containers should normally own primary data-fetching composition.

Reusable components may fetch data directly when:

* The data is intrinsic to the component.
* The component is a stable application-level container.
* Parent orchestration would create unnecessary prop plumbing.
* Cache ownership remains clear.

A generic display component should not issue hidden network requests.

---

# Component Composition

Composition should be preferred over large configuration objects.

Prefer:

```tsx
<PageHeader
  title={title}
  actions={<ProjectActions />}
/>
```

over a single component with many unrelated flags controlling every possible arrangement.

Composition improves:

* API clarity
* Reusability
* Type safety
* Testability
* Layout flexibility

---

# Slots

Shared components may expose named composition areas.

Examples:

```text
header

actions

footer

leading

trailing

emptyState
```

Slots should have stable semantic meaning.

A component should not expose implementation-specific slots that require consumers to understand its internal DOM structure.

---

# Children

Use `children` when content is the component's primary composition area.

Use named props when several distinct content regions exist.

Component APIs should avoid accepting both several overlapping content props and `children` without clear precedence.

---

# Component API Design

Public component APIs should be:

* Typed
* Narrow
* Predictable
* Semantically named
* Stable
* Difficult to misuse

Consumers should not need to understand internal styling or DOM structure.

---

# Prop Naming

Props should describe intent.

Prefer:

```text
isOpen

isLoading

isDisabled

onClose

onSubmit

selectedValue
```

Avoid:

```text
openState

loader

disableIt

clickHandler

dataObj
```

Boolean props should generally use readable `is`, `has`, `can`, or `should` prefixes.

---

# Required and Optional Props

A prop should be required when the component cannot operate meaningfully without it.

Optional props should have documented default behavior.

Excessive optional props may indicate that a component has too many responsibilities.

---

# Variant Props

Variants should represent approved reusable differences.

Example:

```typescript
type ButtonVariant =
  | "primary"
  | "secondary"
  | "neutral"
  | "destructive";
```

Variants should not expose raw styling choices such as arbitrary colors, padding, or shadows.

---

# Size Props

Approved size variants may include:

```text
small

medium

large
```

Sizes should map to shared design-system dimensions.

Components should not accept arbitrary pixel sizes unless their purpose explicitly requires them.

---

# State Props

Interactive components should represent applicable state explicitly.

Examples:

```text
isLoading

isDisabled

isSelected

isInvalid

isReadOnly
```

State combinations should be validated through component logic and types where possible.

---

# Mutually Exclusive Props

When props represent mutually exclusive modes, use discriminated unions.

Example:

```typescript
type LinkOrButtonProps =
  | {
      href: string;
      onClick?: never;
    }
  | {
      href?: never;
      onClick: () => void;
    };
```

This prevents invalid combinations and improves AI-assisted usage.

---

# Callback Props

Callback names should describe completed or requested actions.

Examples:

```text
onOpen

onClose

onChange

onConfirm

onRetry
```

Callbacks should receive the smallest useful payload.

Passing entire internal event objects should be avoided when consumers only need a value.

---

# Event Propagation

Components should not unexpectedly stop propagation or prevent default browser behavior.

Such behavior should only occur when it is required by the component contract and documented.

---

# Controlled Components

A controlled component receives its active state and update callback from its owner.

Example:

```tsx
<Dialog
  isOpen={isOpen}
  onOpenChange={setIsOpen}
/>
```

Controlled behavior is appropriate when:

* State must be coordinated externally.
* Several components share the state.
* URL or page state owns the value.
* The parent must validate transitions.

---

# Uncontrolled Components

An uncontrolled component may own temporary internal state.

Example:

```tsx
<Disclosure defaultOpen={false} />
```

Uncontrolled behavior is appropriate for isolated presentation state.

A component should not switch between controlled and uncontrolled behavior during its lifecycle.

---

# Hybrid APIs

Where both controlled and uncontrolled use are supported, the contract should be explicit.

Example:

```text
value / defaultValue

open / defaultOpen
```

Controlled values should take precedence, and development warnings should identify invalid usage where practical.

---

# Ref Forwarding

Low-level controls and primitives may forward refs when consumers require:

* Focus management
* Measurement
* Integration with form libraries
* Overlay positioning

Refs should not be exposed without a real use case.

Internal DOM structure should remain replaceable where practical.

---

# Polymorphic Components

Polymorphic components may render different semantic elements.

Example:

```tsx
<Text as="span" />

<Button asChild>
  <a href="/settings">Settings</a>
</Button>
```

Polymorphism should preserve:

* Correct semantics
* Type safety
* Accessibility
* Styling behavior

Overly broad polymorphism can make component APIs difficult to understand and should be limited.

---

# Semantic HTML

Components should render the correct semantic element by default.

Examples:

* Use `button` for actions.
* Use links for navigation.
* Use headings for section titles.
* Use lists for collections.
* Use tables for tabular data.
* Use form controls for editable values.

Generic `div` elements should not replace native semantics without justification.

---

# Accessibility Ownership

The reusable component owns accessibility behavior intrinsic to the component.

Examples:

* Dialog focus trapping
* Button keyboard activation
* Input label association
* Menu keyboard navigation
* Tooltip relationship
* Error announcement behavior

Consumers own accessible content such as meaningful labels and descriptions.

---

# Accessible Names

Every interactive component must have an accessible name.

The API should support:

* Visible labels
* `aria-label`
* `aria-labelledby`

Icon-only controls must require or strongly guide accessible labeling.

---

# Focus Management

Components should manage focus only when required by their interaction pattern.

Examples:

* Dialogs move focus inside when opened.
* Dialogs restore focus when closed.
* Validation may focus the first invalid field.
* Navigation should not move focus unexpectedly.

Focus behavior should be deterministic and testable.

---

# Keyboard Interaction

Shared interactive components should follow recognized keyboard patterns.

Examples:

* Enter or Space activates buttons.
* Escape closes dismissible overlays.
* Arrow keys navigate menus and tabs where appropriate.
* Tab moves through interactive elements in document order.

Module components should not invent conflicting keyboard behavior.

---

# Styling Strategy

The approved styling approach should provide:

* Design-token consumption
* Component scoping
* Static analysis or typing where practical
* Responsive rules
* Theme support
* State variants
* Build-time optimization

The specific technology may evolve, but architectural responsibilities must remain stable.

---

# CSS Variables

Semantic design tokens should be exposed through CSS variables where runtime theming is required.

Example:

```css
:root {
  --color-text-primary: ...;
  --color-surface-default: ...;
  --space-md: ...;
}
```

Components should reference semantic variables rather than repeating literal values.

---

# Style Scope

Component styles should remain scoped to the component or approved shared utility.

Styles should not depend on distant page ancestry or undocumented DOM structure.

Avoid selectors such as:

```css
.page .sidebar .content .card button
```

Deep selectors create fragile coupling.

---

# Global Styles

Global styles should be limited to true application-wide concerns.

Examples:

* CSS reset
* Root typography
* Theme variables
* Document background
* Focus foundations
* Selection behavior
* Reduced-motion behavior
* Safe-area variables

Module-specific visual rules must not be added to global stylesheets.

---

# Style Reset

The global reset should normalize browser behavior without removing useful native accessibility.

It may define:

* Box sizing
* Default margins
* Font inheritance
* Media sizing
* Form control inheritance

It must not remove focus indicators without replacements.

---

# Utility Classes

Utilities may be used for common low-level behaviors such as:

```text
visually hidden

text truncation

scroll locking

full-width

responsive visibility
```

Utilities should remain controlled and documented.

The project should not become dependent on arbitrary utility combinations that bypass component ownership and design-system rules.

---

# Layout Styling

Page and component layouts should prefer:

* Flexbox
* Grid
* Logical properties
* Fluid sizing
* Shared layout primitives
* Container queries where appropriate

Absolute positioning should not be the default layout strategy.

---

# Logical Properties

Use logical CSS properties when direction-independent meaning is intended.

Prefer:

```css
margin-inline-start
padding-inline
border-block-end
inset-inline-end
```

over hard-coded left and right properties.

This improves bilingual and future right-to-left readiness.

---

# Responsive Styling

Responsive behavior should be mobile-first.

Base styles should support narrow viewports.

Enhancements should apply as available space increases.

```css
.component {
  /* Mobile-first base */
}

@media (...) {
  /* Wider layout enhancement */
}
```

Desktop layout should not be built first and then patched for mobile.

---

# Component-Level Responsiveness

Components should adapt to the width of their actual container where practical.

Container queries may be preferred when component behavior depends on local space rather than viewport width.

This is useful for reusable components appearing in:

* Sidebars
* Dashboards
* Dialogs
* Full-width pages

---

# Responsive Props

JavaScript responsive props should be avoided when CSS can express the behavior.

Prefer responsive styling over APIs such as:

```tsx
<Component
  mobileLayout="stacked"
  desktopLayout="inline"
/>
```

unless the behavior affects application logic rather than presentation alone.

---

# Visibility

Responsive hiding should be used carefully.

Content essential to completing a workflow should not disappear simply because the screen is small.

Alternative layouts should preserve access to the same functionality.

---

# Fixed Dimensions

Fixed widths and heights should be limited.

They may be appropriate for:

* Icons
* Avatars
* Controls
* Approved navigation regions
* Media aspect ratios

Text containers should generally allow expansion and wrapping.

---

# Overflow

Components should define overflow behavior explicitly.

Possible strategies include:

* Wrapping
* Scrolling
* Truncation
* Pagination
* Collapsing secondary content

Uncontrolled horizontal page scrolling should be treated as a defect unless the workflow explicitly requires it.

---

# State-Dependent Styles

Component states should be represented through explicit attributes or approved variants.

Examples:

```text
data-state="open"

aria-selected="true"

aria-invalid="true"

disabled
```

Styling should align with semantic state rather than unrelated class names.

---

# Data Attributes

Data attributes may expose stable component state for styling.

Example:

```tsx
<div data-state={isOpen ? "open" : "closed"} />
```

Data attributes should describe public state, not internal implementation details.

---

# Hover Styles

Hover styles should enhance pointer interaction but must not be required to understand or use the component.

Touch devices and keyboard users must receive equivalent usable behavior.

---

# Focus Styles

Focus-visible styling should be shared and consistent.

Component styles must not suppress global focus behavior without providing an approved component-specific replacement.

---

# Disabled Styles

Disabled appearance should remain consistent with semantic disabled behavior.

Visual dimming alone does not disable an interaction.

The correct native or ARIA state must also be applied.

---

# Loading Styles

Loading styles should preserve component dimensions to prevent layout movement.

Skeletons should approximate the final structure and should not create misleading content.

---

# Error Styles

Error styling should combine:

* Semantic color
* Icon or status cue where appropriate
* Clear text
* Correct ARIA state
* Recovery guidance

Error borders alone are insufficient.

---

# Animation Ownership

A component owns animations intrinsic to its interaction.

Examples:

* Dialog entrance
* Disclosure expansion
* Toast lifecycle
* Loading indicator

Pages should not reach into component internals to animate private elements.

---

# Reduced-Motion Behavior

Every animated shared component must define reduced-motion behavior.

This behavior should come from global motion foundations where practical rather than custom per-component media queries.

---

# Styling Module Boundaries

Module style resources should remain under their backend-aligned module.

Example:

```text
styles/
    workspace/
        workspace-layout.css
        workspace-table.css
```

A module must not override another module's internal class names.

Shared needs should be promoted into global tokens, primitives, or utilities.

---

# Style Encapsulation

Consumers should style a component through:

* Approved variants
* Composition
* Layout wrappers
* Documented style hooks

Consumers should not:

* Target private descendants.
* Override generated class names.
* Depend on internal tag order.
* Use `!important` to force ordinary variants.
* Modify shared component internals from page styles.

---

# Class Name Props

A `className` escape hatch may be provided for layout integration.

It should not replace semantic component variants.

Consumers may use it for:

* Parent-controlled placement
* Grid positioning
* External margins where approved

They should not use it to rebuild the component's visual design.

---

# Inline Styles

Inline styles may be used for truly dynamic calculated values such as:

* Position coordinates
* Measured dimensions
* User-selected chart values
* Progress percentages

Static visual values should use the shared styling architecture.

---

# Arbitrary Values

Arbitrary colors, spacing, shadows, radii, and typography values are prohibited in ordinary component implementation.

Exceptions require documented justification, such as:

* External brand requirements
* Data visualization calculations
* User-configurable content
* Embedded third-party constraints

Repeated exceptions should become tokens or approved variants.

---

# Component Variants

Variants should be implemented centrally within the component.

Consumers should not reproduce a variant by applying external class combinations.

Example:

```tsx
<Alert tone="warning" />
```

rather than manually styling a neutral alert to appear like a warning.

---

# Compound Variants

Components may define compound variants for valid state combinations.

Example:

```text
size=small + iconOnly=true

tone=destructive + disabled=true
```

Compound behavior should be tested.

The API should avoid an uncontrolled number of interacting flags.

---

# Boolean Prop Growth

A component with many independent boolean appearance props may indicate an invalid abstraction.

Example problem:

```text
isCompact

isBordered

isElevated

isRounded

isMuted

isInline

isDense
```

Prefer named variants, composition, or separate components when these combinations represent distinct concepts.

---

# Headless Components

Behavioral or headless components may be used for complex interaction patterns.

They should provide:

* Accessibility behavior
* State management
* Event handling
* Flexible rendering

TEED visual wrappers should then apply design-system styles consistently.

Headless abstractions should not leak complex implementation details into every consumer.

---

# Third-Party UI Libraries

Third-party components should be wrapped when direct consumption would expose:

* External visual conventions
* Inconsistent prop names
* Uncontrolled accessibility behavior
* Library-specific types
* Upgrade-sensitive APIs

Pages and module components should consume TEED-owned wrappers rather than depending broadly on third-party component APIs.

---

# Third-Party Styling

External component styles must be adapted to:

* TEED semantic tokens
* Theme behavior
* Focus standards
* Responsive rules
* Density rules
* Bilingual text expansion

A third-party package must not introduce a separate palette, typography scale, or spacing system.

---

# Replacement Readiness

Wrappers should reduce the impact of replacing a third-party component library.

However, wrappers should not attempt to hide every possible external API.

They should expose only the subset TEED actually supports.

---

# Tables

Reusable table architecture should separate:

* Table data model
* Column definitions
* Sorting and selection state
* Pagination state
* Visual rendering
* Responsive fallback

A generic table should not contain module-specific business actions.

Module-specific columns and row actions belong in module composition.

---

# Lists and Collections

Collection components should support stable item keys and explicit empty, loading, and error states.

Large collections should consider:

* Pagination
* Virtualization
* Progressive rendering
* Accessible announcements

Virtualization should only be introduced when measurement shows a real performance need.

---

# Modals and Dialogs

Dialog components should own:

* Portal rendering
* Focus trapping
* Initial focus
* Escape handling
* Background interaction blocking
* Focus restoration
* Accessible title and description relationships

Module components should provide workflow-specific content and actions.

---

# Confirmation Components

Shared confirmation components may support generic destructive or important action patterns.

They should receive explicit:

* Title
* Description
* Confirm label
* Cancel label
* Tone
* Pending state

The confirmation component should not decide whether a business action is safe.

---

# Toast Components

Toast presentation should remain globally centralized.

Module code should publish structured notification intent rather than rendering independent toast containers.

Toasts should not be the only presentation for errors requiring immediate user correction.

---

# Empty-State Components

A shared empty-state component may provide consistent:

* Visual structure
* Heading
* Description
* Primary action
* Secondary action
* Illustration slot

Module-specific copy and actions belong to the consuming module.

---

# Error Components

Shared error components should support different scopes:

```text
Inline error

Section error

Page error

Fatal fallback
```

The selected component should correspond to the scope and recoverability of the failure.

---

# Loading Components

Loading presentation may include:

* Inline spinner
* Button progress
* Skeleton
* Section loader
* Startup loader

One loader should not be reused indiscriminately for every scope.

---

# Forms

Form components should distinguish between:

* Primitive controls
* Field wrappers
* Form sections
* Module-specific forms

Example:

```text
Input
    ↓
FormField
    ↓
WorkspaceNameField
    ↓
CreateWorkspaceForm
```

Validation and submission lifecycle are defined in `forms-validation-and-file-handling.md`.

---

# Content Components

Components rendering rich or user-generated content should define:

* Sanitization boundaries
* Typography rules
* Link handling
* Overflow behavior
* Media behavior
* Directionality
* Empty content behavior

User-provided HTML must not be rendered without approved sanitization.

---

# Icon Components

Icons should be consumed through the approved global icon abstraction.

This supports:

* Consistent size names
* Accessible behavior
* Tree-shaking
* Library replacement
* Theme integration

Module code should not import icons from several unrelated libraries.

---

# Image Components

Reusable image components may standardize:

* Responsive sizing
* Lazy loading
* Aspect ratio
* Fallback behavior
* Alternative text
* Error state

Critical branding images may require eager loading.

Decorative images should be marked appropriately.

---

# Public Exports

Each component area may expose controlled public entry points.

Example:

```text
components/
    global/
        controls/
            index.ts
```

Public exports should include supported components only.

Private internal helpers should not be exported accidentally.

---

# Barrel Files

Barrel files may improve discoverability but should remain bounded.

Avoid one application-wide barrel that exports every component, hook, type, and schema.

Large barrels can create:

* Circular dependencies
* Poor tree-shaking
* Hidden ownership
* Slower tooling
* Ambiguous imports

Prefer module- or responsibility-scoped entry points.

---

# Import Rules

Imports should communicate ownership.

Preferred:

```typescript
import { Button } from "@/components/global/controls";
import { WorkspaceCard } from "@/components/workspace";
```

Deep imports into private component internals should be prohibited.

---

# Circular Dependencies

Component architecture must avoid circular dependencies.

Common invalid cycles include:

```text
Global component
    → Module component
    → Global component
```

Global infrastructure must not import module-specific UI.

Dependency direction should remain:

```text
Pages

↓

Module Components

↓

Global Components

↓

Primitives and Tokens
```

---

# Naming Conventions

Component names should be:

* PascalCase
* Meaningful
* Domain-specific where appropriate
* Free from unnecessary implementation details

Prefer:

```text
WorkspaceMemberList

InvoiceStatusBadge

ConfirmationDialog
```

Avoid:

```text
BlueBox

NewComponent

CommonCard

DataThing
```

---

# Generic Naming

Names such as `Common`, `Shared`, `Base`, and `Generic` should be used sparingly.

The folder location already communicates shared ownership.

A component name should describe what the component represents or does.

---

# File Naming

Component filenames should match the exported component name.

Example:

```text
WorkspaceCard.tsx

WorkspaceCard.test.tsx

WorkspaceCard.styles.ts
```

Hook, schema, and type filenames should follow their respective responsibility conventions.

---

# Documentation Requirements

Every significant global component should document:

* Purpose
* Ownership
* Public props
* Variants
* States
* Accessibility behavior
* Responsive behavior
* Localization considerations
* Examples
* Unsupported usage

Module components require documentation when their behavior is complex or broadly reused within the module.

---

# Story and Example Coverage

Shared components should have isolated examples covering:

* Default state
* Variants
* Loading
* Disabled
* Error
* Long bilingual content
* Narrow container
* Dark theme
* Keyboard interaction

Examples should use realistic TEED content rather than placeholder text alone.

---

# AI-Assisted Implementation Guidance

Component documentation should make architectural constraints explicit enough that AI-generated code can select the correct location and dependencies.

Documentation should clearly identify:

* Whether a component is global or module-owned
* Which design tokens it consumes
* Which hooks it may call
* Which props are required
* Which behavior is prohibited
* Which responsive and accessibility states are required

AI-generated components must follow the same review and testing standards as manually written code.

---

# Performance

Components should avoid unnecessary rerenders.

Practices include:

* Keeping context values focused
* Avoiding unstable object props where harmful
* Memoizing only when measurement justifies it
* Splitting large rendering trees
* Lazy loading expensive route-level components
* Avoiding hidden repeated data requests

Memoization should not be applied automatically to every component.

---

# Rendering Cost

Large tables, charts, editors, and overlays should be profiled.

Potential strategies include:

* Pagination
* Virtualization
* Deferred rendering
* Code splitting
* Incremental loading

Performance techniques must preserve accessibility and predictable behavior.

---

# CSS Performance

Styles should avoid:

* Extremely deep selectors
* Large amounts of unused global CSS
* Repeated runtime style generation
* Expensive universal descendant matching
* Excessive layout-triggering animation

Performance optimization should not sacrifice maintainability without evidence.

---

# Bilingual Requirements

Components must tolerate both supported languages.

Tests should include:

* Long labels
* Short labels
* Multi-line controls
* Localized dates
* Localized numbers
* Localized currencies
* Pluralized text
* Dynamic validation messages

Component dimensions must not assume one language's typical text length.

---

# PWA Requirements

Components used in installed PWA mode should account for:

* Narrow screens
* Touch interaction
* Safe areas
* Offline status
* Application update messages
* Standalone display mode
* Reduced browser chrome

Browser-only hover behavior must not be required.

---

# Future Mobile Readiness

Components should remain adaptable to future mobile wrappers by avoiding unnecessary direct dependencies on:

* Browser storage
* Window navigation
* Document-level events
* Browser notification APIs
* Pointer hover
* Desktop-only layout assumptions

Platform behavior should be accessed through global runtime abstractions.

---

# Security

Components must not:

* Render unsanitized HTML.
* Expose authorization decisions through visual logic alone.
* Log sensitive prop values.
* Place secrets in DOM attributes.
* Trust client-side hidden or disabled states as security controls.

Backend authorization remains authoritative.

---

# Testing Requirements

## Unit Tests

Test:

* Prop behavior
* Variant selection
* State combinations
* Callback payloads
* Default values
* Conditional rendering
* Utility functions

## Component Tests

Test:

* User interaction
* Keyboard behavior
* Focus management
* Accessible names
* Disabled behavior
* Loading behavior
* Error behavior
* Long-content handling

## Styling Tests

Test:

* Token consumption
* Theme compatibility
* Responsive behavior
* State attributes
* Overflow
* Reduced motion
* Logical property usage

## Visual Regression Tests

Test:

* Light theme
* Dark theme
* Narrow containers
* Mobile viewport
* Desktop viewport
* Bilingual text expansion
* Loading, empty, error, and disabled states

## Integration Tests

Test:

* Page composition
* Module and global component interoperability
* Dialog and portal layering
* Form integration
* Routing integration
* Runtime provider integration

## End-to-End Tests

Test:

* Core workflows across viewport sizes
* Keyboard-only operation
* Touch-oriented interaction
* Installed PWA layouts
* Theme switching
* Language switching
* Component behavior during offline and reconnect states

---

# Acceptance Criteria

The component and styling architecture is complete when:

* Components are organized by technical responsibility and backend-aligned module.
* Global reusable components remain separate from module-specific components.
* Pages primarily compose hooks, layouts, and components.
* Shared UI consumes semantic design tokens.
* Component APIs are typed, narrow, and semantically named.
* Controlled and uncontrolled behavior is explicit.
* Shared components provide accessible defaults.
* Global styles are limited to true application-wide foundations.
* Module styles cannot override private styles in other modules.
* Responsive behavior is mobile-first and supports bilingual content.
* Third-party UI dependencies are adapted through TEED-owned boundaries.
* Tests cover behavior, accessibility, themes, responsiveness, and localization.
* The architecture remains suitable for web, PWA, and future mobile clients.

---

# Architecture Rules

1. Frontend code must use responsibility-first folders such as `components/`, `hooks/`, `styles/`, `pages/`, `schemas/`, and `types/`.
2. Each responsibility folder must organize domain-specific files under backend-aligned modules such as `identity/`, `workspace/`, and `billing/`.
3. Shared application-wide UI must live under `components/global/`; module-specific UI must remain under its owning module.
4. Pages, hooks, components, schemas, types, and styles must not be mixed inside feature-local folders.
5. Components must have one primary responsibility and the narrowest correct ownership scope.
6. Pages should compose data hooks and components rather than implement reusable UI or raw transport behavior.
7. Global components must not import module-specific components or business logic.
8. Component APIs must expose semantic props and approved variants rather than arbitrary styling controls.
9. Reusable component accessibility behavior must be implemented inside the component, not recreated by each consumer.
10. Styling must consume shared semantic tokens and must not rely on arbitrary global selectors, private descendant overrides, or undocumented DOM structure.
11. Responsive behavior must be mobile-first, bilingual-safe, touch-friendly, and based on shared layout foundations.
12. Controlled, uncontrolled, loading, disabled, selected, invalid, and read-only states must have explicit and predictable behavior.
13. Third-party UI libraries must be wrapped or adapted so TEED owns the supported API, visual language, and accessibility contract.
14. Browser-specific behavior must remain behind runtime abstractions where future PWA or mobile implementations may differ.
15. Every shared component must be typed, documented, testable, theme-compatible, localization-ready, and safe for AI-assisted consumption.
