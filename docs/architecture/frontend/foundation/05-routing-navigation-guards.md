# TEED Frontend Foundation

## Part 4 — Routing, Layouts, Session Guards, Navigation, and Page Infrastructure

---

# Purpose

This section defines the frontend routing and navigation foundation for TEED.

It establishes:

* Route configuration
* Central route constants
* Route metadata
* Public routes
* Authentication routes
* Protected routes
* Permission-protected routes
* Session restoration behavior
* Public and authenticated layouts
* Navigation configuration
* Breadcrumb architecture
* Page titles and metadata
* Not-found routes
* Offline routes
* Application-error routes
* Route-level loading behavior
* Route testing

The objective is to ensure that all frontend modules use one predictable routing system rather than implementing independent navigation and authorization patterns.

---

# Routing Objectives

The routing foundation should provide:

* Central route definitions
* Typed route paths
* Consistent layouts
* Session-aware navigation
* Permission-aware presentation
* Predictable redirects
* Lazy-loaded pages
* Accessible route transitions
* URL-state compatibility
* Internationalized page metadata
* Deep-link compatibility
* PWA navigation support
* Future mobile-wrapper compatibility

Routing should remain understandable as the number of modules grows.

---

# Routing Technology

TEED should use React Router as the standard client-side router.

The router should support:

* Nested routes
* Layout routes
* Route parameters
* Search parameters
* Redirects
* Lazy-loaded pages
* Error elements
* Protected route composition
* Deep linking
* Browser history
* Future route-level data integration where appropriate

The exact React Router API should follow the version installed in the project.

---

# Route Architecture

The routing flow should be:

```text
Browser URL
    │
    ▼
Application Router
    │
    ├── Public Route
    │       └── Public Layout
    │
    ├── Authentication Route
    │       └── Identity Layout
    │
    ├── Protected Route
    │       ├── Session Guard
    │       └── Authenticated Layout
    │
    ├── Permission Route
    │       ├── Session Guard
    │       ├── Permission Guard
    │       └── Module Layout
    │
    └── Unknown Route
            └── Not Found Page
```

---

# Recommended Routing Structure

```text
src/
├── app/
│   ├── router.tsx
│   ├── routes.tsx
│   ├── route-paths.ts
│   ├── route.types.ts
│   ├── route-metadata.ts
│   └── navigation.ts
│
├── layouts/
│   ├── global/
│   ├── identity/
│   ├── business/
│   ├── workspace/
│   └── billing/
│
├── pages/
│   ├── global/
│   ├── identity/
│   ├── business/
│   ├── workspace/
│   └── billing/
│
└── global/
    ├── components/
    │   └── navigation/
    ├── guards/
    ├── hooks/
    └── types/
```

Recommended guard files:

```text
src/global/guards/
├── session-guard.tsx
├── guest-guard.tsx
├── permission-guard.tsx
└── feature-flag-guard.tsx
```

---

# Route Path Constants

Route paths should be centralized.

Recommended location:

```text
src/app/route-paths.ts
```

Example:

```typescript
export const ROUTE_PATHS = {
  home: "/",

  identity: {
    login: "/login",
    register: "/register",
    verify: "/verify",
    forgotPassword: "/forgot-password",
    resetPassword: "/reset-password",
  },

  business: {
    root: "/business",
    profile: "/business/profile",
    onboarding: "/business/onboarding",
  },

  workspace: {
    root: "/workspaces",
    create: "/workspaces/create",
    detail: "/workspaces/:workspaceId",
    settings: "/workspaces/:workspaceId/settings",
    members: "/workspaces/:workspaceId/members",
  },

  billing: {
    root: "/billing",
    invoices: "/billing/invoices",
    invoiceDetail: "/billing/invoices/:invoiceId",
  },

  global: {
    offline: "/offline",
    error: "/error",
    accessDenied: "/access-denied",
    maintenance: "/maintenance",
    unsupportedVersion: "/unsupported-version",
  },
} as const;
```

Route strings should not be duplicated throughout pages or components.

---

# Route Builder Functions

Dynamic routes should use route builders.

Example:

```typescript
export const buildRoute = {
  workspaceDetail(
    workspaceId: string,
  ): string {
    return `/workspaces/${encodeURIComponent(
      workspaceId,
    )}`;
  },

  workspaceSettings(
    workspaceId: string,
  ): string {
    return `/workspaces/${encodeURIComponent(
      workspaceId,
    )}/settings`;
  },

  invoiceDetail(
    invoiceId: string,
  ): string {
    return `/billing/invoices/${encodeURIComponent(
      invoiceId,
    )}`;
  },
} as const;
```

Components should not manually interpolate dynamic URLs repeatedly.

---

# Route Parameter Types

Route parameters should be typed where practical.

Example:

```typescript
export interface WorkspaceRouteParams {
  workspaceId: string;
}

export interface InvoiceRouteParams {
  invoiceId: string;
}
```

Pages should validate route parameters before using them in API calls.

A parameter existing in the URL does not guarantee it is valid.

---

# Route Parameter Validation

Route parameters should be validated for:

* Presence
* Expected format
* Supported length
* Identifier structure
* Safe decoding

Example:

```typescript
const workspaceIdSchema = z
  .string()
  .uuid();

const parsedWorkspaceId =
  workspaceIdSchema.safeParse(
    params.workspaceId,
  );
```

If validation fails, the route should render a controlled not-found or invalid-request state.

The frontend should not send malformed identifiers to the backend unnecessarily.

---

# Search Parameter Architecture

Search parameters should be used for shareable and restorable state.

Examples include:

* Pagination
* Search terms
* Filters
* Sort order
* Selected tabs
* Date ranges
* Report configuration

Example URL:

```text
/workspaces?page=2&search=retail&status=active
```

Search parameter parsing should be centralized per page or module.

---

# Search Parameter Schemas

Zod may be used to parse search parameters.

Example:

```typescript
export const workspaceSearchSchema =
  z.object({
    page: z.coerce
      .number()
      .int()
      .positive()
      .default(1),

    search: z
      .string()
      .trim()
      .optional(),

    status: z
      .enum([
        "active",
        "inactive",
      ])
      .optional(),
  });
```

Invalid values should fall back safely or produce a controlled validation state.

---

# Sensitive URL Data

URLs should not contain:

* Passwords
* Access credentials
* Refresh credentials
* Sensitive personal data
* Private payment information
* Confidential business content
* Long-lived secrets

Verification and password-reset tokens may be used only when required by backend flows and should follow the frontend security standard.

---

# Route Definitions

The route tree should be composed centrally.

Recommended location:

```text
src/app/routes.tsx
```

Conceptual structure:

```tsx
export const routes = [
  {
    element: <PublicLayout />,
    children: publicRoutes,
  },
  {
    element: (
      <GuestGuard>
        <IdentityLayout />
      </GuestGuard>
    ),
    children: identityRoutes,
  },
  {
    element: (
      <SessionGuard>
        <AuthenticatedLayout />
      </SessionGuard>
    ),
    children: protectedRoutes,
  },
];
```

Module routes may be defined separately and combined centrally.

---

# Module Route Files

As route volume grows, modules may define their own route collections.

Example:

```text
src/app/routes/
├── global.routes.tsx
├── identity.routes.tsx
├── business.routes.tsx
├── workspace.routes.tsx
└── billing.routes.tsx
```

The root route file should compose these collections.

Module route definitions should remain routing configuration, not business logic.

---

# Route Type

A route metadata type may include:

```typescript
export interface ApplicationRoute {
  path?: string;
  index?: boolean;
  element: React.ReactNode;
  children?: ApplicationRoute[];

  metadata?: RouteMetadata;
}
```

If React Router’s native route-object type is sufficient, it should be extended carefully rather than replaced entirely.

---

# Route Metadata

Route metadata may define:

```typescript
export interface RouteMetadata {
  titleKey?: string;
  descriptionKey?: string;
  requiresSession?: boolean;
  requiredPermissions?: readonly string[];
  navigationKey?: string;
  breadcrumbKey?: string;
  featureFlag?: string;
}
```

Metadata can support:

* Page titles
* Breadcrumbs
* Navigation activation
* Permission guards
* Feature flags
* Analytics
* Documentation

Metadata should not become a hidden location for business behavior.

---

# Public Routes

Public routes are available without an authenticated session.

Examples may include:

```text
/
 /about
 /help
 /status
 /legal/privacy
 /legal/terms
```

Public routes should use a public layout.

Public routes should not expose protected business data.

---

# Authentication Routes

Authentication routes may include:

```text
/login
/register
/verify
/forgot-password
/reset-password
```

These routes should normally use the identity layout.

Authenticated users may be redirected away from selected guest-only routes.

---

# Guest Guard

A guest guard prevents authenticated users from accessing routes intended only for unauthenticated users.

Example:

```tsx
export function GuestGuard({
  children,
}: PropsWithChildren) {
  const session = useSession();

  if (
    session.status === "initializing" ||
    session.status === "refreshing"
  ) {
    return <SessionLoadingScreen />;
  }

  if (
    session.status === "authenticated"
  ) {
    return (
      <Navigate
        to={ROUTE_PATHS.workspace.root}
        replace
      />
    );
  }

  return children;
}
```

The default redirect should reflect TEED’s product flow.

---

# Guest Guard Exceptions

Not every identity-related page must redirect authenticated users.

Examples may include:

* Email verification status
* Account recovery completion
* Invitation acceptance
* Device authorization
* Session-expired explanation

Guest-only behavior should be defined per route rather than assumed for the entire identity module.

---

# Protected Routes

Protected routes require an authenticated session.

Examples include:

```text
/business/profile
/workspaces
/billing
/products
/orders
```

Protected routes should pass through the session guard.

---

# Session Guard

The session guard should evaluate explicit session status.

Conceptual behavior:

```text
initializing
    → session loading screen

refreshing
    → session loading or preserved protected screen

authenticated
    → render route

unauthenticated
    → redirect to login

expired
    → redirect to login with safe message

error
    → render session error state
```

Example:

```tsx
export function SessionGuard({
  children,
}: PropsWithChildren) {
  const session = useSession();
  const location = useLocation();

  if (
    session.status === "initializing" ||
    session.status === "refreshing"
  ) {
    return <SessionLoadingScreen />;
  }

  if (
    session.status === "unauthenticated" ||
    session.status === "expired"
  ) {
    return (
      <Navigate
        to={ROUTE_PATHS.identity.login}
        state={{
          returnTo:
            createSafeReturnLocation(
              location,
            ),
        }}
        replace
      />
    );
  }

  if (session.status === "error") {
    return <SessionErrorPage />;
  }

  return children;
}
```

---

# Session Restoration and Routing

The router should not redirect protected routes before session restoration completes.

Incorrect behavior:

```text
Application starts
    → user temporarily appears unauthenticated
    → redirected to login
    → session restores
    → redirected back
```

Correct behavior:

```text
Application starts
    → session status is initializing
    → loading screen
    → session restoration completes
    → protected route or login renders
```

This avoids redirect flashing.

---

# Intended Destination

When a user is redirected to login, the frontend may preserve the intended internal destination.

Example:

```text
User opens:
    /workspaces/123/settings

Session is missing:
    redirect to /login

After login:
    return to /workspaces/123/settings
```

The destination must be validated.

---

# Safe Return Location

A return destination should:

* Be internal
* Use an approved path
* Exclude unsupported protocols
* Exclude external hosts
* Avoid sensitive query data
* Avoid redirect loops

Example helper:

```typescript
export function isSafeInternalPath(
  value: unknown,
): value is string {
  return (
    typeof value === "string" &&
    value.startsWith("/") &&
    !value.startsWith("//")
  );
}
```

More robust validation may be required.

---

# Permission-Protected Routes

Some routes require specific permissions.

Example:

```text
/workspaces/:workspaceId/members
    requires:
    workspace.member.view
```

A permission guard should render only after authentication is confirmed.

---

# Permission Guard

Example interface:

```typescript
export interface PermissionGuardProps {
  permissions: readonly string[];
  mode?: "all" | "any";
  fallback?: React.ReactNode;
  children: React.ReactNode;
}
```

Conceptual implementation:

```tsx
export function PermissionGuard({
  permissions,
  mode = "all",
  fallback = <AccessDeniedPage />,
  children,
}: PermissionGuardProps) {
  const { canAll, canAny } =
    usePermission();

  const allowed =
    mode === "all"
      ? canAll(permissions)
      : canAny(permissions);

  if (!allowed) {
    return fallback;
  }

  return children;
}
```

The backend must still enforce the permission.

---

# Permission Route Metadata

Permission requirements may be placed in route metadata.

Example:

```typescript
{
  path:
    ROUTE_PATHS.workspace.members,
  element:
    <WorkspaceMembersPage />,
  metadata: {
    requiredPermissions: [
      "workspace.member.view",
    ],
  },
}
```

A route-building helper may wrap the route with the appropriate guard.

This should remain transparent enough for developers to understand which guard applies.

---

# Access Denied Behavior

When a user lacks permission, the interface should:

* Avoid rendering protected content
* Explain that access is unavailable
* Provide a safe navigation action
* Avoid revealing unnecessary resource details
* Avoid repeated permission requests
* Report no sensitive backend information

Possible outcomes include:

```text
Dedicated access-denied page
Inline access-denied state
Redirect to nearest allowed route
```

The selected behavior should depend on context.

---

# Resource-Level Authorization

A user may have a general permission but still lack access to a specific resource.

Example:

```text
User has workspace.view
but cannot access workspace 123
```

The frontend should rely on the backend response.

A route guard based on general permissions cannot prove resource ownership or tenant access.

The resulting backend response may be presented as:

* Not found
* Access denied
* Resource unavailable

The backend security contract determines the correct disclosure behavior.

---

# Feature Flag Guard

Feature flags may control whether a route is available.

Example:

```tsx
<FeatureFlagGuard
  flag="billingV2"
>
  <BillingPage />
</FeatureFlagGuard>
```

Feature flags should not replace permissions.

A route may require both:

```text
Feature enabled
AND
User authorized
```

---

# Route Guard Order

Recommended evaluation order:

```text
1. Application-level availability
2. Session restoration
3. Authentication
4. Feature availability
5. General permission
6. Page or resource request
7. Resource-level backend authorization
```

This order avoids unnecessary protected requests.

---

# Route-Level Lazy Loading

Pages should be lazy-loaded where practical.

Example:

```typescript
const WorkspaceListPage = lazy(
  () =>
    import(
      "@/pages/workspace/workspace-list.page"
    ),
);
```

Route-level lazy loading reduces initial bundle size.

Core shell and immediate authentication infrastructure may remain eagerly loaded.

---

# Suspense Boundaries

Lazy-loaded routes should use a consistent loading fallback.

Example:

```tsx
<Suspense fallback={<RouteLoader />}>
  <Outlet />
</Suspense>
```

The fallback should:

* Be accessible
* Avoid layout shifts
* Match the route scope
* Work in both themes
* Support translated text

---

# Route Error Boundaries

Routes should support controlled error handling.

Possible route errors include:

* Lazy-load failures
* Unexpected page rendering errors
* Route data errors
* Invalid parameters
* Unsupported route configuration

A route-level boundary may render:

* Retry action
* Return navigation
* Request reference
* Safe reload option

Expected API errors should remain page-level states.

---

# Layout Architecture

Layouts define persistent page structure.

Recommended layout categories:

```text
Public Layout
Identity Layout
Authenticated Layout
Module Layout
Focused Workflow Layout
```

Layouts should not own business data unless the data is genuinely shared across the entire layout.

---

# Public Layout

The public layout may contain:

* Public header
* Public navigation
* Language selector
* Theme selector
* Main content
* Footer
* Global messages
* Offline indicator

Recommended location:

```text
src/layouts/global/public-layout.tsx
```

---

# Identity Layout

The identity layout may contain:

* TEED branding
* Language selector
* Theme selector
* Authentication content container
* Help or support link
* Legal links
* Global messages

Recommended location:

```text
src/layouts/identity/identity-layout.tsx
```

It should remain simple and responsive.

---

# Authenticated Layout

The authenticated layout may contain:

* Application header
* Sidebar
* Mobile navigation
* User menu
* Workspace selector
* Main content
* Breadcrumb region
* Message region
* Offline indicator
* PWA update indicator

Recommended location:

```text
src/layouts/global/authenticated-layout.tsx
```

---

# Module Layouts

Module layouts may provide module-specific navigation or context.

Examples:

```text
Business layout
Workspace layout
Billing layout
Product-management layout
```

Recommended locations:

```text
src/layouts/business/
src/layouts/workspace/
src/layouts/billing/
```

A module layout may compose the authenticated layout rather than duplicate it.

---

# Layout Composition

Example:

```tsx
<AuthenticatedLayout>
  <WorkspaceLayout>
    <Outlet />
  </WorkspaceLayout>
</AuthenticatedLayout>
```

Nested layouts should each have a clear responsibility.

Avoid deeply nested layouts where the resulting structure becomes difficult to reason about.

---

# Layout Responsibilities

Layouts may manage:

* Page shell
* Navigation placement
* Responsive structure
* Persistent module navigation
* Main content container
* Shared headings
* Shared non-sensitive context selectors

Layouts should not manage:

* Form submission
* Module mutations
* Resource update logic
* Arbitrary page-specific API requests
* Backend authorization

---

# Outlet Usage

Nested routes should render through `Outlet`.

Example:

```tsx
export function WorkspaceLayout() {
  return (
    <div className="workspace-layout">
      <WorkspaceNavigation />

      <main id="main-content">
        <Outlet />
      </main>
    </div>
  );
}
```

Layouts should not manually choose page components based on the current path.

---

# Main Content Region

Each rendered page structure should contain one primary `main` region.

The main region should:

* Have a stable identifier
* Receive route focus where appropriate
* Work with the skip link
* Contain the current page content

Example:

```tsx
<main
  id="main-content"
  tabIndex={-1}
>
  <Outlet />
</main>
```

---

# Route Transition Focus

After meaningful route navigation, focus should move to:

```text
Page heading
or
Main content region
```

This helps keyboard and screen-reader users understand that navigation completed.

Focus should not be moved during search-parameter updates that only change table filters unless the interaction requires it.

---

# Scroll Restoration

The router should define scroll behavior.

Possible rules:

```text
New page navigation
    → scroll to top

Browser back
    → restore previous position

Filter or pagination change
    → preserve table context where useful

Anchor navigation
    → scroll to target
```

Scroll behavior should be consistent and tested on mobile.

---

# Navigation Configuration

Navigation should be configuration-driven where practical.

Recommended location:

```text
src/app/navigation.ts
```

Example:

```typescript
export interface NavigationItem {
  key: string;
  labelKey: string;
  route: string;
  icon?: React.ComponentType;
  requiredPermissions?: readonly string[];
  featureFlag?: string;
  children?: NavigationItem[];
}
```

---

# Navigation Example

```typescript
export const primaryNavigation:
  readonly NavigationItem[] = [
    {
      key: "workspaces",
      labelKey:
        "navigation.workspaces",
      route:
        ROUTE_PATHS.workspace.root,
      requiredPermissions: [
        "workspace.view",
      ],
    },
    {
      key: "billing",
      labelKey:
        "navigation.billing",
      route:
        ROUTE_PATHS.billing.root,
      requiredPermissions: [
        "billing.view",
      ],
    },
  ];
```

The navigation renderer should filter items based on feature availability and presentation permissions.

---

# Navigation Permission Filtering

Navigation items that the user cannot access should normally be hidden.

However, disabled presentation may be appropriate when:

* The user should know the feature exists
* Access can be requested
* A subscription upgrade is available
* The product requires discoverability

The selected behavior should be explicit.

The frontend must not reveal sensitive resource names through unavailable navigation.

---

# Active Navigation State

Navigation should indicate the active route.

Matching should account for nested routes.

Example:

```text
/workspaces
/workspaces/create
/workspaces/123
```

may all activate:

```text
Workspaces
```

Active state should be communicated:

* Visually
* Programmatically
* Without relying only on color

The active link may use:

```text
aria-current="page"
```

or:

```text
aria-current="location"
```

depending on the navigation pattern.

---

# Navigation Labels

Navigation labels should use translation keys.

Example:

```typescript
labelKey:
  "navigation.workspaces"
```

Avoid storing translated text directly in route configuration.

This ensures navigation updates when the language changes.

---

# Navigation Icons

Icons should support rather than replace labels.

Desktop sidebars may show:

```text
Icon + label
```

Collapsed navigation may show:

```text
Icon + accessible name + tooltip
```

Mobile navigation should prioritize clarity over visual compactness.

---

# Responsive Navigation Behavior

Recommended behavior:

```text
Large screens
    → persistent sidebar

Medium screens
    → collapsible sidebar

Small screens
    → navigation drawer or approved bottom navigation
```

All navigation presentations should use the same navigation configuration where possible.

---

# User Navigation

The authenticated header may include:

* User profile
* Language
* Theme
* Account settings
* Session management
* Logout

These actions should remain accessible by keyboard and touch.

Logout should use the centralized session service.

---

# Workspace or Tenant Switcher

Where the user can switch workspaces or tenants, the switcher should:

* Clearly indicate current context
* Use backend-provided accessible resources
* Reset or invalidate affected server state
* Avoid leaking data between contexts
* Navigate to a valid destination
* Update permissions where required
* Handle invalid prior routes

Context switching should be coordinated with session and query infrastructure.

---

# Context Switching and Routes

When a workspace changes, the current route may become invalid.

Example:

```text
Current route:
    /workspaces/123/members

Switch to workspace 456:
    route must update safely
```

The switcher should not preserve a resource identifier from the previous workspace unless the destination is known to exist.

---

# Breadcrumb Architecture

Breadcrumbs should communicate location within the application hierarchy.

Example:

```text
Workspaces
    ›
Retail Operations
    ›
Members
```

Breadcrumbs should not be used as the only page title.

---

# Breadcrumb Configuration

Breadcrumbs may be derived from route metadata.

Example:

```typescript
export interface BreadcrumbMetadata {
  labelKey?: string;
  dynamicLabel?: (
    context: BreadcrumbContext,
  ) => string;
  link?: boolean;
}
```

Dynamic labels may require resource data.

Example:

```text
Workspace name
Invoice number
Product name
```

---

# Breadcrumb Data Loading

Breadcrumbs should not cause uncontrolled duplicate API requests.

Options include:

* Reusing page query cache
* Using lightweight route context
* Falling back to translated generic labels
* Loading resource names through shared query keys

Example fallback:

```text
Workspaces › Workspace › Members
```

until the workspace name is available.

---

# Breadcrumb Accessibility

Breadcrumb navigation should use:

```html
<nav aria-label="Breadcrumb">
```

The current item should use:

```text
aria-current="page"
```

Decorative separators should be hidden from assistive technologies.

---

# Page Metadata

Each page should define metadata where useful.

Metadata may include:

* Document title
* Description
* Navigation key
* Breadcrumb label
* Analytics page identifier
* No-index behavior for public pages
* Theme color adjustments where required

Recommended location:

```text
src/app/route-metadata.ts
```

or module-specific metadata files.

---

# Document Titles

The browser document title should update during navigation.

Recommended format:

```text
Page Name | TEED
```

Examples:

```text
Workspaces | TEED
Login | TEED
Invoice INV-1042 | TEED
```

Titles should be translated.

---

# Title Composition

Example helper:

```typescript
export function createDocumentTitle(
  pageTitle: string,
): string {
  return `${pageTitle} | TEED`;
}
```

Dynamic resource titles should avoid exposing sensitive content unnecessarily.

---

# Page Description

Public pages may define document descriptions.

Protected application pages generally do not need public search-engine descriptions, but metadata may still support:

* Browser context
* PWA behavior
* Accessibility
* Analytics

Protected routes should not expose private content through page metadata.

---

# Route Loading Screen

A route loading screen should be used during:

* Lazy page loading
* Session restoration
* Critical layout initialization

It should not be used for every data request.

Recommended component:

```text
src/global/components/feedback/route-loader.tsx
```

The loader should include:

* Accessible label
* Stable layout
* Application branding where appropriate
* Theme compatibility

---

# Session Loading Screen

Session restoration may use a dedicated loading screen.

It should avoid displaying:

* Protected navigation
* Incorrect guest navigation
* Sensitive cached content

It should complete into one stable session state.

---

# Not-Found Route

Unknown routes should render a not-found page.

Recommended location:

```text
src/pages/global/not-found.page.tsx
```

The page should provide:

* Clear title
* Short explanation
* Safe navigation action
* Link to home or dashboard
* Accessible structure

It should not display raw path details unnecessarily.

---

# Protected Resource Not Found

A resource-specific not-found state may differ from the global route not-found page.

Examples:

```text
Workspace not found
Invoice not found
Product not found
```

This state should normally be rendered within the relevant authenticated layout.

The backend determines whether an inaccessible resource should be represented as not found or access denied.

---

# Access-Denied Page

Recommended location:

```text
src/pages/global/access-denied.page.tsx
```

It should provide:

* Clear translated title
* Safe explanation
* Return action
* Link to an allowed destination
* Optional support path

It should not reveal permission internals unless useful and approved.

---

# Offline Route

Recommended path:

```text
/offline
```

Recommended page:

```text
src/pages/global/offline.page.tsx
```

The page may provide:

* Offline explanation
* Retry action
* Previously available navigation where safe
* Network status
* Guidance on cached functionality

It should not promise access to uncached protected data.

---

# Application Error Route

Recommended path:

```text
/error
```

The error page may display:

* Generic failure message
* Retry action
* Return action
* Safe request or incident reference
* Reload option

It should not expose:

* Stack traces
* Raw response bodies
* Credentials
* Internal infrastructure details

---

# Maintenance Route

A maintenance route may be used when the backend reports planned or temporary unavailability.

Recommended path:

```text
/maintenance
```

The page may provide:

* Maintenance message
* Retry action
* Status link where available
* Last attempted time
* Language and theme access

The frontend should not repeatedly retry at high frequency.

---

# Unsupported Client Version Route

A future mobile wrapper or long-lived PWA may encounter an unsupported client version.

Recommended path:

```text
/unsupported-version
```

The page may instruct users to:

* Reload the web application
* Apply the PWA update
* Update the mobile application
* Contact support

Behavior should depend on platform.

---

# Redirect Architecture

Redirects should be centralized where possible.

Examples include:

```text
/identity/login → /login
/workspace → /workspaces
/ → dashboard or public home
```

Legacy paths may be maintained temporarily.

Redirects should use replacement navigation when the old URL should not remain in browser history.

---

# Default Authenticated Route

After login, the application should choose a valid destination.

Possible priority:

```text
1. Safe preserved destination
2. User-specific default route
3. First permitted primary route
4. Account setup route
5. Access-unavailable page
```

The route should not assume every authenticated user has workspace access.

---

# Onboarding Routing

Users who have not completed required onboarding may need controlled routing.

Example:

```text
Authenticated
    │
    ├── onboarding complete
    │       → normal protected routes
    │
    └── onboarding incomplete
            → onboarding routes
```

Onboarding routing must still be enforced by backend state and APIs.

The frontend should avoid redirect loops between onboarding and dashboard routes.

---

# Route Transition Announcements

Important route changes should be understandable to assistive technology.

Updating the document title and moving focus to the main heading may be sufficient.

A dedicated route announcement region may be introduced if testing shows a need.

Announcements should not duplicate the entire page content.

---

# Deep-Link Support

All supported application routes should work when opened directly.

Example:

```text
User enters:
    /workspaces/123/members

Server:
    returns frontend entry document

Router:
    restores session

Application:
    validates access and renders page
```

Deep links should work in:

* Browser tabs
* Installed PWA
* Shared internal links
* Future mobile wrapper
* Email links

---

# PWA Navigation Considerations

The service worker and deployment configuration must not break client-side routing.

Navigation requests should normally resolve to the application shell when appropriate.

The service worker should distinguish:

* Navigation requests
* Static assets
* API requests
* Offline fallback
* External requests

API failures must not be replaced with the frontend HTML shell.

---

# Mobile Wrapper Navigation

Future mobile packaging may introduce:

* Deep links
* Universal links
* Back-button behavior
* App resume
* External browser transitions
* Native authentication callbacks

The route architecture should avoid browser-only assumptions.

A navigation abstraction may be introduced if native integration becomes necessary.

---

# Back Navigation

Back navigation should preserve expected browser behavior.

The application should avoid replacing history unnecessarily.

Examples:

```text
Open detail page
    → push history entry

Complete login redirect
    → replace login entry when appropriate

Close modal route
    → return to previous page

Change filter
    → push or replace based on expected history behavior
```

The selected behavior should be intentional.

---

# Route-Based Modals

Some dialogs may be represented as routes when they require:

* Deep linking
* Browser back behavior
* Shareable URLs
* Page refresh recovery

Examples may include:

```text
/workspaces/123/members/invite
/products/123/edit
```

Route-based modals should define a direct-page fallback for users opening the URL without background context.

---

# Navigation Blocking

Forms with unsaved changes may block route transitions.

The blocking system should:

* Detect meaningful dirty state
* Avoid blocking after successful save
* Allow explicit discard
* Support browser close warnings where appropriate
* Avoid triggering for harmless URL-state changes
* Use translated confirmation content

Navigation blocking should be used only for meaningful data-loss risk.

---

# Page Infrastructure

Each page should follow a consistent structure.

Example:

```tsx
export function WorkspaceListPage() {
  return (
    <PageContainer size="wide">
      <Stack gap="large">
        <PageHeader
          title={t(
            "workspace.list.title",
          )}
        />

        <WorkspaceListContent />
      </Stack>
    </PageContainer>
  );
}
```

Pages should orchestrate rather than implement low-level infrastructure.

---

# Page Naming

Page files should use:

```text
<name>.page.tsx
```

Examples:

```text
login.page.tsx
workspace-list.page.tsx
workspace-detail.page.tsx
invoice-detail.page.tsx
not-found.page.tsx
```

Page component names should use PascalCase.

---

# Page Module Boundaries

A page under:

```text
src/pages/workspace/
```

may import:

* Workspace components
* Workspace hooks
* Workspace schemas
* Workspace types
* Global components
* Global hooks
* Global services

It should not directly import private files from unrelated modules.

Cross-module behavior should use public contracts.

---

# Route Navigation Helpers

Navigation logic repeated across modules should use helpers or hooks.

Examples:

```text
useSafeNavigate
useReturnLocation
useNavigateToLogin
useNavigateToWorkspace
```

Helpers should remain small and clear.

The project should not hide ordinary React Router behavior behind unnecessary abstraction.

---

# Programmatic Navigation

Programmatic navigation is appropriate after:

* Successful form submission
* Resource creation
* Logout
* Session expiration
* Context switch
* Confirmed destructive action

Navigation should not occur before the mutation outcome is known.

---

# External Navigation

External URLs should use explicit handling.

Example:

```typescript
window.location.assign(
  approvedExternalUrl,
);
```

External destinations should be validated or predefined.

External links should indicate when they open in a new tab where appropriate.

When using:

```text
target="_blank"
```

the link should include safe relationship attributes.

---

# Route Analytics

If page analytics are introduced, route changes may emit controlled events.

Example:

```text
page_view
route_key
module
application_version
```

Analytics should not include:

* Sensitive route parameters
* Personal names
* Full query strings
* Reset tokens
* Private identifiers unless explicitly approved

Analytics implementation should follow the observability standard.

---

# Route Testing Architecture

Routing should be tested at several levels.

```text
Unit tests
    → route builders and validators

Component tests
    → guards and navigation

Integration tests
    → layout and route composition

End-to-end tests
    → real navigation flows
```

---

# Route Builder Tests

Tests should verify:

* Dynamic path construction
* URL encoding
* Stable output
* Invalid input handling
* Search parameter behavior

Example cases:

```text
Workspace ID with spaces
Workspace ID with special characters
Missing identifier
Pagination defaults
Invalid filter values
```

---

# Session Guard Tests

Tests should cover:

```text
Initializing
    → loading state

Refreshing
    → loading or preserved route

Authenticated
    → child route renders

Unauthenticated
    → login redirect

Expired
    → login redirect and message

Error
    → session error state
```

The tests should verify that protected content is not briefly rendered for unauthenticated users.

---

# Guest Guard Tests

Tests should verify:

* Unauthenticated users can access login
* Authenticated users are redirected
* Initializing state does not redirect early
* Allowed identity exceptions remain accessible
* Return destination does not create loops

---

# Permission Guard Tests

Tests should cover:

* User has all required permissions
* User lacks one required permission
* Any-permission mode
* Empty permission requirement
* Fallback rendering
* Permission updates after session change

The tests should confirm that route protection is presentation-only and that API errors remain handled separately.

---

# Navigation Tests

Navigation tests should verify:

* Correct translated labels
* Permission filtering
* Feature-flag filtering
* Active route state
* Nested route activation
* Mobile drawer behavior
* Keyboard navigation
* Accessible current-page indication

---

# Breadcrumb Tests

Tests should verify:

* Static labels
* Dynamic labels
* Current-page state
* Links to parent routes
* Translation changes
* Loading fallback
* Missing-resource behavior

---

# Route Metadata Tests

Tests should verify:

* Document title updates
* Translation changes update titles
* Protected metadata does not expose sensitive content
* Default title fallback works
* Dynamic titles handle missing data safely

---

# Route Integration Tests

Integration tests should verify:

```text
Public route
    → public layout

Login route
    → identity layout

Protected route
    → authenticated layout

Workspace route
    → authenticated + workspace layouts

Unknown route
    → not-found page
```

---

# End-to-End Routing Tests

Playwright should cover critical routing flows.

Examples:

* Open login directly
* Open protected route without session
* Login and return to intended route
* Navigate through authenticated sidebar
* Open deep link with valid session
* Open unknown route
* Lose session during protected navigation
* Access route without permission
* Change language and preserve route
* Reload an installed-PWA route
* Use browser back after form submission
* Switch workspace and receive a valid route

---

# Routing Development Diagnostics

A development-only route inspector may display:

* Current path
* Route parameters
* Search parameters
* Matched route keys
* Session status
* Active navigation key
* Required permissions

This may help development but must not expose sensitive data or be enabled in production.

---

# Routing Implementation Order

Recommended implementation order:

```text
1. Define route path constants
2. Define route builder functions
3. Create global pages
4. Create public layout
5. Create identity layout
6. Create authenticated layout
7. Configure base route tree
8. Implement route loader
9. Implement session guard
10. Implement guest guard
11. Implement permission guard
12. Add global error routes
13. Add offline route
14. Add access-denied route
15. Define navigation configuration
16. Implement desktop navigation
17. Implement mobile navigation
18. Implement active-route behavior
19. Implement breadcrumbs
20. Implement document title updates
21. Implement route-focus behavior
22. Implement scroll restoration
23. Add route tests
24. Add end-to-end navigation tests
```

---

# Foundation Acceptance Criteria

Part 4 is complete when:

* Route constants are centralized
* Dynamic paths use route builders
* Search parameters are parsed safely
* Public routes use a public layout
* Identity routes use an identity layout
* Protected routes use a session guard
* Permission routes use a permission guard
* Session restoration does not cause redirect flashing
* Safe return navigation works
* Open redirects are prevented
* Navigation is configuration-driven
* Navigation filters by permission and feature availability
* Active navigation state is accessible
* Breadcrumbs are available
* Document titles update by route
* Route transitions manage focus
* Unknown routes render a not-found page
* Offline and application-error routes exist
* Deep links work after page reload
* Lazy-loaded routes use a consistent fallback
* Critical route behavior has automated tests
* PWA navigation is tested in production-like builds

---

# Foundation Rules Established in Part 4

The following rules are mandatory:

1. React Router is the standard frontend router.
2. Route paths are centralized.
3. Dynamic routes use route builders.
4. Route parameters are validated before API use.
5. Shareable page state should use search parameters where appropriate.
6. Sensitive data must not be placed in URLs.
7. Public, identity, and protected routes use distinct layout responsibilities.
8. Protected routes wait for session restoration.
9. Session guards use explicit session statuses.
10. Guest guards must not redirect before initialization completes.
11. Preserved return destinations must be internal and validated.
12. Permission guards use backend-defined permission identifiers.
13. Permission guards do not replace backend authorization.
14. Resource-level access remains backend-controlled.
15. Route guards should avoid unnecessary protected requests.
16. Pages should be lazy-loaded where practical.
17. Route loading uses a consistent accessible fallback.
18. Layouts render nested pages through `Outlet`.
19. Each page structure should contain one primary main region.
20. Route transitions should support appropriate focus management.
21. Navigation labels use translation keys.
22. Navigation configuration should support permission and feature filtering.
23. Active navigation state must be programmatically identifiable.
24. Breadcrumbs must use semantic navigation markup.
25. Document titles must update during navigation.
26. Deep links must work after direct browser loading.
27. PWA routing must distinguish navigation requests from API requests.
28. Unsaved-change blocking should be used only for meaningful data-loss risk.
29. Unknown routes must render a controlled not-found page.
30. Critical routing and guard behavior must have automated tests.

---

# Part 4 Summary

The TEED frontend routing foundation should use centralized route definitions, typed builders, validated parameters, nested layouts, session guards, permission guards, and configuration-driven navigation.

Public, identity, and authenticated experiences should have separate layout responsibilities. Protected routes must wait for session restoration, preserve safe intended destinations, and avoid authentication redirect flashing.

Navigation should remain translated, responsive, keyboard accessible, permission aware, and consistent across desktop, PWA, and future mobile environments.

Breadcrumbs, document titles, route focus, scroll restoration, offline pages, error routes, and deep-link behavior should be treated as core infrastructure rather than page-specific additions.

The next section should define:

* Authentication forms and flows
* Login implementation
* Registration implementation
* Verification implementation
* Password recovery
* Session establishment
* Logout flow
* Authentication error mapping
* Multi-factor authentication readiness
* Identity route tests
* Authentication end-to-end tests