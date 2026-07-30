# Profile Routes

## Base path

```text
/api/v1/profiles/
```

Every profile endpoint requires an authenticated user who has completed
onboarding.

| Method | Path | Purpose |
| --- | --- | --- |
| `GET` | `/api/v1/profiles/me/overview/` | Completion state, verified-contact summary, prompts, and quick links |
| `GET` | `/api/v1/profiles/me/personal-information/` | Read the user's aggregated Identity and Profile information |
| `PATCH` | `/api/v1/profiles/me/` | Update allowed identity presentation fields and profile-owned fields |
| `DELETE` | `/api/v1/profiles/me/image/` | Remove the current profile image |
| `GET` | `/api/v1/profiles/me/contacts/` | Read primary contact purposes and verification states |

## Ownership

Identity remains the source of truth for:

- first and last name;
- username;
- country code;
- primary email and phone;
- contact verification state;
- account creation date.

Profiles owns:

- the optional user profile image;
- the user's region.

The profile API aggregates these sources for the dashboard. It does not copy
Identity fields into its own table.

## Update profile

`PATCH /api/v1/profiles/me/` accepts JSON or multipart form data:

```json
{
  "first_name": "Asha",
  "last_name": "Mushi",
  "username": "asha_m",
  "country_code": "TZ",
  "region": "Arusha"
}
```

An optional `profile_image` may be uploaded as JPEG, PNG, or WebP. Images are
limited to 5 MB and 4096 by 4096 pixels. The storage path uses generated names
and never trusts the submitted filename.

Primary email, phone, and verification flags are rejected with the
`managed_by_identity` field error. Their future change workflows require
Identity verification, security policy, and session decisions.

Successful changes record only changed field names and request security
metadata. Values and image contents are not copied into audit metadata.

## Completion

Required completion measures only fields with current product value:

- first name;
- last name;
- username;
- country;
- primary phone.

The profile image remains optional and is not required to reach 100 percent.
It may still appear as an optional prompt because it helps identify members
inside a business.

## Contacts

The contact response contains only primary email and phone records. Secondary
contacts are intentionally absent until TEED defines and implements a concrete
verification, notification, replacement, or recovery purpose.
