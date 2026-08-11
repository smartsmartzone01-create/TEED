# Security and access module

`apps.security` is a coordination boundary, not a second identity store. Identity continues to own users, credentials, sessions, verification state, and security events. Security selects and safely presents those records and coordinates authenticated security actions.

The module provides four user-facing capabilities: a factual overview, authenticated password change, session/device management, and sanitized activity history. It must not invent a security score. Recovery readiness is derived only from verified methods that the current backend can actually use.

Changing a password requires the current password, password confirmation, Django password validation, and a password different from the existing one. The current session stays active and all other sessions are revoked. Forgotten-password recovery remains a separate Identity flow.

Device descriptions are intentionally coarse. The raw user-agent is hashed for server-side audit correlation and is never returned. New sessions store only a broad device label, browser family, and operating-system family; old sessions safely fall back to “Unknown device.”

Activity output is an allow-list containing event type, outcome, time, the user's own IP address, and whether the event belongs to the current session. Audit metadata, identifiers, hashes, challenge IDs, codes, passwords, and tokens stay server-side.
