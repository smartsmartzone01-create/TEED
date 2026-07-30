# Profile Module

## Responsibility

`apps.profiles` composes the user's purposeful profile experience without
becoming a second identity system. It supports the dashboard's Profile
Overview, Personal Information, Edit Profile, and Contact Information screens.

The module owns only:

- optional user profile image references;
- region;
- completion and contact-summary presentation rules.

Identity owns authentication identifiers, verified contacts, onboarding,
sessions, security, and the account record. The profile module may update
approved presentation fields through an explicit service boundary, but it
must not modify primary email, primary phone, or verification state.

## Internal structure

```text
apps/profiles/
├── api/
├── migrations/
├── models/
├── repositories/
├── selectors/
├── serializers/
├── services/
├── tests/
├── admin.py
├── apps.py
├── permissions.py
└── urls.py
```

The model is deliberately small. Adding a field requires a current user or
business workflow, a documented purpose, an access policy, and retention or
deletion behavior.

## Image policy

The image exists to make a person recognizable to members of businesses in
which that person participates. It is optional and excluded from required
completion. Initials remain the frontend fallback.

Uploads are restricted by size, dimensions, and decoded image format. Generated
storage names avoid exposing submitted filenames. Replaced and removed images
are deleted from storage after the database transaction commits.

Production object storage must enforce private-by-default access or controlled
delivery. Local `MEDIA_URL` serving exists only while Django debug mode is
enabled.

## Contact policy

The contact endpoint explains why the current primary email and phone exist and
whether a recovery flow currently supports them. It does not imply that phone
recovery exists before phone verification and an SMS provider are implemented.

Secondary contacts must not be stored merely for completeness. They require a
defined purpose and full verification, security, recovery, retention, and user
removal workflows.

## Privacy boundary

Privacy is platform-wide and is not owned by Profiles. Profile interfaces
provide contextual purpose explanations, while the application privacy notice,
cookie policy, data-subject requests, processor disclosures, and policy
versions belong to a future cross-application privacy capability.

Profile audit events contain changed field names and request security metadata,
not old or new personal values.
