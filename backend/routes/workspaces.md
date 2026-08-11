# Workspace and Business API

Base path: `/api/v1/workspaces/`

All identifiers are UUIDs. All endpoints require an authenticated user with completed onboarding. Browser mutations require CSRF protection.

## Business

| Method | Route | Purpose |
|---|---|---|
| `GET` | `businesses/` | List the caller's Business memberships |
| `POST` | `businesses/` | Create a Business and atomic Owner membership |
| `GET` | `businesses/{business_id}/` | Read an active Business in the caller's workspace context |

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
| `GET` | `invitations/me/` | List pending invitations matching the caller's email |
| `POST` | `invitations/{invitation_id}/accept/` | Accept and create membership atomically |
| `POST` | `invitations/{invitation_id}/decline/` | Decline an invitation |

## Access requests

The same request endpoint supports a user without a Business from the personal dashboard and an existing member requesting another Business from workspace navigation.

| Method | Route | Purpose |
|---|---|---|
| `POST` | `access-requests/` | Request access using a known Business UUID |
| `GET` | `businesses/{business_id}/access-requests/` | List pending requests |
| `POST` | `businesses/{business_id}/access-requests/{request_id}/decision/` | Approve or reject |

## Protected Business control

| Method | Route | Purpose |
|---|---|---|
| `POST` | `businesses/{business_id}/control-requests/` | Request disable, reactivate, delete, or cancel-deletion |
| `POST` | `businesses/{business_id}/control-requests/{control_request_id}/decision/` | Independently approve or reject |

Business control requires an active Owner and Partner. The initiator cannot approve their own request. Approved deletion enters `deletion_pending`; it does not immediately destroy tenant data.

