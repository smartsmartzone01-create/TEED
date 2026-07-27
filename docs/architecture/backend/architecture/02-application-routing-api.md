# TEED Frontend Architecture

## Part 2 — Application Composition, State, Routing, and API Integration

---

# Application Composition

The TEED frontend should be composed from a small number of centralized application-level systems.

These systems should provide shared behavior once at the application root and make that behavior available throughout the frontend.

The application composition should include:

* Application configuration
* Routing
* Query management
* Session management
* Translation
* Global messages
* Theme management
* Error boundaries
* PWA lifecycle handling

A conceptual composition is:

```text
Application Entry Point
        │
        ▼
App Provider
        │
        ├── Translation Provider
        ├── Query Provider
        ├── Session Provider
        ├── Message Provider
        ├── Theme Provider
        ├── PWA Provider
        ├── Error Boundary
        └── Router Provider
```

These providers should be composed near the application root rather than repeated inside individual modules.

---

# Application Entry Point

The frontend entry point should remain minimal.

A typical entry point is:

```text
src/main.tsx
```

Its responsibilities should be limited to:

* Loading global styles
* Initializing required application services
* Mounting the React application
* Rendering the root application provider
* Starting optional monitoring or PWA services

Example structure:

```tsx
import React from "react";
import ReactDOM from "react-dom/client";

import { App } from "./app/app";
import { AppProvider } from "./global/providers/app-provider";

import "./global/styles/reset.css";
import "./global/styles/globals.css";

ReactDOM.createRoot(
  document.getElementById("root")!,
).render(
  <React.StrictMode>
    <AppProvider>
      <App />
    </AppProvider>
  </React.StrictMode>,
);
```

The entry point should not contain:

* Route definitions
* Session logic
* API configuration
* Business-module logic
* Notification logic
* Form logic
* Page-specific styles

These responsibilities belong in their respective layers.

---

# Application Directory

The `app/` directory should contain application composition and configuration.

Recommended structure:

```text
src/app/
├── app.tsx
├── router.tsx
├── routes.ts
├── route-paths.ts
├── configuration.ts
└── environment.ts
```

The directory should remain small and focused.

---

## `app.tsx`

The root application component should render application-level infrastructure.

Example:

```tsx
export function App() {
  return <ApplicationRouter />;
}
```

The root component should avoid business-module behavior.

---

## `router.tsx`

The router file should define or compose the application route tree.

It should connect:

* Public pages
* Authentication pages
* Protected pages
* Layouts
* Error pages
* Not-found pages
* Permission checks

Route configuration should be centralized so navigation behavior remains predictable.

---

## `route-paths.ts`

Route path values should be centralized.

Example:

```typescript
export const ROUTES = {
  home: "/",
  login: "/login",
  registration: "/register",
  verification: "/verify",
  businessProfile: "/business/profile",
  workspaceList: "/workspaces",
} as const;
```

Components should not repeatedly hardcode route strings.

Centralized route paths improve:

* Refactoring
* Type safety
* Consistency
* Navigation testing
* Deep-link support
* Mobile wrapper compatibility

---

# Layout Architecture

Layouts define reusable page structure.

Examples include:

* Public layout
* Authentication layout
* Dashboard layout
* Business layout
* Workspace layout
* Settings layout
* Mobile layout behavior

Layouts should be stored by module or responsibility:

```text
src/layouts/
├── global/
│   ├── public.layout.tsx
│   ├── dashboard.layout.tsx
│   └── error.layout.tsx
│
├── identity/
│   └── identity.layout.tsx
│
├── business/
│   └── business.layout.tsx
│
└── workspace/
    └── workspace.layout.tsx
```

Layouts should provide:

* Structural page regions
* Navigation
* Headers
* Sidebars
* Footers
* Responsive containers
* Route outlets
* Shared accessibility structure

Layouts should not own business data that belongs to pages or hooks.

---

# Layout Responsibilities

A layout may manage:

* Navigation visibility
* Responsive sidebar state
* Application shell
* Header structure
* Shared breadcrumbs
* Module navigation
* Language switcher placement
* Theme switcher placement
* PWA install action placement

A layout should not manage:

* Form submissions
* Entity creation
* Business calculations
* API mutation logic
* Backend permission decisions

Layouts may use permission information to determine navigation visibility, but backend authorization remains authoritative.

---

# Page Architecture

Pages represent route-level interfaces.

Pages should compose:

* Layouts
* Module components
* Module hooks
* Route parameters
* Query states
* User interactions

A page should remain an orchestration layer.

For example:

```tsx
export function LoginPage() {
  const login = useLogin();

  return (
    <IdentityLayout>
      <LoginForm
        isSubmitting={login.isPending}
        onSubmit={login.submit}
      />
    </IdentityLayout>
  );
}
```

The page coordinates behavior but does not implement every field, validation rule, and request detail itself.

---

# Page Responsibilities

Pages may:

* Read route parameters
* Read search parameters
* Select the correct layout
* Trigger module hooks
* Pass data to components
* Display loading states
* Display empty states
* Coordinate route navigation
* Connect form events to hooks

Pages should not:

* Configure the API client
* Manage token refresh
* Parse raw backend errors
* Duplicate validation schemas
* Define global messages
* Contain large reusable components
* Reimplement shared design-system controls

---

# Component Architecture

Components should be separated into two main categories:

```text
Global Components
Module Components
```

---

## Global Components

Global components are reusable across multiple business modules.

Examples include:

* Button
* Input
* Select
* Checkbox
* Radio group
* Modal
* Drawer
* Table
* Pagination
* Alert
* Badge
* Loader
* Skeleton
* Empty state
* Confirmation dialog
* Language selector
* Network status indicator

They should be located in:

```text
src/global/components/
```

Global components should be:

* Accessible
* Reusable
* Responsive
* Theme-compatible
* Translation-compatible
* Consistent with design tokens
* Independent of one business module

A global component should not import module-specific business logic.

---

## Module Components

Module components implement reusable interface behavior for one business module.

Examples:

```text
src/components/identity/
├── login-form.tsx
├── registration-form.tsx
├── verification-form.tsx
└── password-field.tsx
```

Module components may use:

* Global components
* Module types
* Module schemas
* Module hooks where appropriate
* Module styles

Module components should not depend on unrelated modules without a defined architectural reason.

---

# Component Size and Responsibility

Components should remain focused.

A component should normally represent:

* One visual responsibility
* One reusable interaction pattern
* One business-interface unit

Large components should be split when they contain multiple independent responsibilities.

However, components should not be divided into extremely small files without a clear maintenance benefit.

The goal is:

```text
Readable
Focused
Reusable
Easy to test
Easy to locate
```

The number of files should remain practical rather than artificially minimal or excessive.

---

# Component Dependency Direction

Preferred component dependency direction:

```text
Page
  │
  ▼
Module Component
  │
  ▼
Global Component
```

A global component must not import a module component.

For example:

```text
Allowed:
identity/login-form.tsx
    imports
global/input.tsx

Not allowed:
global/input.tsx
    imports
identity/login-form.tsx
```

This prevents shared infrastructure from becoming coupled to business modules.

---

# Hook Architecture

Hooks should encapsulate reusable React behavior.

TEED should distinguish between:

```text
Global Hooks
Module Hooks
```

---

## Global Hooks

Global hooks are reusable across multiple modules.

Examples:

```text
src/global/hooks/
├── use-message.ts
├── use-session.ts
├── use-permission.ts
├── use-api-error.ts
├── use-network-status.ts
├── use-debounce.ts
├── use-query-params.ts
└── use-theme.ts
```

Global hooks may interact with:

* Global contexts
* Global providers
* Browser or platform abstractions
* Shared query behavior
* Shared utility services

They should not contain module-specific business rules.

---

## Module Hooks

Module hooks coordinate module-specific behavior.

Examples:

```text
src/hooks/identity/
├── use-login.ts
├── use-registration.ts
├── use-verification.ts
└── use-password-reset.ts
```

Module hooks may coordinate:

* API mutations
* API queries
* Form submission
* Response mapping
* Cache invalidation
* Navigation after success
* Module-specific messages
* Module-specific state transitions

Example:

```typescript
export function useLogin() {
  const navigate = useNavigate();
  const { showSuccess } = useMessage();
  const session = useSession();

  const mutation = useMutation({
    mutationFn: loginUser,
    onSuccess: async (response) => {
      await session.establish(response.data);
      showSuccess("identity.login.success");
      navigate(ROUTES.businessProfile);
    },
  });

  return {
    submit: mutation.mutate,
    isPending: mutation.isPending,
    error: mutation.error,
  };
}
```

The exact implementation may vary, but the responsibility should remain clear.

---

# Hook Rules

Hooks should:

* Begin with `use`
* Have one primary responsibility
* Expose a clear return interface
* Use shared API and error infrastructure
* Avoid hidden global side effects
* Remain testable
* Avoid duplicating provider behavior

Hooks should not:

* Directly manipulate unrelated DOM elements
* Reimplement API transport configuration
* Store every server response in Context
* Mix multiple unrelated business workflows
* Hide important business assumptions

---

# Context Architecture

React Context should be used selectively.

Context is appropriate for application-wide or tree-wide state that many components require.

Examples include:

* Session
* Theme
* Translation
* Global messages
* Application configuration
* Limited module workflow state

Context should not become the default state-management solution for all data.

---

# Global Contexts

Global contexts may include:

```text
src/global/contexts/
├── session.context.ts
├── message.context.ts
├── theme.context.ts
└── application.context.ts
```

Their implementations may be provided through corresponding providers.

Examples:

```text
Session Context
Message Context
Theme Context
Application Configuration Context
```

Global contexts should expose stable interfaces through hooks.

For example:

```typescript
const session = useSession();
const messages = useMessage();
```

Components should not normally consume context objects directly when a dedicated hook can provide a safer interface.

---

# Module Contexts

Module contexts should be introduced only where a module has genuinely shared UI state across a subtree.

An example is a multi-step registration workflow:

```text
src/contexts/identity/
└── registration-flow.context.tsx
```

A module context may manage:

* Current step
* Temporary multi-step form state
* Completion state
* Wizard navigation
* Temporary UI preferences

Module contexts should not duplicate server state already managed by TanStack Query.

---

# Context Limitations

Context should not be used as a substitute for:

* Server-state caching
* Request deduplication
* Mutation management
* Form libraries
* URL search parameters
* Local component state
* Persistent storage abstractions

Overusing Context can create:

* Unnecessary rerenders
* Hidden dependencies
* Difficult testing
* Large provider trees
* Unclear state ownership

Context should be used only when its scope and ownership are explicit.

---

# State Management Model

TEED should classify state into four categories:

```text
1. Server State
2. Global Application State
3. Module Workflow State
4. Local Component State
```

Each category should use the most appropriate tool.

---

## Server State

Server state originates from the backend.

Examples:

* Authenticated user
* Business profile
* Workspaces
* Products
* Orders
* Invoices
* Permissions
* Notifications
* Reports

Server state should normally be managed by TanStack Query.

TanStack Query should provide:

* Loading state
* Error state
* Caching
* Refetching
* Background updates
* Request deduplication
* Cache invalidation
* Mutation state

Server data should not be copied into Context without a specific reason.

---

## Global Application State

Global application state applies throughout the frontend.

Examples:

* Current session
* Theme
* Current language
* Global messages
* Network status
* Application update availability

This state may be managed through:

* Context
* Providers
* Platform services
* Small dedicated stores where justified

The architecture should avoid introducing a large global state library before a real need exists.

---

## Module Workflow State

Module workflow state belongs to one business process.

Examples:

* Registration step
* Checkout progress
* Business onboarding stage
* Temporary report-builder configuration

This state may use:

* Local state
* Module Context
* URL state
* Form state

The selected mechanism should match the scope and persistence requirement.

---

## Local Component State

Local state belongs to one component or a small component subtree.

Examples:

* Modal open state
* Selected tab
* Password visibility
* Dropdown state
* Temporary filter input

React state should generally manage this category.

---

# URL State

Shareable and navigational state should use URLs where appropriate.

Examples:

* Page number
* Search term
* Sort order
* Active filter
* Selected tab
* Resource identifier

Example:

```text
/products?page=2&search=phone&sort=-created_at
```

Using URL state supports:

* Browser navigation
* Deep linking
* Page refresh
* Sharing links
* PWA navigation
* Mobile deep links

Sensitive information should never be placed in URLs.

---

# Server-State Management

TanStack Query should serve as the standard server-state layer.

The global query provider should configure common behavior.

Example concerns include:

* Retry policy
* Cache freshness
* Garbage collection
* Refetch behavior
* Mutation behavior
* Global query errors
* Offline awareness

Recommended provider location:

```text
src/global/providers/query-provider.tsx
```

Query keys should be consistent and module-aware.

Example:

```typescript
export const identityQueryKeys = {
  currentUser: ["identity", "current-user"] as const,
  permissions: ["identity", "permissions"] as const,
};
```

Example:

```typescript
export const workspaceQueryKeys = {
  all: ["workspace"] as const,
  list: (filters: WorkspaceFilters) =>
    ["workspace", "list", filters] as const,
  detail: (id: string) =>
    ["workspace", "detail", id] as const,
};
```

Query keys should not be written inconsistently across components.

---

# Mutation Management

Mutations should be handled through module hooks.

Examples:

* Login
* Registration
* Profile update
* Workspace creation
* Product update
* Invoice payment

Mutation hooks should define:

* API request
* Pending state
* Success behavior
* Error behavior
* Cache invalidation
* Navigation behavior where appropriate

The same mutation should not be implemented independently by multiple pages.

---

# Routing Architecture

Routing should be centralized and declarative.

The route architecture should support:

```text
Public Routes
Authentication Routes
Protected Routes
Permission-Protected Routes
Module Routes
Error Routes
```

---

## Public Routes

Public routes may include:

* Landing page
* Public help pages
* Legal pages
* Public product pages where supported
* Offline fallback

Public routes should not require an authenticated session.

---

## Authentication Routes

Authentication routes may include:

* Login
* Registration
* Verification
* Password reset
* Password reset confirmation

Authenticated users may be redirected away from selected authentication pages where appropriate.

---

## Protected Routes

Protected routes require an active authenticated session.

Examples:

* Business profile
* Workspace dashboard
* Billing pages
* Product management
* Order management

A centralized route guard should verify session state.

---

## Permission-Protected Routes

Permission-protected routes require both authentication and one or more permissions.

Example:

```text
Authenticated
      │
      ▼
Permission Check
      │
      ├── Allowed → Render Route
      └── Denied → Permission Error Page
```

Frontend route guards improve usability, but backend endpoints must enforce the same permissions.

---

# Route Guard Responsibilities

A session route guard may:

* Wait for session restoration
* Detect unauthenticated users
* Redirect to login
* Preserve the intended destination
* Render a loading state
* Render a session error

A permission route guard may:

* Read current user permissions
* Check required permission keys
* Render an access-denied page
* Hide protected route content

Route guards should not:

* Decide backend authorization rules independently
* Grant permissions not provided by the backend
* Store unrelated business state
* Perform module mutations

---

# API Integration Architecture

Frontend modules should communicate with the backend through a centralized API architecture.

The request flow should be:

```text
Page
  │
  ▼
Module Hook
  │
  ▼
Module API Function
  │
  ▼
Global API Client
  │
  ▼
Backend API
```

The response flow should be:

```text
Backend API
     │
     ▼
Global Response Parser
     │
     ▼
Error Normalizer
     │
     ▼
Module Hook
     │
     ▼
Page or Component
```

---

# Global API Client

The global API client should manage:

* API base URL
* Default headers
* Content type
* Authentication credentials
* Request cancellation
* Timeouts
* Standard response parsing
* Standard error normalization
* Session refresh coordination
* Retry restrictions
* Request identifiers where supported

Recommended location:

```text
src/global/api/client.ts
```

The application should use one primary API client unless a separate external service requires an explicitly isolated client.

---

# Standard HTTP Methods

The API layer should expose consistent methods for:

* `GET`
* `POST`
* `PUT`
* `PATCH`
* `DELETE`

Example conceptual interface:

```typescript
apiClient.get<TResponse>(url, options);

apiClient.post<TResponse, TPayload>(
  url,
  payload,
  options,
);

apiClient.patch<TResponse, TPayload>(
  url,
  payload,
  options,
);

apiClient.delete<TResponse>(url, options);
```

Pages and components should not call low-level `fetch` or third-party HTTP libraries directly.

---

# Module API Functions

Each module should define focused API functions.

Example:

```text
src/api/identity/login.api.ts
```

```typescript
export async function loginUser(
  payload: LoginRequest,
): Promise<ApiResponse<LoginResponse>> {
  return apiClient.post<
    ApiResponse<LoginResponse>,
    LoginRequest
  >("/api/v1/identity/login/", payload);
}
```

Module API functions should:

* Use module types
* Use the global API client
* Match backend endpoint contracts
* Avoid UI behavior
* Avoid React-specific logic
* Remain easy to test

API functions should not display messages or navigate routes.

Those behaviors belong in hooks or pages.

---

# Standard API Response Contract

The frontend should consume the backend response envelope consistently.

Example:

```typescript
export interface ApiResponse<
  TData,
  TErrors = ApiErrorDetails,
  TMeta = ApiMeta,
> {
  success: boolean;
  message: string;
  data: TData;
  errors: TErrors | null;
  meta: TMeta;
}
```

The exact fields should remain aligned with backend API standards.

The frontend should not create unrelated response formats for different modules.

---

# Machine-Readable Error Codes

The backend should return stable machine-readable error codes where possible.

Example:

```json
{
  "success": false,
  "message": "Invalid credentials.",
  "data": null,
  "errors": {
    "code": "IDENTITY_INVALID_CREDENTIALS",
    "fields": {}
  },
  "meta": {}
}
```

The frontend may translate the error using:

```typescript
t(`errors.${error.code}`);
```

This supports bilingual behavior without depending only on backend message text.

---

# Error Classification

Frontend API errors should be normalized into recognized categories.

Examples:

```text
Validation Error
Authentication Error
Permission Error
Not Found Error
Conflict Error
Rate Limit Error
Server Error
Network Error
Offline Error
Unknown Error
```

A normalized error type may include:

```typescript
export interface NormalizedApiError {
  code: string;
  message: string;
  status?: number;
  fieldErrors?: Record<string, string[]>;
  retryable: boolean;
  original?: unknown;
}
```

Modules should not repeatedly interpret raw transport errors.

---

# Form Error Handling

Field-level backend errors should be mapped to form fields.

Example:

```json
{
  "errors": {
    "code": "VALIDATION_ERROR",
    "fields": {
      "email": ["This email is already registered."],
      "password": ["The password is too short."]
    }
  }
}
```

The frontend should map these errors to React Hook Form.

Non-field errors should be displayed through:

* Form-level alerts
* Global error messages
* Dedicated error pages

The display mechanism should match the error scope.

---

# Session Architecture

Session management should be centralized.

The session system should manage:

* Current authentication status
* Authenticated user
* Session restoration
* Access credentials
* Refresh behavior
* Logout
* Session expiration
* Permission availability
* Device or session identifiers where supported

Recommended locations:

```text
src/global/providers/session-provider.tsx
src/global/hooks/use-session.ts
src/global/contexts/session.context.ts
```

---

# Session States

The session system should expose explicit states.

Example:

```text
Initializing
Authenticated
Unauthenticated
Refreshing
Expired
Error
```

Components should not guess session state from the presence of one token alone.

A session may require validation with the backend.

---

# Session Restoration

When the application starts, the session provider should determine whether a valid session exists.

Conceptual flow:

```text
Application Start
      │
      ▼
Initialize Session Provider
      │
      ▼
Check Available Credentials
      │
      ├── None → Unauthenticated
      │
      └── Available
              │
              ▼
        Validate or Refresh
              │
              ├── Success → Authenticated
              └── Failure → Clear Session
```

Protected routes should wait until initialization is complete.

---

# Access and Refresh Behavior

The exact storage and transport model should follow the frontend security document and backend authentication design.

The architecture should support:

* Short-lived access credentials
* Refresh-session renewal
* Refresh rotation where supported
* Revocation
* Logout
* Expired-session recovery
* Multiple devices
* Future mobile secure storage

Refresh logic should be centralized.

Individual pages and module API functions should not refresh credentials manually.

---

# Failed Session Refresh

When refresh fails:

```text
Refresh Failure
      │
      ▼
Clear Local Session State
      │
      ▼
Invalidate Protected Queries
      │
      ▼
Display Session Message
      │
      ▼
Redirect to Login
```

The original destination may be preserved where appropriate.

Repeated refresh loops must be prevented.

---

# Global Message Architecture

The frontend should use one message framework.

Supported message types should include:

```text
Success
Error
Warning
Information
```

The message provider should control:

* Message queue
* Placement
* Duration
* Dismissal
* Icons
* Accessibility
* Responsive display
* Duplicate suppression
* Translation

Recommended locations:

```text
src/global/providers/message-provider.tsx
src/global/hooks/use-message.ts
src/global/types/message.types.ts
```

---

# Message Usage

Example:

```typescript
const { showSuccess, showError } = useMessage();

showSuccess({
  key: "identity.registration.success",
});

showError({
  key: "errors.networkUnavailable",
});
```

Messages should preferably use translation keys rather than hardcoded text.

Modules may provide message parameters where necessary.

---

# Global Error Boundary

The application should use a global React error boundary.

The error boundary should catch unexpected rendering failures and display a controlled fallback interface.

It should support:

* User-friendly error display
* Retry or reload action
* Error reporting
* Safe logging
* Translation
* Responsive presentation

It should not expose:

* Stack traces
* Secrets
* Internal server details
* Sensitive user information

Expected API errors should not rely on the global error boundary.

They should be handled through query, mutation, form, and error-normalization flows.

---

# Loading States

Loading behavior should be consistent.

Supported loading patterns may include:

* Button spinner
* Page loader
* Skeleton
* Section loader
* Table loader
* Background refresh indicator

The loading pattern should match the scope of the operation.

For example:

```text
Form submission → Button loading state
Page initialization → Page skeleton
Background refresh → Small non-blocking indicator
```

The entire page should not be blocked for a small local mutation unless required.

---

# Empty States

Empty states should explain:

* What is missing
* Why the page is empty
* What the user can do next

Examples:

```text
No workspaces have been created.
No products match the current filters.
No notifications are available.
```

Empty states should use reusable global components where possible.

---

# Offline and Network State

Because TEED is intended to operate as a PWA, network state should be represented explicitly.

A global network-status hook may provide:

```typescript
const {
  isOnline,
  isOffline,
} = useNetworkStatus();
```

The application may display:

* Offline banner
* Reconnection message
* Disabled network actions
* Retry controls
* Cached-content indicators

The application should not imply that a mutation succeeded while the network request is still pending or failed.

Offline mutation queues should not be introduced without a documented conflict and synchronization strategy.

---

# Dependency Rules

Frontend dependencies should follow these rules:

```text
Pages
  ↓
Module Components
  ↓
Module Hooks
  ↓
Module API Functions
  ↓
Global Infrastructure
```

Additional allowed dependencies include:

```text
Pages → Layouts
Pages → Module Types
Components → Module Schemas
Components → Global Components
Hooks → Global Hooks
Hooks → Module API
Module API → Global API Client
```

Disallowed examples include:

```text
Global Components → Module Components
Global Hooks → Module Hooks
Global API Client → Module API Functions
Identity Module → Billing Internals
```

Cross-module collaboration should use documented public interfaces.

---

# Import Rules

Imports should remain predictable.

Recommended categories:

```text
1. Framework imports
2. Third-party imports
3. Global application imports
4. Module imports
5. Relative imports
6. Style imports
```

Path aliases should be considered to reduce complex relative paths.

Example:

```typescript
import { Button } from "@/global/components/button";
import { useMessage } from "@/global/hooks/use-message";
import { LoginForm } from "@/components/identity/login-form";
```

Aliases should be documented and consistently configured across:

* TypeScript
* Vite
* Testing tools
* ESLint
* IDE settings

---

# Architecture Rules Established in Part 2

The following rules are mandatory:

1. Application-level providers are composed once near the root.
2. The application entry point remains minimal.
3. Routes and route paths are centralized.
4. Pages act as orchestration layers.
5. Layouts manage structure, not business mutations.
6. Global components do not depend on module components.
7. Global hooks contain only cross-module behavior.
8. Module hooks coordinate module-specific queries and mutations.
9. React Context is used selectively.
10. Server state is managed through TanStack Query.
11. Local component state remains local.
12. Shareable navigation state should use URLs where appropriate.
13. Pages and components do not make uncontrolled HTTP calls.
14. Module API functions use the global API client.
15. API responses and errors are normalized consistently.
16. Machine-readable backend error codes support translation.
17. Session handling and refresh behavior are centralized.
18. Global messages use one provider and one visual system.
19. Expected API errors do not rely on the global error boundary.
20. Offline and network state are represented explicitly.
21. Dependency direction flows from pages toward global infrastructure.
22. Cross-module internal imports are not permitted without a documented interface.

---

# Part 2 Summary

TEED frontend application behavior should be composed from centralized providers, predictable routing, responsibility-focused pages, reusable components, focused hooks, selective contexts, and a unified API integration layer.

Server state should be managed through TanStack Query, while global contexts should remain limited to application-wide concerns such as sessions, messages, themes, and configuration.

The API architecture should provide one global client, consistent response parsing, machine-readable error handling, centralized session renewal, and reusable module API functions.

These standards ensure that frontend features remain predictable, testable, bilingual, PWA-ready, and compatible with future mobile clients.

The next section should define:

* Form architecture
* Schema validation
* Design system
* Tailwind and custom CSS rules
* Responsive design
* Accessibility
* Internationalization behavior
* Performance standards
* Testing architecture