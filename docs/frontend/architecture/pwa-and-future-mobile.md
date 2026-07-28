# Frontend PWA and Future Mobile Architecture

## Status

PWA installation, service-worker behavior, offline workflows, and native
wrapping are planned. They are not implemented in the current repository.

The current frontend must avoid choices that unnecessarily block these future
capabilities.

## Objectives

- installable web experience;
- responsive standalone display;
- predictable updates;
- safe behavior during poor connectivity;
- future platform adapters without moving backend authority to the client;
- one client-agnostic backend contract.

## Progressive enhancement

The application must remain usable in a normal browser before installation.
PWA capabilities enhance delivery; they do not create a separate business
application.

## Manifest

The future manifest will define:

- application name and short name;
- icons and theme colors;
- start URL and scope;
- standalone display;
- orientation only when product requirements justify it.

Manifest metadata and icons must support TEED branding and accessibility.

## Service worker boundary

A service worker may own:

- versioned static-asset caching;
- controlled navigation fallbacks;
- update detection;
- carefully selected background operations.

It must not own business rules, authorization, source-of-truth session state,
or unrestricted caching of private API responses.

## Offline policy

Offline behavior must be defined per resource:

- marketing shell may use cached static assets;
- translation resources may be cached by version;
- protected and sensitive API data is not cached by default;
- mutations should fail clearly unless an explicit queued/idempotent design
  exists;
- stale information must be visibly identified.

“Offline-ready” does not mean every operation works offline.

## Updates

Service-worker updates must not activate unpredictably during important forms
or transactions. The UI should notify the user when a safe refresh is
available and explain when an update is mandatory.

## Storage

Browser storage requires:

- a named owner;
- a data classification;
- a retention period;
- versioning and migration;
- corruption fallback;
- sign-out cleanup where relevant.

Sensitive credentials and private business datasets are prohibited unless a
separate reviewed security decision approves them.

## Connectivity

Network status is a hint, not proof. Requests remain the final connectivity
check. UI should distinguish:

- offline;
- request timeout;
- backend unavailable;
- authentication expired;
- recoverable stale data.

## Future mobile packaging

Potential wrappers must consume platform-neutral services and schemas. Browser
capabilities such as storage, notifications, files, camera, and deep links
should be accessed through adapters when a second platform actually requires
them.

Do not adopt a wrapper technology before requirements for distribution,
notifications, files, background operation, and authentication are known.

## Backend requirements

The backend remains client-agnostic:

- versioned JSON contracts;
- token/session behavior not tied to one UI;
- explicit capabilities and permissions;
- idempotency for safely retried mutations;
- stable error codes;
- no trust in client platform claims.

## PWA implementation gate

Before enabling a service worker:

- the finalized identity/session transport is implemented in the frontend;
- caching policy is reviewed;
- manifest and icon assets exist;
- offline and update UX is designed;
- production HTTPS is available;
- automated production-build tests exist;
- cache invalidation and rollback are documented.
