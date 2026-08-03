# Dashboard backend module

## Purpose

The dashboard backend groups small personal-account capabilities that belong to the same user-facing account boundary. It is not a generic home for unrelated business logic.

The target source layout is:

```text
backend/apps/
├── dashboard/
│   ├── profile/
│   ├── preferences/
│   └── notifications/
├── security/
└── workspace/
```

Security and workspace are separate top-level domains. Security owns trust-sensitive capabilities such as sessions, devices, credentials, recovery, access controls, and security events. Workspace owns collaborative and business-account capabilities.

## Dashboard subdomains

### Profile

Profile owns personal profile presentation and optional personal data that does not belong to Identity. Identity remains authoritative for authentication identifiers, verification state, username, primary email, primary phone number, country, and onboarding-owned identity fields.

### Preferences

Preferences owns personal application behavior:

- language
- appearance: system, light, or dark
- timezone
- date format
- time format
- reduced motion

Preferences does not own country, region, authentication security, workspace configuration, billing, or business settings.

### Notifications

Notifications will own personal notification configuration. Operational delivery infrastructure may be separated later if its reliability, queueing, provider, or audit responsibilities become an independent bounded context.

## Django migration compatibility

The existing `apps.profiles` Django application has applied migrations and existing database tables. Renaming that Django app directly would cause migration-history drift because Django identifies migrations by app label.

For the foundation transition:

- `apps.dashboard` is introduced as the new source-level umbrella namespace.
- `apps.profiles` remains the installed runtime and migration owner.
- `apps.dashboard.profile` provides the new architectural boundary without changing the current app label, routes, model table, or API contract.
- Future relocation of runtime code must preserve the `profiles` app label or include an explicit migration-state plan.

This compatibility boundary is intentional and temporary. It protects deployed databases while allowing new dashboard subdomains to follow the approved structure immediately.

## Route stability

This structural foundation does not rename existing profile routes. API route changes, if ever required, must be proposed independently and include frontend compatibility and regression coverage.

## Guardrails

The dashboard module must not become a miscellaneous container. A capability belongs here only when it controls a user's personal account presentation or personal TEED experience and does not justify a separate trust, business, or operational domain.
