# `docs/frontend/foundation/responsive-accessibility-and-i18n.md`

# Responsive, Accessibility, and Internationalization Architecture

## Purpose

This document defines how the TEED frontend supports responsive layouts, accessible interaction, bilingual content, localized formatting, and future language-direction changes.

These concerns are treated as core architectural requirements rather than final-stage quality checks.

Every page, layout, component, form, and workflow should remain usable across screen sizes, input methods, assistive technologies, supported languages, installed PWA mode, and future mobile packaging.

---

# Objectives

The architecture should:

* Establish a mobile-first responsive strategy.
* Preserve complete workflows across viewport sizes.
* Make accessible behavior the default.
* Support keyboard, touch, pointer, and assistive-technology users.
* Centralize language selection and translation resources.
* Support localized dates, times, numbers, currencies, and pluralization.
* Prevent layout breakage caused by translated content.
* Prepare components for future right-to-left language support.
* Define testing requirements for responsive, accessible, and bilingual behavior.
* Keep implementation consistent across backend-aligned modules.

---

# Scope

This document covers:

* Responsive layout strategy
* Breakpoints and container behavior
* Mobile, tablet, and desktop adaptation
* Touch and pointer interaction
* Keyboard accessibility
* Semantic HTML
* Focus management
* Screen-reader support
* Color, contrast, and motion
* Internationalization architecture
* Translation resources
* Locale resolution
* Localized formatting
* Text expansion
* Directionality
* Content and error localization
* Accessibility and localization testing

Design tokens and visual foundations are defined in `design-system-and-ui-foundations.md`.

Component implementation rules are defined in `component-and-styling-architecture.md`.

Form-specific accessibility is defined in `forms-validation-and-file-handling.md`.

---

# Core Principle

Responsive design, accessibility, and internationalization must be built into the component architecture from the beginning.

```text
Design Tokens

↓

Accessible Components

↓

Responsive Composition

↓

Localized Content

↓

Pages and Workflows
```

These requirements must not be applied only after a feature is visually complete.

---

# Architectural Relationship

Responsive behavior, accessibility, and localization are closely related.

A translated label may change layout.

A mobile layout may change reading order.

A collapsed navigation pattern may change keyboard behavior.

A dialog adapted for small screens may change focus management.

Therefore, these concerns must be tested together rather than in isolation.

---

# Responsive Architecture

The TEED frontend should follow a mobile-first responsive strategy.

Base styles should support the narrowest practical viewport.

Additional layout capability should be introduced as available space increases.

```text
Mobile Base

↓

Tablet Enhancement

↓

Desktop Enhancement

↓

Wide-Screen Constraint
```

Desktop-first layouts that are later compressed into mobile variants should be avoided.

---

# Responsive Ownership

Responsive behavior should be owned by the narrowest component or layout capable of handling it correctly.

Examples:

```text
Application shell responsiveness
    → Layout component

Card layout responsiveness
    → Card collection or grid

Table fallback
    → Table component or module collection view

Form field stacking
    → Form layout component
```

Pages should not contain repeated media-query logic for shared components.

---

# Breakpoints

Breakpoints should be centralized through shared tokens or approved utilities.

Recommended semantic categories may include:

```text
small

medium

large

wide
```

Breakpoints should reflect meaningful layout transitions rather than specific device brands or models.

---

# Breakpoint Rules

A new breakpoint should only be introduced when:

* Existing breakpoints cannot express a recurring layout need.
* The behavior applies beyond one isolated component.
* The transition has been tested across intermediate widths.
* The breakpoint can be documented and maintained centrally.

Module-specific private breakpoint scales should be avoided.

---

# Fluid Layouts

Components should prefer fluid sizing over abrupt fixed layouts.

Useful techniques include:

* Flexible grid tracks
* `minmax`
* Wrapping flex layouts
* Relative widths
* Maximum content widths
* Responsive gaps
* Intrinsic sizing
* Container queries

Layouts should adapt continuously between defined breakpoints where practical.

---

# Container Queries

Container queries may be used when a component's behavior depends on the space provided by its parent rather than the entire viewport.

Suitable examples include:

* Dashboard cards
* Sidebar widgets
* Embedded tables
* Dialog content
* Reusable summary panels

Container-query behavior should remain part of the component contract and be tested in multiple host layouts.

---

# Page Containers

Shared page containers should define approved width and padding behavior.

Possible container types include:

```text
Narrow content

Standard page

Wide dashboard

Full-width workspace

Centered authentication
```

Pages should select an approved container instead of defining arbitrary maximum widths.

---

# Mobile Viewports

Mobile layouts should preserve the complete workflow.

They may adapt through:

* Stacked content
* Collapsed secondary information
* Drawers
* Bottom actions
* Simplified navigation
* Scrollable regions
* Progressive disclosure

Essential actions and information must not disappear without an accessible alternative.

---

# Tablet Viewports

Tablet layouts should not be treated as smaller desktop layouts by default.

They may require:

* Touch-sized controls
* Flexible sidebars
* Two-column arrangements
* Adaptive dialogs
* Reduced information density
* Alternative navigation behavior

Both portrait and landscape orientations should be considered.

---

# Desktop Viewports

Desktop layouts may introduce:

* Persistent side navigation
* Multiple columns
* Wider data tables
* Hover enhancements
* Expanded contextual information
* Keyboard shortcuts

Desktop enhancements must not create functionality that is unavailable to touch and keyboard users.

---

# Wide Screens

Very wide displays should not stretch ordinary content indefinitely.

The architecture should use:

* Maximum content widths
* Stable reading line lengths
* Structured dashboard grids
* Controlled data density
* Centered or anchored application regions

Large empty areas may be preferable to unreadably wide content.

---

# Orientation Changes

Responsive layouts should tolerate orientation changes without losing:

* Form state
* Scroll context where practical
* Dialog state
* Selected tabs
* Navigation state
* In-progress file workflows

Orientation changes should not cause application reinitialization.

---

# Viewport Height

Layouts should account for limited viewport height as well as width.

Important cases include:

* Mobile browser chrome
* Virtual keyboards
* Landscape phones
* Small laptop screens
* Installed PWA windows
* Split-screen environments

Critical actions should remain reachable without relying on fixed full-screen heights.

---

# Dynamic Viewport Units

Where full-height layouts are required, implementations should use modern dynamic viewport behavior or approved abstractions rather than assuming that `100vh` always represents the visible area.

This is particularly important for:

* Authentication pages
* Drawers
* Dialogs
* Full-screen editors
* Mobile navigation

---

# Safe Areas

Installed PWA and future mobile-wrapper layouts should support device safe areas.

Shared layout foundations should expose safe-area spacing for:

* Top insets
* Bottom gesture regions
* Display cutouts
* Edge-to-edge navigation
* Fixed action bars

Individual pages should not repeatedly access platform inset variables.

---

# Responsive Navigation

Navigation should adapt according to available space.

Possible patterns include:

```text
Persistent sidebar

Collapsible sidebar

Top navigation

Drawer

Bottom navigation
```

The selected pattern should preserve:

* Current location
* Navigation hierarchy
* Keyboard access
* Screen-reader meaning
* Touch target size
* Authorization filtering

Responsive navigation behavior must align with `navigation-overview.md`.

---

# Responsive Data Tables

Dense tables require deliberate small-screen behavior.

Possible strategies include:

* Horizontal scrolling
* Column prioritization
* Row-detail expansion
* Card representation
* Responsive column hiding
* Separate summary and detail views

The strategy should preserve data meaning and relationships.

A table should not simply shrink until text becomes unreadable.

---

# Horizontal Scrolling

Horizontal scrolling may be acceptable for inherently wide data.

When used:

* The scroll region should be clearly discoverable.
* Keyboard users must be able to access it.
* Sticky columns or headers should not obscure content.
* The page itself should avoid unintended horizontal overflow.
* Screen-reader table semantics should remain intact.

---

# Responsive Forms

Form layouts should normally begin as a single column.

Multi-column layouts may be introduced when:

* Fields have clear relationships.
* The reading order remains logical.
* Labels and errors have enough space.
* The layout remains usable with translated text.
* Keyboard navigation follows expected order.

Visual columns must not create an incorrect semantic or focus order.

---

# Fixed and Sticky Regions

Sticky headers, action bars, and navigation should be used carefully.

They should not:

* Cover focused elements
* Reduce the usable viewport excessively
* Obscure validation errors
* Trap scroll
* Conflict with mobile safe areas
* Prevent browser zoom

Sticky positioning should be tested with keyboard and screen-reader navigation.

---

# Responsive Overlays

Dialogs, popovers, drawers, and menus should adapt to available space.

Examples:

```text
Desktop dialog
    → Centered modal

Mobile dialog
    → Full-width or bottom sheet
```

Behavioral semantics should remain consistent even when visual presentation changes.

---

# Responsive Media

Images, video, charts, and embedded documents should:

* Fit available width
* Preserve useful aspect ratios
* Avoid page overflow
* Provide alternative text or descriptions
* Support zoom where necessary
* Avoid hiding essential labels

Charts may require alternate simplified presentations on narrow screens.

---

# Content Priority

Responsive layouts should distinguish:

* Primary content
* Secondary supporting content
* Optional decoration
* Contextual metadata

Removing content should be a deliberate product decision.

Content should not be hidden solely because implementation is difficult.

---

# Touch Interaction

All primary workflows should be usable with touch.

Touch requirements include:

* Adequate hit targets
* Sufficient spacing between actions
* No hover-only controls
* Avoidance of precision dragging where alternatives are possible
* Clear pressed and selected states
* Support for native scrolling and gestures

---

# Touch Target Size

Interactive elements should provide sufficiently large activation areas.

The visible icon or text may be smaller than the actual hit region.

Compact desktop layouts must not reduce touch targets below the approved accessibility standard.

---

# Hover Behavior

Hover may provide supplementary feedback on pointer devices.

It must not be required to:

* Reveal essential information
* Access a primary action
* Understand selected state
* Open required navigation
* Discover validation guidance

Equivalent focus, touch, or visible alternatives must exist.

---

# Pointer Precision

Interfaces should avoid requiring very precise pointer movement.

Examples to avoid include:

* Tiny resize handles without alternatives
* Narrow drag targets
* Closely spaced destructive controls
* Menus that collapse during small pointer movement
* Controls that depend on exact hover positioning

---

# Drag and Drop

Drag-and-drop interactions must provide an alternative.

Examples:

```text
Reorder by drag
    → Move up and move down actions

Upload by drop
    → File picker button

Board movement
    → Accessible action menu
```

Drag behavior should not be the only way to complete an action.

---

# Keyboard Accessibility

All interactive workflows must be usable with a keyboard.

Keyboard support includes:

* Logical tab order
* Visible focus
* Native activation behavior
* Overlay dismissal
* Accessible shortcuts
* No keyboard traps
* Predictable focus restoration

---

# Tab Order

Tab order should follow the logical reading and interaction sequence.

The architecture should rely on natural document order where possible.

Positive `tabindex` values should not be used to manually construct focus order.

---

# Focus Visibility

Focused interactive elements must have a clearly visible focus indicator.

Focus appearance should:

* Work in all themes
* Remain visible against surrounding surfaces
* Not depend solely on color
* Remain visible in high-contrast environments where possible
* Use shared design-system foundations

---

# Focus Management

Focus should be moved programmatically only when it improves orientation or is required by an interaction pattern.

Suitable examples include:

* Opening a dialog
* Closing a dialog and restoring trigger focus
* Navigating to an error summary
* Opening a navigation drawer
* Completing route-level navigation where focus reset is required

Unexpected focus movement should be avoided.

---

# Route Change Focus

Client-side navigation should define focus behavior.

A common strategy is:

```text
Route Changes

↓

Main Page Region Receives Focus

↓

Page Title Is Announced
```

The exact implementation should avoid disrupting preserved workflow state or browser-history behavior.

---

# Keyboard Traps

No component may trap keyboard focus unless it is an intentional modal interaction.

Modal traps must still support:

* Escape or explicit dismissal where allowed
* Focus restoration
* Accessible close controls
* Correct nested-overlay behavior

---

# Keyboard Shortcuts

Keyboard shortcuts may be provided for frequent workflows.

They should:

* Avoid conflict with browser and assistive-technology commands.
* Be discoverable.
* Have non-shortcut alternatives.
* Respect input and editor contexts.
* Be configurable where necessary.
* Not be the only method of performing an action.

---

# Semantic HTML

Native semantic elements should be used wherever possible.

Examples:

* `button` for actions
* `a` for navigation
* `nav` for navigation regions
* `main` for main content
* `header` and `footer` for structural regions
* `form` for forms
* `table` for tabular data
* `ul` and `ol` for lists
* Appropriate heading levels

Native semantics reduce the need for custom ARIA behavior.

---

# ARIA Usage

ARIA should supplement native semantics, not replace them unnecessarily.

ARIA attributes should be used when:

* Native elements cannot express the required relationship.
* A custom interaction follows an established accessible pattern.
* Dynamic state must be exposed.
* Descriptions, errors, or controls require explicit association.

Invalid or redundant ARIA can make an interface less accessible.

---

# Landmark Regions

Application layouts should provide meaningful landmarks such as:

```text
Banner

Navigation

Main

Complementary

Content information
```

Landmarks should not be duplicated excessively without accessible labels.

---

# Heading Structure

Pages should provide one clear primary heading.

Subsequent headings should reflect content hierarchy.

Heading levels should not be chosen only for visual size.

Visual typography should be applied separately from semantic heading level.

---

# Accessible Names

Every interactive control requires an accessible name.

Names may come from:

* Visible text
* Associated labels
* `aria-label`
* `aria-labelledby`

Visible labels are preferred where practical.

Icon-only controls must provide explicit accessible naming.

---

# Accessible Descriptions

Additional context may be provided through:

* Visible help text
* `aria-describedby`
* Status text
* Error relationships

Descriptions should add information rather than repeat the accessible name.

---

# Screen-Reader Announcements

Dynamic updates that materially affect the workflow should be announced.

Examples include:

* Form submission status
* Validation summary
* File upload completion
* Background save result
* Item added or removed
* Connection loss
* Session expiration
* Page-level loading completion

Announcements should be concise and should avoid repeating every minor visual change.

---

# Live Regions

Live regions should be centralized or carefully scoped.

Overuse can produce:

* Repeated announcements
* Interrupted speech
* Confusing ordering
* Notification noise

The notification and form systems should coordinate live-region usage.

---

# Hidden Content

Visually hidden content may be used for:

* Additional accessible labels
* Table context
* Clarifying status
* Skip-link targets

Content hidden from sighted users should still be meaningful and maintained.

Content should not be placed off-screen through fragile styling when a shared `VisuallyHidden` primitive exists.

---

# Skip Links

The authenticated and guest application shells should provide skip links where useful.

Common targets include:

* Main content
* Primary navigation
* Search
* Repeated data regions

Skip links should become visible when focused.

---

# Color and Meaning

Color must not be the only way to communicate:

* Error
* Success
* Selection
* Required state
* Trend direction
* Status
* Disabled state

Use combinations of:

* Text
* Icons
* Patterns
* Labels
* Position
* Shape
* Accessible descriptions

---

# Contrast

Text, icons, controls, borders, charts, and focus indicators should meet the application's adopted contrast requirements.

Contrast must be evaluated in:

* Light theme
* Dark theme
* Disabled states
* Hover states
* Selected states
* Error states
* High-contrast environments where supported

---

# Zoom and Text Scaling

The interface should remain usable when users zoom the browser or increase text size.

Requirements include:

* No blocked browser zoom
* No essential content clipping
* Reflow at high zoom
* Reachable controls
* Wrapping labels
* Scrollable regions where necessary

Fixed-height text containers should be avoided.

---

# Reduced Motion

The application must respect reduced-motion preferences.

Non-essential motion should be reduced or removed.

Essential state changes should remain understandable without movement.

Examples:

```text
Sliding panel
    → Instant or fade transition

Animated chart
    → Static final state

Auto-moving carousel
    → No automatic movement
```

---

# Audio and Media

Media should not autoplay with sound.

Controls should be keyboard accessible and clearly labeled.

Video content used for instruction should support captions or equivalent text.

Audio-only content should have a transcript when required.

---

# Timing and Session Limits

Time-limited workflows should:

* Explain the limit.
* Warn before expiration where practical.
* Allow extension when policy permits.
* Avoid losing unsaved work unnecessarily.
* Remain accessible to users who need more time.

Authentication expiration behavior is defined in the authentication documentation.

---

# Accessibility Ownership

Accessibility responsibilities should be distributed clearly.

| Layer             | Responsibility                              |
| ----------------- | ------------------------------------------- |
| Design system     | Accessible primitives and tokens            |
| Shared components | Interaction patterns and ARIA behavior      |
| Module components | Domain-specific labels and workflow context |
| Pages             | Heading structure and page-level focus      |
| Content resources | Clear translated text                       |
| Testing           | Verification across interaction modes       |

Consumers should not need to recreate accessibility behavior already owned by a shared component.

---

# Accessibility Standard

The project should define an explicit target accessibility standard.

At minimum, architecture and testing should align with a recognized modern accessibility level appropriate for public and authenticated web applications.

The selected version and conformance target should be recorded in project governance or quality documentation.

---

# Internationalization Architecture

Internationalization should be initialized as global runtime infrastructure.

```text
Locale Resolution

↓

Translation Resource Loading

↓

Formatting Configuration

↓

Localized Component Rendering
```

Pages and module components should consume the shared internationalization interface.

---

# Supported Languages

The list of supported languages should be defined centrally.

Each supported language should have:

* Stable locale identifier
* Display name
* Translation resource registration
* Formatting rules
* Fallback behavior
* Testing coverage

Modules should not maintain private supported-language lists.

---

# Locale Identifiers

Locales should use stable standardized identifiers.

Examples:

```text
en

en-US

sw

sw-TZ
```

The application should distinguish language from regional formatting when necessary.

A translation language may use one identifier while formatting uses a more specific locale.

---

# Initial Locale Resolution

The initial locale should follow a documented priority order.

Recommended sequence:

```text
Authenticated User Preference

↓

Persisted Application Preference

↓

Browser Preference

↓

Application Default
```

The selected locale should remain stable during startup to avoid visible language switching.

---

# Authenticated Language Preference

When a user has a persisted backend language preference:

* It should become authoritative after session restoration.
* The local preference may be synchronized.
* The change should apply without unnecessary full-page reload.
* The update should not clear unrelated application state.

Guest users may rely on local or browser preference.

---

# Language Switching

The language switcher should:

* Display available languages clearly.
* Use language names users can recognize.
* Be keyboard and screen-reader accessible.
* Persist the approved preference.
* Update document metadata.
* Refresh translations and formatting.
* Preserve the current workflow where possible.

Language changes should not navigate users away from their current task unless route localization requires it.

---

# Translation Resource Ownership

Translation resources should follow backend-aligned module ownership.

Recommended structure:

```text
src/
    locales/
        en/
            global.json
            identity.json
            workspace.json
            billing.json

        sw/
            global.json
            identity.json
            workspace.json
            billing.json
```

Alternatively, resources may be organized first by module if the internationalization tooling requires it, provided ownership remains explicit and consistent.

---

# Global Translation Resources

Global resources may include:

* Shared actions
* Navigation labels
* Generic statuses
* Validation messages
* Date and number labels
* Accessibility text
* Global notifications
* Error fallbacks

Module-specific business copy should remain in the owning module's translation resource.

---

# Translation Keys

Translation keys should describe semantic intent.

Prefer:

```text
workspace.members.invite.title

billing.invoice.status.paid

global.actions.cancel

validation.required
```

Avoid:

```text
text1

blueButtonLabel

workspaceString

message_27
```

Keys should remain stable even when wording changes.

---

# Translation Key Granularity

Keys should normally represent complete meaningful messages.

Avoid constructing sentences from several independently translated fragments.

Problematic:

```text
"Delete" + resourceName + "now?"
```

Preferred:

```text
workspace.deleteConfirmation
```

with named interpolation values.

This supports natural word order in each language.

---

# Interpolation

Dynamic values should use named interpolation variables.

Example:

```text
workspace.members.remaining
```

with values such as:

```text
count

workspaceName
```

Interpolation values should be escaped by default unless the rendering context explicitly requires otherwise.

---

# Pluralization

Pluralization must use the internationalization library's locale-aware rules.

Do not use manual checks such as:

```typescript
count === 1 ? "item" : "items"
```

Plural rules differ between languages and may include more than singular and plural.

---

# Gender and Grammatical Context

Where a supported language requires grammatical variation, translation resources should support the necessary context.

The frontend should not assume that names, roles, or objects can be inserted into one fixed sentence structure.

---

# Rich Text Translation

Translated content containing links, emphasis, or inline components should use an approved structured translation mechanism.

Raw translated HTML should not be rendered directly.

Translation resources should not contain executable markup.

---

# Default and Fallback Language

The application should define one default language and a documented fallback strategy.

Fallback behavior should:

* Prefer the requested locale.
* Fall back to the base language when appropriate.
* Fall back to the application default.
* Record missing-key diagnostics.
* Avoid exposing raw translation keys in production where possible.

---

# Missing Translation Behavior

Missing translation keys should be handled differently by environment.

Development may:

* Display the missing key.
* Emit warnings.
* Fail automated checks.

Production should:

* Use fallback content.
* Record diagnostics.
* Avoid breaking page rendering.

Missing translations must not silently remain undetected during release preparation.

---

# Translation Loading

Translation resources may be:

* Bundled
* Lazy loaded by module
* Loaded by locale
* Prefetched after startup

The strategy should balance:

* Startup performance
* Offline capability
* Bundle size
* Route-level code splitting
* Failure recovery

Core startup translations should be available before critical fallback interfaces render.

---

# Translation Loading Failure

A failed translation-resource request should not produce an unusable blank application.

Recovery may include:

* Cached resource use
* Fallback language
* Retry
* Safe default messages
* Startup failure only when no usable language resource exists

---

# Document Language

The root document language attribute should reflect the active locale.

Example:

```html
<html lang="sw">
```

It should update when the application language changes.

This improves pronunciation, navigation, and language interpretation for assistive technologies.

---

# Document Direction

The root document direction should reflect the active language.

Example:

```html
<html dir="ltr">
```

Future right-to-left support may require:

```html
<html dir="rtl">
```

Components should inherit direction rather than hard-code it locally unless mixed-direction content requires special handling.

---

# Right-to-Left Readiness

Even if current languages are left-to-right, architecture should avoid unnecessary direction assumptions.

Prefer logical CSS properties:

```text
margin-inline-start

padding-inline-end

border-block-start

inset-inline-end
```

Use semantic concepts such as:

```text
start

end

previous

next
```

rather than visual assumptions such as left and right.

---

# Directional Icons

Some icons may need mirroring in right-to-left layouts.

Examples:

* Back arrows
* Forward arrows
* Chevron navigation
* Previous and next controls

Other icons should not be mirrored.

Examples:

* Brand logos
* Media playback
* Clock faces
* Check marks

Mirroring policy should be centralized in the icon system.

---

# Mixed-Direction Content

User-entered content may contain text with a different direction from the active interface.

Components displaying identifiers, phone numbers, URLs, or mixed-language text should allow the browser's bidirectional algorithm to work correctly and may use explicit direction isolation where necessary.

---

# Text Expansion

All components should tolerate translated text that is substantially longer than the source-language text.

Design requirements include:

* Flexible widths
* Wrapping labels
* Multi-line buttons where approved
* Expandable navigation
* Responsive dialog actions
* Avoidance of text embedded in images
* Avoidance of fixed-height text containers

---

# Truncation and Localization

Truncation should not hide critical translated content.

Suitable truncation targets may include:

* Repeated identifiers
* Optional metadata
* Long filenames
* Secondary table values

Unsuitable targets include:

* Validation messages
* Required instructions
* Primary action labels
* Page headings
* Destructive-action consequences

Full content should be accessible where truncation is necessary.

---

# Localized Dates

Date formatting should use the shared localization utilities.

The frontend must distinguish:

* Date-only values
* Local date and time
* Absolute timestamps
* Relative time
* Time-zone-aware events

Hard-coded date patterns should be avoided.

---

# Time Zones

The application should define which time zone applies to each value.

Possible sources include:

* User time zone
* Workspace time zone
* Event-defined time zone
* Backend UTC timestamp
* Device time zone

The UI should label time zones when ambiguity would affect user decisions.

---

# Relative Time

Relative time such as “two hours ago” may improve readability.

It should:

* Use locale-aware formatting.
* Update at a reasonable interval.
* Provide an exact time where important.
* Avoid ambiguity for legal, financial, or scheduled events.
* Remain stable enough for screen-reader users.

---

# Localized Numbers

Number formatting should use locale-aware utilities.

This includes:

* Decimal separators
* Thousands separators
* Percentages
* Compact notation
* Signed values
* Measurement values

Formatted strings should not be parsed back into numbers without an approved locale-aware parser.

---

# Currency Formatting

Currency display should include an explicit currency code or known currency context.

The application should not assume that the active locale determines the business currency.

Formatting should distinguish:

```text
Locale
    → How the amount is displayed

Currency code
    → Which currency the amount represents
```

---

# Measurement Units

Where measurements are used, the application should define whether units are:

* Fixed by domain
* Selected by user
* Determined by locale
* Converted for display

The source value and display unit should remain explicit.

---

# Names and Addresses

Forms should avoid assumptions that all names and addresses follow one cultural structure.

Avoid requiring:

* Exactly two names
* One fixed address format
* One postal-code pattern
* One phone-number length
* One title convention

Field requirements should be based on actual backend and business needs.

---

# Phone Numbers

Phone inputs should separate:

* Country or calling code
* Editable value
* Display formatting
* Normalized backend representation

Validation should not assume one national pattern unless the workflow is explicitly country-specific.

---

# Search and Sorting

Localized content may affect:

* Case folding
* Accent handling
* Collation
* Alphabetical sorting
* Search tokenization

Where backend search or sorting is authoritative, the frontend should not apply conflicting local rules.

---

# Localized Backend Content

Some backend resources may contain localized fields.

The API contract should define whether the backend returns:

* One value in the requested locale
* All locale variants
* A fallback value
* A translation identifier

Frontend components should not guess how to select localized backend content.

---

# Locale Request Headers

The shared API client may include an approved locale header.

Example:

```text
Accept-Language
```

The header should reflect the active locale and remain part of shared API-client behavior.

Services and pages should not manually set locale headers per request.

---

# Localized Errors

Backend error codes should be mapped to frontend translation keys.

The frontend should avoid displaying raw backend message strings unless the contract explicitly guarantees safe localized content.

Example:

```text
WORKSPACE_NAME_REQUIRED

↓

validation.workspaceNameRequired
```

---

# Localized Validation

Validation schemas should expose stable codes or translation keys rather than hard-coded language text.

Dynamic constraints should be supplied as parameters.

Example:

```text
validation.maxLength
    count: 100
```

---

# Localized Notifications

Notifications should use translation resources at the presentation boundary.

Where notifications are queued across a language change, the architecture should decide whether to:

* Store the translated message
* Store the translation key and parameters
* Dismiss old notifications

Storing message keys and parameters generally allows consistent rendering in the active language.

---

# Localized Routes

The application should decide explicitly whether routes include locale segments.

Possible approaches include:

```text
/settings

/en/settings

/sw/settings
```

The selected strategy should remain consistent and align with routing, sharing, SEO, and authenticated-app requirements.

Locale-specific routes should not be introduced accidentally by individual modules.

---

# Content Writing Guidelines

User-facing content should be:

* Clear
* Direct
* Specific
* Actionable
* Consistent
* Easy to translate
* Free from unnecessary idioms

Avoid:

* Cultural references without context
* Wordplay required for comprehension
* Ambiguous pronouns
* Sentences assembled from fragments
* Excessively long button labels
* Technical error language

---

# Accessibility Text Localization

Accessible names, descriptions, live announcements, and hidden helper text must also be translated.

Visible translation coverage alone is insufficient.

Examples include:

* Icon-button labels
* Dialog descriptions
* Loading announcements
* Table sort states
* Pagination labels
* File upload status

---

# Placeholder Text

Placeholder text should not replace visible labels.

When used, placeholders should:

* Provide examples rather than essential instructions.
* Remain translated.
* Avoid sensitive example data.
* Disappear without removing the field's meaning.
* Remain readable in supported themes.

---

# Images and Localization

Important text should not be embedded in images.

Localized visual assets may be used when necessary, but they increase maintenance cost and should have:

* Clear ownership
* Locale mapping
* Fallback behavior
* Alternative text
* Theme variants where required

---

# Icons and Cultural Meaning

Icons should be reviewed for cultural clarity.

An icon that is common in one context may be confusing or inappropriate in another.

Text labels should accompany ambiguous icons.

---

# Accessibility and Internationalization Interaction

Accessibility content must be tested in every supported language.

Examples:

* Screen-reader pronunciation
* Error announcement order
* Long accessible names
* Localized keyboard instructions
* Pluralized status updates
* Mixed-direction identifiers

A component that passes accessibility testing in one language may fail in another due to content length or wording.

---

# Responsive and Internationalization Interaction

Responsive layouts should be tested using realistic long translations.

Tests should include:

* Long navigation labels
* Multi-line headings
* Expanded validation messages
* Long table headers
* Long action labels
* Localized date strings
* Localized currency values
* Pluralized content

Placeholder English text is insufficient for responsive verification.

---

# Responsive and Accessibility Interaction

Responsive adaptation must preserve semantic and keyboard order.

For example, a desktop two-column form may visually rearrange on mobile.

The DOM order should support the mobile reading sequence unless another accessible strategy is explicitly implemented.

CSS visual reordering should not create a mismatch between visual and focus order.

---

# Component Requirements

Every reusable component should document:

* Minimum supported width
* Wrapping and overflow behavior
* Keyboard interaction
* Focus behavior
* Accessible name requirements
* Screen-reader behavior
* Long-text behavior
* Directionality behavior
* Theme compatibility
* Reduced-motion behavior

---

# Page Requirements

Every page should define:

* Primary heading
* Main landmark
* Responsive layout behavior
* Mobile action placement
* Loading announcement
* Error behavior
* Empty state
* Route-change focus behavior
* Translation namespace ownership

---

# Module Ownership

Accessibility and internationalization resources should follow the responsibility-first structure.

Recommended placement:

```text
src/
    components/
        global/
        identity/
        workspace/
        billing/

    hooks/
        global/
            useLocale.ts
            useMediaQuery.ts
            useReducedMotion.ts

    styles/
        global/
            responsive/
            accessibility/
            direction/

        identity/
        workspace/
        billing/

    types/
        global/
            accessibility.ts
            i18n.ts

    locales/
        en/
        sw/
```

Module-specific accessibility helpers should remain under the owning technical responsibility and backend-aligned module.

---

# Shared Responsive Utilities

Global responsive infrastructure may include:

* Breakpoint tokens
* Container primitives
* Responsive visibility utilities
* Safe-area helpers
* Scroll-region helpers
* Layout hooks where CSS cannot solve the requirement
* Viewport capability utilities

JavaScript viewport detection should not replace CSS layout behavior unnecessarily.

---

# Media Query Hooks

Hooks such as `useMediaQuery` should be used only when application behavior—not merely styling—must change.

Suitable examples include:

* Selecting a different interaction model
* Changing expensive chart rendering
* Controlling portal placement
* Deferring large resources

Purely visual changes should remain in CSS.

---

# Server Rendering and Hydration Readiness

Responsive and locale logic should avoid hydration mismatches.

Avoid:

* Reading viewport size during module initialization
* Rendering one language on the server and another immediately on the client
* Depending on browser-only locale APIs before runtime initialization
* Producing unstable IDs or accessibility relationships

Fallback behavior should remain deterministic.

---

# PWA Requirements

Installed PWA behavior should account for:

* Standalone display mode
* Safe-area insets
* Offline translations
* Touch-first navigation
* Application update messages
* Narrow windows
* Orientation changes
* Limited browser chrome

Core translation resources should remain available offline where required by the PWA strategy.

---

# Future Mobile Readiness

Future mobile wrappers may provide platform-specific implementations for:

* Locale detection
* Safe-area values
* Text scaling
* Screen-reader status
* Orientation
* Native navigation
* Keyboard visibility
* Haptic feedback

Pages and module components should consume stable frontend abstractions rather than direct platform APIs.

---

# Performance

Responsive and internationalization systems should minimize:

* Duplicate translation bundles
* Loading all locales at startup
* Excessive global rerenders on resize
* Continuous viewport measurement
* Reformatting large datasets unnecessarily
* Recreating formatters repeatedly

Shared formatter instances or memoized formatter factories may be used where beneficial.

---

# Translation Bundle Performance

Translation resources should support route- or module-level loading where appropriate.

Core global messages should remain immediately available.

The loading strategy must not cause untranslated interface flashes.

---

# Accessibility Performance

Accessibility must not be removed for performance reasons without an equivalent solution.

Examples:

* Virtualized lists still require accessible navigation.
* Lazy content must announce loading and completion.
* Charts need accessible summaries.
* Infinite scroll needs alternative navigation or clear structure.

---

# Observability

Technical observability may track:

* Missing translation keys
* Translation loading failures
* Locale-resolution failures
* Layout overflow defects
* Accessibility test failures
* Unsupported-locale requests
* Directionality defects

Telemetry should not include private user-entered content.

---

# Analytics

Product analytics may record language and display-mode categories where permitted.

Examples:

```text
language_changed

navigation_drawer_opened

accessibility_preference_applied
```

Analytics should not attempt to infer disability or sensitive personal attributes.

---

# Governance

Accessibility and localization should be included in:

* Design review
* Architecture review
* Component review
* Pull-request review
* Release testing
* Content review
* Regression testing

They should not depend on one final audit before release.

---

# Definition of Done

A frontend change is not complete until applicable responsive, accessibility, and localization requirements are satisfied.

At minimum, implementation review should confirm:

* Narrow-screen usability
* Keyboard operation
* Visible focus
* Correct semantics
* Supported-language rendering
* Text expansion
* Localized formatting
* Error and loading announcements
* Theme contrast
* Reduced-motion behavior

---

# Testing Requirements

## Responsive Tests

Test:

* Narrow mobile viewport
* Large mobile viewport
* Tablet portrait
* Tablet landscape
* Standard desktop
* Wide desktop
* Short viewport height
* High browser zoom
* Orientation change
* Installed PWA window

Tests should cover intermediate widths, not only predefined breakpoint snapshots.

## Keyboard Tests

Test:

* Logical tab order
* Action activation
* Overlay opening and closing
* Focus trapping
* Focus restoration
* Skip links
* Navigation drawers
* Menus, tabs, and dialogs
* Route-change focus
* No keyboard traps

## Screen-Reader Tests

Test:

* Landmarks
* Heading structure
* Accessible names
* Descriptions
* Error announcements
* Loading states
* Dynamic content updates
* Table semantics
* Form associations
* Dialog relationships

Automated checks should be supplemented by manual assistive-technology testing for critical workflows.

## Visual Accessibility Tests

Test:

* Light-theme contrast
* Dark-theme contrast
* Focus visibility
* Selected states
* Disabled states
* Error states
* High zoom
* Text scaling
* Reduced motion
* Color-independent meaning

## Internationalization Tests

Test:

* Every supported locale
* Missing keys
* Fallback language
* Pluralization
* Interpolation
* Date formatting
* Time-zone formatting
* Number formatting
* Currency formatting
* Long translations
* Language switching
* Document language updates
* Locale request headers

## Directionality Tests

Even before a right-to-left language is officially supported, selected shared components should be tested with simulated RTL direction.

Test:

* Logical spacing
* Navigation order
* Directional icons
* Dialog alignment
* Forms
* Tables
* Overlays
* Mixed-direction content

## Integration Tests

Test:

* Session-based language restoration
* Guest locale resolution
* Language switching during an active workflow
* Responsive navigation with authorization
* Form validation in both languages
* Notifications after language changes
* Offline translation availability
* Route focus behavior
* PWA safe-area layouts

## End-to-End Tests

Test critical workflows using combinations such as:

```text
Mobile + touch + Swahili

Desktop + keyboard + English

High zoom + keyboard + Swahili

Installed PWA + offline + English

Dark theme + reduced motion + keyboard
```

Testing combinations provides better coverage than treating each requirement independently.

---

# Acceptance Criteria

The responsive, accessibility, and internationalization architecture is complete when:

* The frontend uses a documented mobile-first responsive strategy.
* Breakpoints, containers, and safe-area behavior are centralized.
* Essential workflows remain complete across supported viewport sizes.
* Touch, pointer, keyboard, and assistive-technology interaction are supported.
* Shared components provide semantic HTML, focus behavior, and accessible naming.
* Route changes, errors, loading states, and dynamic updates have defined announcement behavior.
* Contrast, zoom, text scaling, and reduced-motion requirements are documented and tested.
* Supported languages, locale identifiers, and fallback rules are centrally defined.
* Translation resources use explicit global and backend-aligned module ownership.
* Translation keys are stable, semantic, and designed for complete messages.
* Dates, times, numbers, currencies, and plurals use locale-aware formatting.
* Components tolerate long translated content without clipping or workflow loss.
* Document language and direction update with the active locale.
* Logical CSS properties and centralized icon behavior provide future RTL readiness.
* Accessibility and localization are included in implementation review and definition-of-done requirements.
* Automated and manual tests cover responsive, accessible, bilingual, PWA, and future-mobile scenarios.

---

# Architecture Rules

1. Every page and shared component must be designed mobile-first and remain usable across narrow, intermediate, and wide layouts.
2. Breakpoints, page containers, safe-area spacing, and responsive utilities must be centrally defined.
3. Responsive adaptation must preserve the complete workflow and must not remove essential content or actions without an accessible alternative.
4. Purely visual responsive behavior should use CSS; JavaScript viewport logic should be reserved for actual behavioral changes.
5. Visual reordering must not create a mismatch between reading order, focus order, and interaction order.
6. Every interactive workflow must support keyboard operation, visible focus, touch input, and non-hover access.
7. Native semantic HTML must be preferred over custom ARIA-based replacements.
8. Accessible names, descriptions, states, focus behavior, and live announcements must be owned by the narrowest reusable layer capable of implementing them consistently.
9. Color, position, animation, hover, or sound must never be the only way important meaning is communicated.
10. The application must support browser zoom, text scaling, reduced motion, sufficient contrast, and high-content-density recovery.
11. Supported languages, locale resolution, fallback behavior, and document metadata must be managed by the global internationalization runtime.
12. Translation resources must use stable semantic keys and backend-aligned module ownership.
13. User-facing sentences must be translated as complete messages rather than assembled from translated fragments.
14. Plurals, dates, times, numbers, currencies, and measurements must use locale-aware utilities rather than manual formatting.
15. Validation messages, notifications, accessible labels, hidden helper text, and status announcements must be translated alongside visible content.
16. Components must tolerate text expansion, multi-line labels, localized formatting, and mixed-direction content.
17. Logical CSS properties must be preferred over hard-coded left and right positioning when the intended meaning is start and end.
18. Locale headers and localized backend-content selection must be centralized in shared API and service infrastructure.
19. Accessibility, responsiveness, and localization must be tested together in realistic workflow combinations.
20. No frontend feature is complete until applicable responsive, accessibility, bilingual, PWA, and future-mobile requirements have been verified.
