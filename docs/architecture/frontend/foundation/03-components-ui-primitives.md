# TEED Frontend Foundation

## Part 3 — Global Components, Design Tokens, Accessibility, Responsive UI, and Shared Testing Utilities

---

# Purpose

This section defines the reusable visual and interaction foundation for the TEED frontend.

It establishes:

* Global component ownership
* Base interface components
* Form-control components
* Layout primitives
* Loading states
* Error states
* Empty states
* Message presentation
* Design-token implementation
* Theme implementation
* Accessibility contracts
* Responsive behavior
* Mobile and touch requirements
* Shared component-testing utilities

The objective is to ensure that business modules build on one consistent interface system rather than creating independent visual patterns.

---

# Global UI Foundation

The TEED frontend should provide a small set of reusable global components before business modules begin implementing complex pages.

Global components should be:

* Accessible
* Typed
* Responsive
* Translation-compatible
* Theme-compatible
* Easy to test
* Independent of one business module
* Consistent with design tokens

Recommended location:

```text
src/global/components/
```

The initial component library should remain practical.

The project should not attempt to build every possible component before real requirements exist.

---

# Global Component Categories

Global components may be organized into the following categories:

```text
Actions
Forms
Feedback
Layout
Navigation
Data display
Overlays
Utilities
```

Recommended structure:

```text
src/global/components/
├── actions/
├── forms/
├── feedback/
├── layout/
├── navigation/
├── data-display/
├── overlays/
└── utilities/
```

A flatter structure may be used during the earliest milestone, but category folders should be introduced when the number of components grows.

---

# Initial Global Component Set

The first implementation should provide:

```text
src/global/components/
├── actions/
│   └── button.tsx
│
├── forms/
│   ├── input.tsx
│   ├── textarea.tsx
│   ├── select.tsx
│   ├── checkbox.tsx
│   ├── radio-group.tsx
│   ├── form-field.tsx
│   ├── form-label.tsx
│   ├── form-description.tsx
│   └── form-error.tsx
│
├── feedback/
│   ├── alert.tsx
│   ├── loader.tsx
│   ├── skeleton.tsx
│   ├── empty-state.tsx
│   ├── error-state.tsx
│   ├── offline-banner.tsx
│   └── message-region.tsx
│
├── layout/
│   ├── app-shell.tsx
│   ├── page-container.tsx
│   ├── page-header.tsx
│   ├── stack.tsx
│   ├── inline.tsx
│   ├── grid.tsx
│   └── card.tsx
│
├── overlays/
│   ├── modal.tsx
│   ├── confirmation-dialog.tsx
│   └── drawer.tsx
│
└── utilities/
    ├── visually-hidden.tsx
    ├── error-boundary.tsx
    └── portal.tsx
```

Components should be introduced incrementally.

Only components required by the current foundation milestone need to be implemented immediately.

---

# Global Component Rules

Global components should:

* Accept typed props
* Forward refs where appropriate
* Support class-name extension where approved
* Use semantic HTML
* Expose accessible names
* Support disabled states
* Support focus-visible states
* Work with keyboard navigation
* Use design tokens
* Avoid module-specific terminology
* Avoid direct API requests
* Avoid business permission logic
* Avoid module-specific translation keys

Global components may use global translation keys when they render generic interface text.

Examples include:

```text
global.close
global.cancel
global.retry
global.loading
```

---

# Component Public Interfaces

Each global component should expose a small, stable public interface.

Avoid exposing internal implementation details through props.

Preferred:

```typescript
export interface ButtonProps
  extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: ButtonVariant;
  size?: ButtonSize;
  loading?: boolean;
  loadingLabel?: string;
}
```

Avoid broad interfaces such as:

```typescript
export interface ButtonProps {
  configuration: Record<string, unknown>;
}
```

Component props should communicate supported behavior clearly.

---

# Class Name Composition

A shared class-name utility may be introduced.

Recommended location:

```text
src/global/helpers/class-names.ts
```

Example:

```typescript
export function classNames(
  ...values: Array<
    string | false | null | undefined
  >
): string {
  return values.filter(Boolean).join(" ");
}
```

A third-party class-name utility may be used if it has already been approved.

Modules should not introduce multiple class-composition libraries.

---

# Button Component

The global button should support common action states.

Recommended variants:

```typescript
export type ButtonVariant =
  | "primary"
  | "secondary"
  | "outline"
  | "ghost"
  | "danger";
```

Recommended sizes:

```typescript
export type ButtonSize =
  | "small"
  | "medium"
  | "large";
```

Core states should include:

* Default
* Hover
* Focus-visible
* Active
* Disabled
* Loading

Example interface:

```typescript
export interface ButtonProps
  extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: ButtonVariant;
  size?: ButtonSize;
  loading?: boolean;
  loadingLabel?: string;
  fullWidth?: boolean;
}
```

---

# Button Loading Behavior

When loading, the button should:

* Prevent repeated activation
* Preserve its accessible name
* Indicate progress visually
* Indicate progress to assistive technology
* Avoid large layout shifts

Example:

```tsx
<Button
  type="submit"
  loading={isSubmitting}
  loadingLabel={t("global.saving")}
>
  {t("global.save")}
</Button>
```

The visible button text may remain or be replaced by the loading label, depending on the design standard.

---

# Button Accessibility

A button should:

* Render a native `button`
* Use a default `type="button"` unless overridden
* Support keyboard activation
* Show visible focus
* Use `disabled` for unavailable actions
* Use `aria-busy` during loading
* Avoid relying only on icon meaning

Icon-only buttons must receive an accessible label.

Example:

```tsx
<Button
  variant="ghost"
  aria-label={t("global.close")}
>
  <CloseIcon aria-hidden="true" />
</Button>
```

---

# Link and Button Separation

Navigation actions should normally use links.

Commands should normally use buttons.

Examples:

```text
Open workspace page → Link
Submit form → Button
Delete record → Button
Return to dashboard → Link
```

A button should not be styled as a link when the action changes location unless there is a documented reason.

---

# Input Component

The input component should wrap a native input while preserving native behavior.

Example interface:

```typescript
export interface InputProps
  extends React.InputHTMLAttributes<HTMLInputElement> {
  invalid?: boolean;
}
```

The input should support:

* Text input
* Email
* Password
* Number
* Search
* Telephone
* Date where browser behavior is accepted

Complex inputs such as date pickers should be separate components.

---

# Input State Styling

The global input should define visual states for:

* Default
* Hover
* Focus
* Invalid
* Disabled
* Read-only
* Autofill

Invalid state should not depend on color alone.

The input should receive:

```text
aria-invalid="true"
```

when validation has failed.

---

# Textarea Component

The global textarea should:

* Preserve native resizing unless intentionally restricted
* Support invalid state
* Support disabled and read-only states
* Use the same typography and border tokens as inputs
* Work with form labels and descriptions

Automatic resizing may be added later as a separate behavior.

---

# Select Component

The initial select should use the native HTML `select` where practical.

Native selects provide:

* Keyboard support
* Mobile compatibility
* Accessibility
* Lower implementation complexity

A custom select should only be introduced when real requirements cannot be met by the native element.

A custom select requires careful handling of:

* Keyboard navigation
* Focus
* Search
* Screen readers
* Mobile behavior
* Portals
* Scrolling

---

# Checkbox Component

The checkbox should use a native input internally.

It should support:

* Checked
* Unchecked
* Indeterminate
* Disabled
* Invalid
* Label association

Example:

```typescript
export interface CheckboxProps
  extends Omit<
    React.InputHTMLAttributes<HTMLInputElement>,
    "type"
  > {
  indeterminate?: boolean;
}
```

The label should remain clickable.

---

# Radio Group

A radio group should support:

* Group label
* Individual labels
* Keyboard navigation
* Disabled items
* Validation messages
* Horizontal or vertical layout

The implementation should use native radio inputs unless a documented requirement justifies a custom pattern.

---

# Form Field Composition

Form controls should be composed through a shared form-field structure.

Recommended component:

```text
src/global/components/forms/form-field.tsx
```

A form field should coordinate:

* Label
* Input identifier
* Description
* Error message
* Required indicator
* Invalid state

Conceptual usage:

```tsx
<FormField
  label={t("identity.login.emailLabel")}
  description={t("identity.login.emailHelp")}
  error={formState.errors.email?.message}
  required
>
  {({ inputId, descriptionId, errorId }) => (
    <Input
      id={inputId}
      aria-describedby={[
        descriptionId,
        errorId,
      ]
        .filter(Boolean)
        .join(" ")}
      aria-invalid={
        Boolean(formState.errors.email)
      }
      {...register("email")}
    />
  )}
</FormField>
```

The exact API may be simpler, but relationships must remain accessible.

---

# Form Labels

Every form control should have an accessible label.

Preferred methods:

* Native `label` with `htmlFor`
* `aria-label` for rare icon-only controls
* `aria-labelledby` when an external element labels the control

Placeholder text should not replace a label.

---

# Required Field Indicators

Required state should be communicated visually and programmatically.

Possible approach:

```text
Email *
```

with:

```text
required
aria-required="true"
```

A form-level note may explain the required-field indicator.

The indicator should not rely only on color.

---

# Form Descriptions

Descriptions should provide useful context.

Examples:

* Password requirements
* Accepted file types
* Currency expectations
* Privacy explanation

Descriptions should be connected to controls using `aria-describedby`.

Descriptions should not repeat the label unnecessarily.

---

# Form Error Component

The form error component should:

* Display translated error text
* Use appropriate semantic markup
* Be associated with the control
* Remain visible until resolved
* Avoid layout instability where possible

Example:

```tsx
<FormError id={errorId}>
  {translatedMessage}
</FormError>
```

The component may use:

```text
role="alert"
```

selectively.

Not every field error needs an assertive announcement on every keystroke.

---

# Password Field

A reusable password field may combine:

* Password input
* Show or hide control
* Accessible toggle label
* Password requirements
* Error display

Recommended module ownership depends on reuse.

If password controls are used only by identity, they should remain under:

```text
src/components/identity/
```

If they become platform-wide, they may move to:

```text
src/global/components/forms/
```

Reuse should be demonstrated before moving components globally.

---

# Search Input

A search input may provide:

* Search icon
* Clear action
* Debounced value support through hooks
* Accessible search label
* Escape-key clearing where appropriate

Search behavior should remain separate from the base input component.

---

# File Input

A file input should preserve access to the native file picker.

The interface should communicate:

* Accepted file types
* Maximum file size
* Maximum file count
* Selected files
* Removal actions
* Upload state
* Backend validation errors

Client-side checks are advisory only.

The backend remains authoritative.

---

# Layout Primitives

Layout primitives should provide reusable spacing and alignment without embedding business meaning.

Recommended primitives:

```text
PageContainer
Stack
Inline
Grid
Card
Divider
```

These components should reduce repeated layout code while remaining easy to understand.

---

# Page Container

The page container should control:

* Maximum width
* Horizontal padding
* Mobile safe-area behavior
* Centering
* Consistent page spacing

Example interface:

```typescript
export interface PageContainerProps {
  size?: "narrow" | "medium" | "wide" | "full";
  children: React.ReactNode;
  className?: string;
}
```

Different page categories may use different widths.

Example:

```text
Authentication page → narrow
Settings page → medium
Dashboard page → wide
Data table page → full
```

---

# Stack Component

A stack arranges content vertically.

Example interface:

```typescript
export interface StackProps {
  gap?: SpacingToken;
  align?: "start" | "center" | "end" | "stretch";
  children: React.ReactNode;
}
```

Usage:

```tsx
<Stack gap="large">
  <PageHeader />
  <Form />
</Stack>
```

The stack should use approved spacing tokens.

---

# Inline Component

An inline component arranges items horizontally and may wrap responsively.

It may support:

* Gap
* Alignment
* Justification
* Wrapping
* Responsive stacking

Example:

```tsx
<Inline
  gap="small"
  justify="end"
  wrap
>
  <Button variant="secondary">
    {t("global.cancel")}
  </Button>

  <Button>
    {t("global.save")}
  </Button>
</Inline>
```

---

# Grid Component

A grid primitive should support common responsive layouts.

Example:

```typescript
export interface GridProps {
  columns?:
    | 1
    | 2
    | 3
    | 4;
  gap?: SpacingToken;
  children: React.ReactNode;
}
```

More advanced layouts may use CSS directly.

The grid abstraction should not become a replacement for all CSS Grid capabilities.

---

# Card Component

Cards may provide:

* Surface background
* Border
* Radius
* Padding
* Optional header
* Optional footer
* Optional interactive state

Cards should not be used for every page section by default.

They should reflect a meaningful grouping.

---

# Application Shell

The application shell should provide structural regions such as:

```text
Header
Sidebar
Main content
Optional footer
Mobile navigation
Global message region
Offline indicator
```

Recommended location:

```text
src/global/components/layout/app-shell.tsx
```

Module-specific layouts may compose the global shell.

---

# Page Header

A reusable page header may support:

* Title
* Description
* Breadcrumbs
* Primary action
* Secondary actions
* Status badge

Example interface:

```typescript
export interface PageHeaderProps {
  title: React.ReactNode;
  description?: React.ReactNode;
  actions?: React.ReactNode;
  breadcrumbs?: React.ReactNode;
}
```

Page headers should remain responsive.

Actions may stack below the title on small screens.

---

# Feedback Components

The global feedback layer should provide consistent patterns for:

* Loading
* Empty data
* Recoverable errors
* Fatal errors
* Offline state
* Success
* Warnings
* Informational messages

The same situation should not be represented differently across modules without a strong reason.

---

# Loader Component

A loader should indicate active work.

It may support sizes:

```text
small
medium
large
```

The component should:

* Include accessible loading text
* Avoid excessive animation
* Respect reduced-motion preferences
* Be used at the correct scope

Example:

```tsx
<Loader label={t("global.loading")} />
```

---

# Loading Scope

Loading patterns should match operation scope.

```text
Button action
    → button spinner

Small data section
    → local loader or skeleton

Whole page
    → page skeleton

Background refresh
    → subtle refresh indicator
```

A full-page loader should not be used for a small background request.

---

# Skeleton Component

Skeletons should represent approximate content structure.

They should:

* Avoid misleading exact content
* Respect reduced motion
* Use theme-compatible tokens
* Maintain layout stability
* Avoid excessive animation

Skeletons should not remain indefinitely.

Long-running requests should transition to a clear status or error.

---

# Empty State

The empty-state component should support:

* Title
* Description
* Optional illustration or icon
* Primary action
* Secondary action

Example:

```tsx
<EmptyState
  title={t("workspace.empty.title")}
  description={t("workspace.empty.description")}
  action={
    <Button>
      {t("workspace.actions.create")}
    </Button>
  }
/>
```

Module-specific text should be supplied by the module.

The global component should not contain business-specific messages.

---

# Error State

The error-state component should support:

* Translated title
* Safe description
* Retry action
* Navigation action
* Request reference identifier
* Appropriate severity

Example:

```tsx
<ErrorState
  title={t("errors.pageUnavailable")}
  description={errorMessage}
  requestId={error.requestId}
  onRetry={refetch}
/>
```

Sensitive backend details should not be displayed.

---

# Offline Banner

The offline banner should:

* Be globally visible
* Avoid blocking the entire interface unnecessarily
* Explain that network operations may fail
* Announce state changes accessibly
* Disappear or update on reconnection

Example text:

```text
You are offline. Some features may be unavailable.
```

This text should come from translation resources.

---

# Global Message Presentation

The message provider defined in Part 2 requires a visual message region.

Recommended location:

```text
src/global/components/feedback/message-region.tsx
```

The message region should render:

* Success messages
* Error messages
* Warning messages
* Informational messages

It should support:

* Multiple queued messages
* Dismiss controls
* Auto-dismiss
* Persistent messages
* Accessible announcements
* Responsive positioning

---

# Message Placement

Recommended default placement:

```text
Desktop → top-right
Mobile → top-center or full-width inset
```

Messages should avoid covering:

* Primary navigation
* Form submit actions
* Mobile bottom navigation
* Critical error banners

Safe-area insets should be considered.

---

# Alert Component

An alert is content within the page flow.

It differs from a temporary message.

Use an alert for:

* Form-wide error
* Important warning
* Informational notice
* Persistent success confirmation

Use a global message for:

* Temporary action result
* Background event
* Session notification
* Cross-page feedback

---

# Alert Variants

Recommended variants:

```typescript
export type AlertVariant =
  | "info"
  | "success"
  | "warning"
  | "error";
```

Alerts should include:

* Semantic icon where appropriate
* Text
* Optional title
* Optional actions
* Accessible role based on urgency

---

# Modal Component

The modal should provide:

* Focus trapping
* Initial focus
* Return focus
* Escape-key behavior
* Backdrop behavior
* Accessible title
* Accessible description
* Body-scroll management
* Responsive sizing

A modal should not be created using only visual positioning.

Accessibility behavior is part of the component contract.

---

# Modal Usage Rules

Use a modal for:

* Focused confirmation
* Short form
* Important detail
* Temporary task

Avoid modals for:

* Large multi-step workflows
* Dense data pages
* Long documentation
* Content requiring browser navigation
* Tasks that should have shareable URLs

Large workflows should use pages or drawers where appropriate.

---

# Confirmation Dialog

Destructive actions should use a dedicated confirmation pattern.

The confirmation dialog should clearly state:

* What will happen
* Which resource is affected
* Whether the action is reversible
* The destructive action label
* The cancel action

Avoid generic confirmation text such as:

```text
Are you sure?
```

Preferred:

```text
Delete workspace “Retail Operations”?
This action cannot be undone.
```

---

# Drawer Component

A drawer may support:

* Mobile navigation
* Filters
* Secondary details
* Short forms

It should include:

* Focus management
* Escape behavior
* Backdrop behavior
* Close action
* Safe-area support
* Appropriate screen-reader labeling

The mobile navigation drawer and general-purpose drawer may share infrastructure but should have distinct usage contracts.

---

# Portal Component

Overlays may require portal rendering.

A shared portal should:

* Render into a known root
* Support safe fallback
* Avoid creating unmanaged DOM nodes repeatedly
* Work in tests
* Work in PWA and future webview environments

Recommended root:

```html
<div id="root"></div>
<div id="portal-root"></div>
```

---

# Error Boundary Component

The error boundary should catch unexpected React rendering failures.

It should:

* Render a translated fallback
* Provide safe retry or reload actions
* Report safe diagnostic information
* Avoid exposing stack traces to users
* Preserve application branding
* Work in both light and dark themes

Expected query and form errors should not be sent to the error boundary.

---

# Visually Hidden Component

A visually hidden utility should hide content visually while keeping it available to assistive technologies.

Example:

```tsx
<VisuallyHidden>
  {t("global.loading")}
</VisuallyHidden>
```

It should use a tested CSS pattern.

It should not use:

```css
display: none;
```

because that removes content from accessibility APIs.

---

# Icon Foundation

The project should use one icon source.

Icons should be:

* Consistent
* Accessible
* Tree-shakable where possible
* Compatible with React
* Compatible with theming

Icons used only decoratively should include:

```text
aria-hidden="true"
```

Meaningful icons should have an accessible label or accompanying text.

A second icon library should not be introduced without justification.

---