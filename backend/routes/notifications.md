# Notification routes

All endpoints require an authenticated, onboarding-complete user. Mutation endpoints also use TEED's CSRF contract.

| Method | Route | Purpose |
| --- | --- | --- |
| `GET` | `/api/v1/notifications/me/` | Paginated personal inbox and total unread count |
| `POST` | `/api/v1/notifications/me/{notification_id}/read/` | Mark one owned notification as read |
| `POST` | `/api/v1/notifications/me/read-all/` | Mark all currently visible notifications as read |

The list accepts `page`, `page_size`, `category`, and `unread=true`. Supported categories are `security`, `account`, `workspace`, and `system`. Expired notifications are excluded.

Notification action paths must be internal `/dashboard...` paths. The inbox never executes the domain action itself; it only links to the responsible module.
