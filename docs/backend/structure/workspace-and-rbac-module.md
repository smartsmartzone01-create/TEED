# Workspace, Business and RBAC Module

## Ownership boundary

`apps.workspaces` owns Business tenancy, profile, workspace preferences, membership, invitations, access requests, protected Business lifecycle decisions and workspace audit events. It does not own billing, commerce or future Business-domain records.

For the current architecture, one Business is one Workspace. The Business UUID is both tenant identifier and workspace context identifier. A second Workspace model must not be introduced unless TEED later supports multiple operational workspaces inside one legal Business.

## Internal organization

`apps.workspaces` is one Django application and migration boundary, divided by
domain responsibility:

```text
apps/workspaces/
├── business/          # Business identity, profile, preferences and creation
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
`business/`; they do not create a second tenant or authorization boundary.

## Business management contract

Every Business receives one profile and one settings record. Creation provisions both records atomically with the Business and Owner membership. A data migration provisions them for existing Businesses.

The profile owns focused Business presentation and operating context: optional logo, controlled Business category, physical/online/hybrid operating model, region, city, address, and two brand colors. The settings record owns workspace language, timezone, date/time formats, discoverability and whether adaptive branding is enabled.

Business name and public handle are intentionally separate. Name changes do not silently break a known public reference. Handle changes are explicit, unique, audited and cooldown-protected.

Adaptive brand colors are presentation data, not authorization or safety state. Consumers may use them for workspace navigation, progress and decorative emphasis. They must retain system-defined colors for errors, warnings, success and destructive controls.

## Tenant rules

- Every persistent workspace object uses a UUID primary key.
- Every Business receives a unique generated public handle for user-facing discovery; the UUID remains the internal tenant and authorization identifier.
- Business creation and Owner membership creation are one transaction.
- Membership is the only user-to-Business authorization relationship.
- Every tenant query includes the Business UUID and verified membership.
- Unauthorized tenants receive not-found responses to reduce enumeration.
- The backend is authoritative; frontend visibility is not authorization.
- Suspended and removed memberships lose authority immediately.
- Membership state is scoped by the `(Business UUID, user UUID)` pair. Approval, suspension, removal, and reactivation in one Business never mutate another Business membership owned by the same person.
- Active member lists expose active and suspended memberships; removed memberships remain available only as audit history. A removed user may submit a new request and approval reactivates the same unique membership record.
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
Owner and Partner share operational and protected-control permissions. The unique Owner alone receives `business.transfer_ownership`, because only the active Owner can transfer that unique role to an active Partner.

## Invitations and access requests

An invitation is Business-initiated and targets an account email. An access request is user-initiated and targets a Business selected through controlled discovery. The selected public result resolves to the Business UUID before submission. They are separate audited state machines. Accepting an invitation or approving a request creates or activates membership in the same transaction as the decision. A member with `invitations.manage` may cancel a pending invitation; the cancellation is persisted and audited rather than deleting history.

Access requests work from both the personal dashboard and a workspace switcher. Discovery requires authentication and completed onboarding, is throttled, excludes Personal Brand workspaces, and exposes only the minimum public identity needed to choose the correct Business. Duplicate, existing-member, unavailable and recently-rejected states use focused domain error codes.

## Workspace classification and capability policy

Creation asks only for a name, country and one broad workspace type: Business, Service, or Personal Brand. TEED generates the public handle and UUID automatically. Type is not descriptive metadata: version-controlled backend policy maps it to capabilities. RBAC continues to govern member authority independently.

Business category is a separate controlled profile value: Retail and commerce, Food and hospitality, Professional services, Health and wellness, Education and training, Technology and digital, Creative and media, Manufacturing and agriculture, Nonprofit and community, or Other. It supplies useful product and future AI context without changing authorization.

Personal Brand workspaces are single-user. They cannot receive invitations, access requests or additional memberships. A collaborative workspace cannot become Personal Brand until all other active memberships are removed. This prevents a type change from silently contradicting tenant access state.

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

Social account connectivity is a future integration boundary, not a workspace membership concern. OAuth credentials, provider identities, webhook state, sync cursors and provider audit history should live in a dedicated integrations application scoped to a Business UUID. Workspace and Business profile contracts remain provider-neutral so those integrations can be added without refactoring tenancy or RBAC.
