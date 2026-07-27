# TEED Frontend Foundation

## Part 2 — API Client, Error Handling, Session Contracts, Providers, and Shared Services

---

# Purpose

This section defines the reusable frontend infrastructure that should exist before business modules begin making API requests or managing authenticated state.

It establishes:

* The global API client
* Standard request and response contracts
* Error normalization
* Backend field-error mapping
* Query-key conventions
* Session contracts
* Authentication integration boundaries
* Provider responsibilities
* Message-service contracts
* Theme-service contracts
* Storage and network services
* Shared service dependency rules

The objective is to prevent each business module from creating its own infrastructure.

---

# Shared-Service Architecture

The TEED frontend should use one shared service layer.

A typical dependency flow should be:

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

Shared application behavior should flow through providers and hooks:

```text
Application
  │
  ▼
App Provider
  │
  ├── Translation Provider
  ├── Query Provider
  ├── Theme Provider
  ├── Message Provider
  ├── Network Provider
  ├── Session Provider
  └── PWA Provider
```

Module code should depend on these shared interfaces instead of rebuilding them.

---

# Initial Shared-Service Structure

Recommended structure:

```text
src/global/
├── api/
│   ├── api-client.ts
│   ├── api-request.ts
│   ├── api-response.ts
│   ├── api-error.ts
│   ├── normalize-api-error.ts
│   ├── map-field-errors.ts
│   ├── request-headers.ts
│   └── request-id.ts
│
├── contexts/
│   ├── message.context.ts
│   ├── network.context.ts
│   ├── session.context.ts
│   └── theme.context.ts
│
├── hooks/
│   ├── use-api-error.ts
│   ├── use-message.ts
│   ├── use-network-status.ts
│   ├── use-permission.ts
│   ├── use-session.ts
│   └── use-theme.ts
│
├── platform/
│   ├── network/
│   └── storage/
│
├── providers/
│   ├── app-provider.tsx
│   ├── message-provider.tsx
│   ├── network-provider.tsx
│   ├── query-provider.tsx
│   ├── session-provider.tsx
│   ├── theme-provider.tsx
│   └── translation-provider.tsx
│
├── query/
│   ├── query-client.ts
│   ├── query-key.types.ts
│   └── query-key.factory.ts
│
└── types/
    ├── api.types.ts
    ├── message.types.ts
    ├── network.types.ts
    ├── permission.types.ts
    ├── session.types.ts
    └── theme.types.ts
```

File names may be adjusted, but responsibilities should remain separated.

---

# Global API Client

The global API client is the only general-purpose transport layer used by the frontend.

It should own:

* API base URL
* Default headers
* Request serialization
* Response parsing
* Request cancellation
* Timeout behavior
* Authentication integration
* Error normalization
* Correlation identifiers
* Credential refresh coordination
* Safe retry behavior

Pages, components, and module hooks should not use raw `fetch` directly.

---

# API Client Interface

A typed interface should define the supported request methods.

Example:

```typescript
export interface ApiClient {
  get<TResponse>(
    path: string,
    options?: ApiRequestOptions,
  ): Promise<TResponse>;

  post<TResponse, TPayload>(
    path: string,
    payload: TPayload,
    options?: ApiRequestOptions,
  ): Promise<TResponse>;

  put<TResponse, TPayload>(
    path: string,
    payload: TPayload,
    options?: ApiRequestOptions,
  ): Promise<TResponse>;

  patch<TResponse, TPayload>(
    path: string,
    payload: TPayload,
    options?: ApiRequestOptions,
  ): Promise<TResponse>;

  delete<TResponse>(
    path: string,
    options?: ApiRequestOptions,
  ): Promise<TResponse>;
}
```

This interface allows the underlying transport implementation to change later without changing every module.

---

# API Request Options

Request options may include:

```typescript
export interface ApiRequestOptions {
  signal?: AbortSignal;
  headers?: Record<string, string>;
  timeoutMs?: number;
  credentials?: RequestCredentials;
  retry?: boolean;
  requiresAuthentication?: boolean;
  idempotencyKey?: string;
}
```

Options should be added only when they serve a documented requirement.

A generic options object should not become an unstructured escape mechanism.

---

# API Base URL

The API client should read the backend base URL from validated environment configuration.

Example:

```typescript
const baseUrl = environment.apiBaseUrl;
```

Module API functions should pass relative endpoint paths.

Preferred:

```typescript
apiClient.get("/identity/session/");
```

Avoid:

```typescript
apiClient.get(
  "https://api.example.com/api/v1/identity/session/",
);
```

This preserves environment portability.

---

# URL Construction

URL joining should be centralized.

The client should handle:

* Leading slashes
* Trailing slashes
* Query parameters
* URL encoding
* Base-path consistency

Example helper:

```typescript
export function buildApiUrl(
  baseUrl: string,
  path: string,
): URL {
  return new URL(path, `${baseUrl}/`);
}
```

Query parameters should be encoded through `URLSearchParams` or a controlled helper.

---

# Request Headers

Default request headers may include:

```text
Accept: application/json
Content-Type: application/json
X-Request-ID: generated identifier
Accept-Language: current language
```

Authentication headers depend on the approved session design.

Headers should be assembled centrally.

Module API functions should not manually duplicate common headers.

---

# Language Header

The API client should send the current language where the backend supports localized responses.

Example:

```text
Accept-Language: sw
```

The frontend should still rely primarily on machine-readable error codes for consistent translation.

The language header may support:

* Localized backend fallback messages
* Localized emails
* Localized generated documents
* Locale-aware backend formatting where approved

---

# Request Identifiers

The frontend should support a request identifier or correlation identifier.

Example:

```typescript
export function createRequestId(): string {
  return crypto.randomUUID();
}
```

Where `crypto.randomUUID()` is unavailable, a safe fallback may be used.

The generated identifier may be sent using:

```text
X-Request-ID
```

The backend may return the same or a related identifier.

---

# Request Timeouts

Requests should not remain pending indefinitely.

The API client should support configurable timeouts.

Conceptual implementation:

```typescript
const controller = new AbortController();

const timeout = window.setTimeout(() => {
  controller.abort();
}, timeoutMs);
```

Timeout behavior should distinguish between:

* User cancellation
* Navigation cancellation
* Request timeout
* Offline failure
* Backend failure

A timeout should produce a normalized error.

---

# Request Cancellation

Query and mutation functions should accept abort signals where appropriate.

This helps avoid:

* Updating unmounted views
* Wasted network requests
* Stale search results
* Repeated route-transition requests

TanStack Query provides abort signals to query functions and these should be passed to the API client.

Example:

```typescript
queryFn: ({ signal }) =>
  getWorkspaceList(filters, { signal }),
```

---

# Request Serialization

JSON requests should be serialized centrally.

Example:

```typescript
body: JSON.stringify(payload)
```

The client should not attach a JSON content type when the payload is `FormData`.

The API client should detect or accept request-body type explicitly.

Supported request bodies may include:

* JSON
* FormData
* No body

Additional formats should require explicit architectural approval.

---

# File Upload Requests

File upload functions should use `FormData`.

Example:

```typescript
const formData = new FormData();
formData.append("file", file);
formData.append("name", payload.name);
```

The browser should set the multipart boundary.

The frontend should not manually set:

```text
Content-Type: multipart/form-data
```

unless the transport library requires a controlled implementation.

Upload progress may require a transport-specific extension and should be isolated.

---

# Standard API Response Envelope

The frontend should define one shared response contract aligned with backend API standards.

Example:

```typescript
export interface ApiResponse<
  TData,
  TErrorDetails = ApiErrorDetails,
  TMeta = ApiMeta,
> {
  success: boolean;
  message: string;
  data: TData;
  errors: TErrorDetails | null;
  meta: TMeta;
}
```

The exact structure must match the backend.

The frontend should not silently create module-specific alternatives.

---

# API Metadata

Common metadata may include:

```typescript
export interface ApiMeta {
  requestId?: string;
  timestamp?: string;
  pagination?: ApiPaginationMeta;
}
```

Pagination metadata may include:

```typescript
export interface ApiPaginationMeta {
  page: number;
  pageSize: number;
  totalItems: number;
  totalPages: number;
  hasNext: boolean;
  hasPrevious: boolean;
}
```

The frontend should not infer pagination values when the backend provides them.

---

# API Error Details

A shared error-detail contract may include:

```typescript
export interface ApiErrorDetails {
  code: string;
  fields?: Record<string, string[]>;
  details?: Record<string, unknown>;
}
```

The `code` field should remain stable and machine-readable.

Examples:

```text
VALIDATION_ERROR
IDENTITY_INVALID_CREDENTIALS
IDENTITY_SESSION_EXPIRED
WORKSPACE_PERMISSION_DENIED
RESOURCE_NOT_FOUND
RATE_LIMIT_EXCEEDED
```

---

# Normalized API Error

All transport and backend failures should be converted into one frontend error type.

Example:

```typescript
export interface NormalizedApiError {
  category:
    | "validation"
    | "authentication"
    | "permission"
    | "not_found"
    | "conflict"
    | "rate_limit"
    | "server"
    | "network"
    | "offline"
    | "timeout"
    | "cancelled"
    | "unknown";

  code: string;
  message: string;
  status?: number;
  requestId?: string;
  fieldErrors?: Record<string, string[]>;
  retryable: boolean;
  original?: unknown;
}
```

UI code should work with this normalized shape rather than transport-specific errors.

---

# Error Normalization Flow

The error normalizer should evaluate failures in a predictable order.

```text
Caught Error
    │
    ├── Request cancelled
    ├── Request timed out
    ├── Device offline
    ├── Network failure
    ├── Backend response with error envelope
    ├── Invalid backend response
    └── Unknown failure
```

Each path should produce a `NormalizedApiError`.

---

# HTTP Status Mapping

A standard mapping may include:

| HTTP status | Category              |
| ----------- | --------------------- |
| 400         | validation or request |
| 401         | authentication        |
| 403         | permission            |
| 404         | not found             |
| 409         | conflict              |
| 422         | validation            |
| 429         | rate limit            |
| 500–599     | server                |

The backend error code should take precedence where it provides a more precise category.

---

# Invalid Response Handling

The client should detect responses that do not match the expected API envelope.

This may occur because of:

* Proxy error pages
* Invalid backend deployment
* Unexpected HTML response
* Partial network failure
* Contract mismatch

These should produce a controlled error such as:

```text
API_INVALID_RESPONSE
```

The raw response should not be shown directly to users.

---

# Error Translation

The UI should translate machine-readable codes.

Example:

```typescript
const translationKey = `errors.${error.code}`;
```

Fallback order may be:

```text
1. Frontend translation for error code
2. Safe backend message
3. Generic translated error
```

The frontend should not parse English sentences to infer error type.

---

# Shared Error Hook

A shared hook may expose error presentation helpers.

Example:

```typescript
export interface UseApiErrorResult {
  getMessage(error: NormalizedApiError): string;
  isFieldError(error: NormalizedApiError): boolean;
  isSessionError(error: NormalizedApiError): boolean;
}
```

Recommended location:

```text
src/global/hooks/use-api-error.ts
```

This hook may use the translation system.

It should not mutate application state unexpectedly.

---

# Field-Error Mapping

A reusable helper should map normalized backend errors into React Hook Form.

Example:

```typescript
export function applyFieldErrors<
  TFieldValues extends FieldValues,
>(
  error: NormalizedApiError,
  setError: UseFormSetError<TFieldValues>,
): void {
  if (!error.fieldErrors) {
    return;
  }

  for (const [field, messages] of Object.entries(
    error.fieldErrors,
  )) {
    const message = messages[0];

    if (!message) {
      continue;
    }

    setError(field as Path<TFieldValues>, {
      type: "server",
      message,
    });
  }
}
```

The production implementation should support translation keys and nested field paths where required.

---

# Non-Field Errors

Backend errors that do not belong to one field should be presented as:

* Form-level alert
* Page-level error state
* Global message
* Dedicated error page

The selected presentation should match the scope.

Example:

```text
Invalid email format → Field error
Invalid credentials → Form alert
Session expired → Global session message
Workspace unavailable → Page error
Unexpected application failure → Error boundary
```

---

# Retry Policy

Retries must be safe and intentional.

Queries may retry selected transient errors.

Mutations should not retry automatically by default.

Retries should not occur automatically for:

* Validation errors
* Authentication errors
* Permission errors
* Conflict errors
* Most destructive actions
* Payment submissions
* Order creation without idempotency protection

Transient network and server failures may be retryable depending on request type.

---

# Query Client

The query client should be defined separately from the provider.

Recommended file:

```text
src/global/query/query-client.ts
```

Example:

```typescript
export const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      retry: shouldRetryQuery,
      refetchOnWindowFocus: false,
      refetchOnReconnect: true,
    },
    mutations: {
      retry: false,
    },
  },
});
```

The retry decision should use normalized error categories.

---

# Query-Key Standard

Query keys should be hierarchical and stable.

Recommended structure:

```text
[module, resource, operation, parameters]
```

Examples:

```typescript
["identity", "session"]
["workspace", "list", filters]
["workspace", "detail", workspaceId]
["product", "list", filters]
["billing", "invoice", invoiceId]
```

The first key segment should normally match the backend-aligned module.

---

# Query-Key Factory

Each module should define a query-key factory.

Example:

```typescript
export const workspaceQueryKeys = {
  root: ["workspace"] as const,

  lists: () =>
    [...workspaceQueryKeys.root, "list"] as const,

  list: (filters: WorkspaceFilters) =>
    [
      ...workspaceQueryKeys.lists(),
      filters,
    ] as const,

  details: () =>
    [...workspaceQueryKeys.root, "detail"] as const,

  detail: (workspaceId: string) =>
    [
      ...workspaceQueryKeys.details(),
      workspaceId,
    ] as const,
};
```

This prevents key duplication and inconsistent invalidation.

---

# Query Parameter Stability

Objects used in query keys should be stable and serializable.

Avoid query-key values such as:

* Functions
* Class instances
* DOM objects
* Unstable nested objects
* Raw event objects

Filters should use typed plain objects.

Example:

```typescript
export interface WorkspaceFilters {
  page: number;
  search?: string;
  status?: WorkspaceStatus;
}
```

---

# Cache Invalidation

Mutation hooks should invalidate or update the minimum necessary query scope.

Example:

```text
Create workspace
    ↓
Invalidate workspace lists

Update one workspace
    ↓
Update or invalidate workspace detail
    ↓
Invalidate affected workspace lists
```

Avoid clearing the entire query cache for ordinary module changes.

---

# Session Contract

The session provider should expose a stable interface.

Example:

```typescript
export interface SessionContextValue {
  status: SessionStatus;
  user: AuthenticatedUser | null;
  permissions: readonly string[];

  initialize(): Promise<void>;
  establish(
    session: SessionEstablishmentPayload,
  ): Promise<void>;
  refresh(): Promise<boolean>;
  logout(): Promise<void>;
}
```

The actual contract should match the backend authentication model.

---

# Session Status

Recommended session states:

```typescript
export type SessionStatus =
  | "initializing"
  | "authenticated"
  | "unauthenticated"
  | "refreshing"
  | "expired"
  | "error";
```

The UI should not infer session state from `user !== null` alone.

---

# Authenticated User Contract

The frontend user shape should contain only data required globally.

Example:

```typescript
export interface AuthenticatedUser {
  id: string;
  displayName: string;
  email?: string;
  preferredLanguage?: string;
}
```

Large user profiles should remain server state and be queried separately.

The session object should not become a storage location for every user-related entity.

---

# Permission Contract

Permissions should be represented as stable strings supplied by the backend.

Example:

```typescript
export type PermissionCode = string;
```

A stricter generated union may be introduced later if backend contracts can generate it reliably.

The session may expose:

```typescript
permissions: readonly PermissionCode[];
```

---

# Permission Helper

A shared helper should support:

```typescript
can("workspace.view");
canAny([
  "workspace.update",
  "workspace.delete",
]);
canAll([
  "billing.invoice.view",
  "billing.payment.manage",
]);
```

Example interface:

```typescript
export interface PermissionService {
  can(permission: PermissionCode): boolean;
  canAny(
    permissions: readonly PermissionCode[],
  ): boolean;
  canAll(
    permissions: readonly PermissionCode[],
  ): boolean;
}
```

Permission checks should remain presentation controls only.

---

# Session Initialization

The session provider should initialize once when the application starts.

Flow:

```text
Application mounts
      │
      ▼
Session provider initializes
      │
      ├── No valid session
      │       └── unauthenticated
      │
      ├── Valid existing session
      │       └── authenticated
      │
      └── Recoverable expired access
              ├── refresh succeeds
              │       └── authenticated
              └── refresh fails
                      └── unauthenticated
```

Protected routes should wait for this process to complete.

---

# Session Establishment

After successful login or registration, a module hook should pass the session payload to the session provider.

Example:

```typescript
await session.establish(response.data.session);
```

The login hook should not directly:

* Store tokens
* Configure headers
* Populate permission caches
* Persist user state
* Trigger refresh timers

Those responsibilities belong to the session infrastructure.

---

# Session Refresh Coordinator

Only one refresh request should run at a time.

A shared promise may coordinate concurrent refresh attempts.

Conceptual pattern:

```typescript
let activeRefresh:
  Promise<boolean> | null = null;

export function refreshSession(): Promise<boolean> {
  if (activeRefresh) {
    return activeRefresh;
  }

  activeRefresh = performRefresh()
    .finally(() => {
      activeRefresh = null;
    });

  return activeRefresh;
}
```

The real implementation should avoid module-level state where dependency injection or service instances provide clearer lifecycle control.

---

# Failed Authentication Requests

When an authenticated request receives a recoverable authentication error:

```text
Request fails with expired access
       │
       ▼
Coordinate session refresh
       │
       ├── Refresh succeeds
       │       └── Retry eligible request once
       │
       └── Refresh fails
               └── End session
```

The original request should not be retried repeatedly.

---

# Session Expiration Handling

The session provider should perform centralized cleanup.

Cleanup may include:

* Clear authenticated user
* Clear permissions
* Remove credentials
* Cancel protected requests
* Remove protected query data
* Clear sensitive module state
* Display one translated message
* Redirect to login

The session service should avoid importing route-level UI directly where possible.

Navigation integration may be provided through a controlled callback or application service.

---

# Logout Contract

Logout should support:

```typescript
await session.logout();
```

The provider should handle:

* Backend logout request
* Local cleanup
* Query cleanup
* Credential cleanup
* State transition
* Redirect coordination

Local cleanup should complete even when the backend logout request fails.

---

# Credential Storage Boundary

This document does not select the final credential storage mechanism.

That decision belongs in:

```text
docs/architecture/frontend-security.md
docs/adr/adr-frontend-authentication-storage.md
```

Until the decision is approved:

* Do not persist refresh credentials in ordinary local storage
* Do not allow modules to select their own strategy
* Do not expose credential values through session hooks
* Do not log credential payloads

---

# Query Data During Logout

Logout should remove protected query data.

Possible approach:

```typescript
queryClient.clear();
```

However, clearing everything may also remove public cached data.

A more selective approach may use query metadata or module scopes.

The final behavior should be documented before production authentication is implemented.

---

# Message Provider Contract

The message system should expose a simple shared interface.

Example:

```typescript
export interface MessageService {
  showSuccess(
    message: MessageInput,
  ): string;

  showError(
    message: MessageInput,
  ): string;

  showWarning(
    message: MessageInput,
  ): string;

  showInfo(
    message: MessageInput,
  ): string;

  dismiss(messageId: string): void;
  clear(): void;
}
```

---

# Message Input

Messages should support translation keys and parameters.

Example:

```typescript
export interface MessageInput {
  key: string;
  values?: Record<
    string,
    string | number
  >;
  durationMs?: number;
  persistent?: boolean;
}
```

A controlled raw-text option may exist for backend fallbacks, but translation keys should be preferred.

---

# Message Model

Internal message state may use:

```typescript
export interface ApplicationMessage {
  id: string;
  type:
    | "success"
    | "error"
    | "warning"
    | "info";
  key: string;
  values?: Record<
    string,
    string | number
  >;
  durationMs?: number;
  persistent: boolean;
}
```

The provider should generate identifiers centrally.

---

# Message Provider Responsibilities

The message provider should manage:

* Message queue
* Duplicate suppression
* Auto-dismiss timers
* Manual dismissal
* Accessibility announcements
* Maximum visible message count
* Responsive positioning
* Translation rendering

Modules should not create their own toast systems.

---

# Message Accessibility

Messages should use appropriate live regions.

Possible behavior:

```text
Success or information → polite announcement
Critical error → assertive announcement
```

Messages should remain visible long enough to be read.

Persistent messages should provide a dismiss action unless dismissal would be unsafe.

---

# Theme Contract

The theme provider should expose:

```typescript
export type ThemePreference =
  | "light"
  | "dark"
  | "system";

export type ResolvedTheme =
  | "light"
  | "dark";
```

Example context:

```typescript
export interface ThemeContextValue {
  preference: ThemePreference;
  resolvedTheme: ResolvedTheme;
  setPreference(
    preference: ThemePreference,
  ): void;
}
```

---

# Theme Persistence

Theme preference may be stored through the storage abstraction.

Example key:

```text
teed.theme
```

The provider should resolve:

```text
User preference
    │
    ├── light → light
    ├── dark → dark
    └── system
            └── browser or platform preference
```

The HTML root element may receive:

```text
data-theme="light"
data-theme="dark"
```

---

# Avoiding Theme Flash

The frontend should reduce incorrect-theme flashing during startup.

Possible strategies include:

* Small pre-render theme initialization
* Server-provided theme hint
* Synchronous safe preference read
* CSS system-preference fallback

Any inline initialization script must remain compatible with the Content Security Policy.

---

# Network Service Contract

The network service should expose application-level connectivity state.

Example:

```typescript
export interface NetworkState {
  isOnline: boolean;
  lastChangedAt: number;
}
```

The provider may subscribe to browser events:

```text
online
offline
```

This state indicates device connectivity, not guaranteed API availability.

---

# Backend Reachability

A future enhancement may distinguish:

```text
Device online
Backend reachable
Authenticated API healthy
```

These states should not be treated as identical.

A backend health check should not run excessively or expose protected infrastructure unnecessarily.

---

# Network Provider

The network provider should:

* Subscribe once to platform network events
* Expose current network state
* Display or support a global offline indicator
* Coordinate query reconnection behavior
* Remain replaceable for mobile implementations

Module pages should consume:

```typescript
const { isOnline } = useNetworkStatus();
```

They should not subscribe independently to browser events.

---

# Storage Service Contract

The storage service should separate keys from implementation.

Example:

```typescript
export interface StorageService {
  get<TValue>(
    key: StorageKey,
  ): TValue | null;

  set<TValue>(
    key: StorageKey,
    value: TValue,
  ): void;

  remove(key: StorageKey): void;
}
```

A broad `clear()` method should be used carefully because it may remove unrelated application or host data.

---

# Storage Keys

Recommended file:

```text
src/global/constants/storage-keys.ts
```

Example:

```typescript
export const STORAGE_KEYS = {
  language: "teed.v1.language",
  theme: "teed.v1.theme",
  installPromptDismissed:
    "teed.v1.install-prompt-dismissed",
} as const;

export type StorageKey =
  (typeof STORAGE_KEYS)[keyof typeof STORAGE_KEYS];
```

Modules should not create arbitrary persistent keys without review.

---

# Storage Serialization

The web storage implementation should handle serialization safely.

Example:

```typescript
export function serializeStorageValue(
  value: unknown,
): string {
  return JSON.stringify(value);
}
```

Reads should catch malformed values.

When parsing fails:

* Return a safe fallback
* Remove the corrupted key where appropriate
* Report a safe diagnostic event
* Do not crash application startup

---

# Storage Availability

Browser storage may fail because of:

* Privacy mode
* Browser restrictions
* Quota limits
* Corrupted data
* Embedded webview behavior
* User settings

The application should continue with in-memory behavior where practical.

Storage failure should not prevent login-page rendering or basic navigation.

---

# Translation Provider Contract

The translation provider should initialize language resources before dependent components render.

It should expose language operations through i18next and a small shared helper.

Possible hook:

```typescript
export interface LanguageService {
  language: string;
  supportedLanguages: readonly string[];
  changeLanguage(
    language: string,
  ): Promise<void>;
}
```

Language persistence should use the storage abstraction.

---

# Language Change Effects

Changing language may affect:

* Visible text
* Validation messages
* Date formatting
* Number formatting
* Currency formatting
* Backend `Accept-Language` header
* Document direction
* User preference synchronization

The provider should coordinate these effects.

---

# Provider Composition Order

Recommended composition:

```tsx
<TranslationProvider>
  <QueryProvider>
    <ThemeProvider>
      <MessageProvider>
        <NetworkProvider>
          <SessionProvider>
            {children}
          </SessionProvider>
        </NetworkProvider>
      </MessageProvider>
    </ThemeProvider>
  </QueryProvider>
</TranslationProvider>
```

The exact order may change based on implementation dependencies.

Rules include:

* Message rendering depends on translation
* Session behavior may depend on query client
* Session behavior may use messages
* Session behavior may use network state
* Theme may use storage
* Translation may use storage

Storage should normally be a service rather than a React provider unless runtime replacement requires one.

---

# App Provider

The application should expose one root provider component.

Example:

```tsx
export function AppProvider({
  children,
}: PropsWithChildren) {
  return (
    <TranslationProvider>
      <QueryProvider>
        <ThemeProvider>
          <MessageProvider>
            <NetworkProvider>
              <SessionProvider>
                {children}
              </SessionProvider>
            </NetworkProvider>
          </MessageProvider>
        </ThemeProvider>
      </QueryProvider>
    </TranslationProvider>
  );
}
```

The root entry point should not duplicate this composition.

---

# Provider Error Handling

Provider initialization failures should fail safely.

Examples:

```text
Translation resource failure
    → Use fallback language

Theme storage failure
    → Use system preference

Session restoration failure
    → Use unauthenticated state

Network subscription failure
    → Assume online indicator unavailable

Query provider failure
    → Render controlled application error
```

Providers should not leave the application permanently suspended without user feedback.

---

# Context Default Values

Contexts should not use fake default implementations that silently do nothing.

Avoid:

```typescript
createContext({
  showSuccess: () => undefined,
});
```

Preferred:

```typescript
const MessageContext =
  createContext<MessageContextValue | null>(
    null,
  );
```

The consuming hook should throw a clear development error when used outside its provider.

---

# Shared Hook Pattern

Example:

```typescript
export function useMessage(): MessageContextValue {
  const context = useContext(MessageContext);

  if (!context) {
    throw new Error(
      "useMessage must be used within MessageProvider.",
    );
  }

  return context;
}
```

The same pattern should apply to:

* `useSession`
* `useTheme`
* `useNetworkStatus`

---

# Service Dependency Rules

Shared services should follow clear dependency direction.

Allowed:

```text
API client → environment
API client → session credential adapter
API client → language service
Session provider → API client
Session provider → query client
Session provider → message service
Theme provider → storage service
Translation provider → storage service
Network provider → platform network service
```

Care must be taken to avoid circular dependencies between the API client and session provider.

---

# Avoiding API and Session Circular Dependencies

A direct cycle can occur:

```text
API client imports session provider
Session provider imports API client
```

This should be avoided.

Preferred approaches include:

* Credential adapter interface
* Auth-aware API client factory
* Session callbacks registered during startup
* Separate unauthenticated auth client
* Dependency injection

Example interface:

```typescript
export interface AuthenticationAdapter {
  getAccessCredential():
    | string
    | null;

  refreshSession():
    Promise<boolean>;

  endSession(): void;
}
```

The API client may depend on this interface rather than React context.

---

# API Client Factory

A factory may create the API client with required dependencies.

Example:

```typescript
export function createApiClient(
  dependencies: ApiClientDependencies,
): ApiClient {
  return {
    async get(path, options) {
      // Request implementation
    },

    async post(path, payload, options) {
      // Request implementation
    },
  };
}
```

Dependencies may include:

```typescript
export interface ApiClientDependencies {
  getLanguage(): string;
  getAccessCredential(): string | null;
  refreshSession(): Promise<boolean>;
  handleSessionFailure(): void;
}
```

This design improves testing and mobile portability.

---

# Public and Authenticated Requests

The API client should distinguish between requests that require authentication and those that do not.

Examples:

```text
Public:
- Login
- Registration
- Password reset request
- Public configuration

Authenticated:
- Current session
- Workspace list
- Billing data
- Product management
```

Example option:

```typescript
requiresAuthentication: false
```

The default behavior should be documented.

---

# Authentication Endpoint Isolation

Refresh and logout endpoints should avoid triggering their own refresh behavior.

For example:

```text
Refresh request fails with 401
    → Do not attempt another refresh
```

Authentication endpoints should use controlled request settings to prevent loops.

---

# Global API Error Events

Some errors may trigger application-wide behavior.

Examples:

```text
Session expired
Maintenance mode
Client version unsupported
Tenant suspended
Rate limiting
```

The API layer may expose controlled events or typed callbacks.

It should not directly render UI components.

---

# Maintenance and Version Errors

The normalized error model may support codes such as:

```text
APPLICATION_MAINTENANCE
CLIENT_VERSION_UNSUPPORTED
TENANT_SUSPENDED
```

Application-level handlers may redirect to dedicated pages or display persistent messages.

The exact behavior should be documented with backend contracts.

---

# Testing the API Client

Tests should cover:

* URL construction
* Header construction
* JSON serialization
* FormData handling
* Request cancellation
* Timeout normalization
* Offline error normalization
* Backend validation errors
* Invalid response envelopes
* Authentication refresh coordination
* Request retry after refresh
* Failed refresh cleanup
* Correlation identifier handling

The API client should be tested independently of React.

---

# Testing Providers

Provider tests should cover:

## Session provider

* Initialization
* Authenticated restoration
* Unauthenticated restoration
* Refresh success
* Refresh failure
* Logout
* Permission exposure
* Query cleanup

## Message provider

* Success message
* Error message
* Auto-dismiss
* Persistent message
* Duplicate suppression
* Manual dismissal

## Theme provider

* Stored preference
* System preference
* Preference changes
* Storage failure

## Network provider

* Online event
* Offline event
* Initial state
* Cleanup of event listeners

---

# Development Diagnostics

During development, shared services may expose safe diagnostics.

Examples:

* Current application version
* Current environment
* Current language
* Current theme
* Network state
* Query devtools

Diagnostics should not reveal:

* Credentials
* Private API payloads
* Sensitive user data
* Full production errors

Development tooling should be disabled or excluded from production where required.

---

# Foundation Implementation Order

Recommended implementation order for this section:

```text
1. Define shared API types
2. Define normalized error types
3. Implement URL and header helpers
4. Implement request timeout and cancellation
5. Implement base API client
6. Implement response parsing
7. Implement error normalization
8. Implement field-error mapping
9. Configure query client
10. Define query-key conventions
11. Implement storage service
12. Implement network service
13. Implement theme provider
14. Implement message provider
15. Define session contracts
16. Implement permission helpers
17. Implement session provider
18. Integrate authentication adapter
19. Compose app provider
20. Add unit and provider tests
```

Authentication credential persistence should remain deferred until the security decision is approved.

---

# Foundation Acceptance Criteria

Part 2 is complete when:

* One typed API client exists
* Modules can make public and authenticated requests
* Request headers are centralized
* Language headers are centralized
* Request identifiers are supported
* Timeouts and cancellation work
* Backend response envelopes are typed
* Errors normalize into one shape
* Field errors map to forms
* Query keys follow one standard
* Query retries use controlled rules
* Session status is explicit
* Permissions are exposed consistently
* Message behavior is centralized
* Theme behavior is centralized
* Network state is centralized
* Storage access uses one abstraction
* Provider composition is centralized
* API and session services avoid circular dependencies
* Tests cover critical shared-service behavior

---

# Foundation Rules Established in Part 2

The following rules are mandatory:

1. One global API client is used throughout the frontend.
2. Pages and components do not use raw HTTP clients directly.
3. Module API functions use relative backend paths.
4. Request headers are assembled centrally.
5. API language headers follow the active frontend language.
6. Requests support cancellation and timeouts.
7. API responses use one shared envelope.
8. Transport and backend failures normalize into one error type.
9. Machine-readable backend error codes drive translation.
10. Field-level backend errors use a shared mapping utility.
11. Query keys begin with backend-aligned module names.
12. Query-key factories are defined per module.
13. Mutations do not retry automatically by default.
14. Session state uses explicit statuses.
15. Session refresh is coordinated centrally.
16. Only one refresh request may run at a time.
17. Refresh endpoints must not trigger refresh loops.
18. Permissions come from backend-defined capability identifiers.
19. Frontend permission checks do not replace backend authorization.
20. Messages use one provider and one hook.
21. Theme preference uses one provider and storage abstraction.
22. Network state uses one provider and platform service.
23. Storage keys are centralized and versioned where appropriate.
24. Context hooks fail clearly when used outside their provider.
25. API and session infrastructure must avoid circular imports.
26. Authentication persistence is not selected by individual modules.
27. Shared services must remain testable outside React where possible.
28. Provider behavior must have automated tests.

---

# Part 2 Summary

The TEED frontend foundation should provide one reusable API transport layer, one normalized error model, one query-key convention, and one set of application-wide provider contracts.

The API client should centralize request construction, language headers, request identifiers, timeouts, cancellation, response parsing, authentication integration, and safe retry behavior.

Session handling should expose explicit states, coordinate refresh attempts, centralize logout cleanup, and provide stable backend-defined permissions.

Messages, themes, network state, translation, and storage should be exposed through shared services and providers rather than recreated inside business modules.

The next section should define:

* Base global components
* Form-control components
* Layout primitives
* Loading and error components
* Accessibility contracts
* Design-token implementation
* Theme CSS implementation
* Message presentation
* Responsive foundation
* Shared test utilities