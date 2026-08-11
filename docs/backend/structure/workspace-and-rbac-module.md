# Workspace, Business and RBAC Module

## Ownership boundary

`apps.workspaces` owns Business tenancy, membership, invitations, access requests, protected Business lifecycle decisions and workspace audit events. It does not own billing, commerce or future Business-domain records.

For the current architecture, one Business is one Workspace. The Business UUID is both tenant identifier and workspace context identifier. A second Workspace model must not be introduced unless TEED later supports multiple operational workspaces inside one legal Business.

## Internal organization

`apps.workspaces` is one Django application and migration boundary, divided by
domain responsibility:

```text
apps/workspaces/
├── business/          # Business identity and creation
├── rbac/              # memberships, fixed roles and authorization policy
├── invitations/       # Business-initiated membership invitations
├── access_requests/   # user-initiated membership requests
├── lifecycle/         # dual-approved Business state transitions
├── audit/             # immutable workspace audit records
├── migrations/
├── tests/
├── models.py          # Django model-discovery exports only
├── api.py             # route composition
├── serializers.py     # shared HTTP contracts
├── services.py        # cross-domain transaction orchestration
└── urls.py
```

Internal packages own their models and stable import surfaces. Top-level
composition files may coordinate transactions spanning multiple packages, but
must not become a second domain. Business profile and settings belong under
`business/` when their real contracts are implemented; empty folders are not
created in advance.

## Tenant rules

- Every persistent workspace object uses a UUID primary key.
- Business creation and Owner membership creation are one transaction.
- Membership is the only user-to-Business authorization relationship.
- Every tenant query includes the Business UUID and verified membership.
- Unauthorized tenants receive not-found responses to reduce enumeration.
- The backend is authoritative; frontend visibility is not authorization.
- Suspended and removed memberships lose authority immediately.
- The Owner cannot be removed or demoted; ownership uses a dedicated transfer.

## Fixed policy

TEED defines five immutable roles: Owner, Partner, Administrator, Manager and Member. The database stores the role; version-controlled backend policy maps it to permissions. There are no tenant-created roles, permission records or permission-editing APIs.

The deliberately small permission vocabulary is:

- `workspace.access`
- `business.manage`
- `members.manage`
- `invitations.manage`
- `business.control`
- `business.transfer_ownership`

Protected-role rules supplement this mapping. Having `members.manage` never permits an Administrator to modify an Owner or Partner.

## Invitations and access requests

An invitation is Business-initiated and targets an account email. An access request is user-initiated and targets a known Business UUID. They are separate audited state machines. Accepting an invitation or approving a request creates or activates membership in the same transaction as the decision.

Access requests work from both the personal dashboard and a workspace switcher. TEED must not expose unrestricted Business discovery merely to support requests; callers need a Business UUID or a future controlled public reference.

## Owner and Partner control

Owner and Partner share operational control. Disable, reactivate, delete and cancel-deletion require independent approval:

1. One controller creates a request.
2. Another active controller approves or rejects it.
3. The initiator cannot resolve their own request.
4. Requests expire after 24 hours.
5. Deletion first enters recoverable `deletion_pending` state.

This prevents one compromised controller session from immediately disabling or destroying the tenant.

## Cross-domain communication

Workspace changes write audit events and use `apps.notifications` for personal inbox delivery. Future Business applications import workspace authorization and scope every query with validated membership; they must not duplicate roles or create separate membership tables.
