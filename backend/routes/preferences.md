# Dashboard preferences routes

Preferences are owned by the dashboard domain while the existing `profiles` Django app remains the migration and route namespace owner.

## Retrieve preferences

`GET /api/v1/profiles/me/preferences/`

Creates the authenticated user's preference record lazily when it does not exist and returns:

- `language`: `en` or `sw`
- `appearance`: `system`, `light`, or `dark`
- `timezone`: valid IANA timezone identifier
- `date_format`: `DD/MM/YYYY`, `MM/DD/YYYY`, or `YYYY-MM-DD`
- `time_format`: `12h` or `24h`
- `reduced_motion`: boolean
- `updated_at`: server timestamp

The backend fallback timezone is `UTC`. The frontend is responsible for detecting the browser timezone on first use and persisting it through PATCH.

## Update preferences

`PATCH /api/v1/profiles/me/preferences/`

Accepts any non-empty subset of the writable fields. Invalid choices, invalid IANA timezone identifiers, and empty updates return the standard TEED validation-error envelope.

Both routes require authentication and completed onboarding.
