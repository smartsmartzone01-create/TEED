# Workspace and Business API

Base path: `/api/v1/workspaces/`

All identifiers are UUIDs. All endpoints require an authenticated user with completed onboarding. Browser mutations require CSRF protection.

## Business

| Method | Route | Purpose |
|---|---|---|
| `GET` | `businesses/` | List the caller's Business memberships |
| `POST` | `businesses/` | Create a Business, unique public handle and atomic Owner membership |
| `GET` | `businesses/discover/?q={identity}` | Search active discoverable Businesses by any non-empty name or public handle, or by exact UUID |
| `GET` | `businesses/{business_id}/` | Read an active Business in the caller's workspace context |
| `GET` | `businesses/{business_id}/overview/` | Read the Business, caller membership, permission-filtered pending counts, and active member count |
| `GET/PATCH` | `businesses/{business_id}/profile/` | Read or update Business identity, logo, brand colors, location and operating details |
| `GET/PATCH` | `businesses/{business_id}/settings/` | Read or update discoverability, branding and regional display preferences |
| `GET` | `businesses/{business_id}/security/` | Read fixed permissions, controllers, pending controls and recent audit activity |

Profile and settings reads are available to active members. Mutations require the fixed `business.manage` permission. Public-handle changes are explicit, unique, audited and subject to a configured cooldown; changing the Business name never changes its handle automatically. Converting a collaborative workspace to Personal Brand is blocked until every other active membership is removed.

Business branding accepts two `#RRGGBB` colors. The frontend scopes them to workspace identity accents and never replaces semantic success, warning, error or destructive colors.

## Membership and fixed roles

| Method | Route | Purpose |
|---|---|---|
| `GET` | `businesses/{business_id}/members/` | List Business memberships |
| `PATCH` | `businesses/{business_id}/members/{membership_id}/` | Change an allowed fixed role or membership state |
| `POST` | `businesses/{business_id}/ownership-transfer/` | Transfer Owner authority to an active Partner |

Roles are `owner`, `partner`, `administrator`, `manager`, and `member`. Permissions are assigned automatically by backend policy and cannot be customized through the API.

## Invitations

| Method | Route | Purpose |
|---|---|---|
| `GET/POST` | `businesses/{business_id}/invitations/` | List or create invitations |
| `POST` | `businesses/{business_id}/invitations/{invitation_id}/cancel/` | Cancel a pending invitation |
| `GET` | `invitations/me/` | List pending invitations matching the caller's email |
| `POST` | `invitations/{invitation_id}/accept/` | Accept and create membership atomically |
| `POST` | `invitations/{invitation_id}/decline/` | Decline an invitation |

## Access requests

The same request endpoint supports a user without a Business from the personal dashboard and an existing member requesting another Business from workspace navigation.

| Method | Route | Purpose |
|---|---|---|
| `POST` | `access-requests/` | Request access using the UUID selected from controlled discovery |
| `GET` | `businesses/{business_id}/access-requests/` | List pending requests |
| `POST` | `businesses/{business_id}/access-requests/{request_id}/decision/` | Approve or reject |

Discovery requires authentication and completed onboarding, is throttled, excludes Personal Brand workspaces, and returns only UUID, name, public handle, country and workspace type. Business display names may repeat because legitimate organizations can share a name; UUID remains the internal tenant identifier and the unique public handle is the user-facing discovery reference.

Workspace types are `business`, `service`, and `personal_brand`. They form a capability-policy layer beneath RBAC: roles decide what a member may do, while workspace type decides which product domains may exist. Personal Brand workspaces are single-user and reject invitations, access requests and member management.

Every authenticated Business response includes backend-defined `capabilities`. Current capabilities distinguish Business operations, Service operations, Personal Brand tools, collaboration, social presence and future AI guidance. Billing may later consume the same entitlement boundary, but plan selection must not override authorization.

## Protected Business control

| Method | Route | Purpose |
|---|---|---|
| `POST` | `businesses/{business_id}/control-requests/` | Request disable, reactivate, delete, or cancel-deletion |
| `POST` | `businesses/{business_id}/control-requests/{control_request_id}/decision/` | Independently approve or reject |

A sole active Owner completes valid lifecycle actions immediately. If an active Partner exists, an independent Owner or Partner must approve; the initiator cannot approve their own request. Approved deletion enters recoverable `deletion_pending` and never immediately destroys tenant data.
