# Notifications module

`apps.notifications` owns personal inbox delivery records, read state, expiration, categorization, deduplication, and safe internal action paths. It does not own the action described by a notification. Security creates security notifications; future Workspace code will create invitation notifications while Workspace remains responsible for accepting or declining them.

Stored templates are stable codes rather than translated prose. A small allow-listed context supports bilingual client rendering without storing arbitrary personal information. External action URLs and non-dashboard paths are rejected to prevent open redirects and phishing links.

Every query is scoped to the authenticated user. Reading a foreign notification returns not found and does not reveal whether it exists. Expired records are hidden, pagination is bounded by global API defaults, and unread counts are calculated from visible records.

The initial producers are password change and session revocation. Fake workspace invitations and demonstration messages are not generated.
