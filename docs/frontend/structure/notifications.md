# Notifications UI

The notification inbox follows the frontend responsibility-first structure: components, provider, services, schemas, types, route, and bilingual messages remain in their corresponding top-level directories.

`NotificationsProvider` supplies the inbox, unread count, filters, pagination, and mutation refresh. It polls every 30 seconds and refreshes when a hidden tab becomes visible. This provides a live-enough deployable foundation without introducing WebSocket infrastructure prematurely.

The unread count is shared by the header bell, mobile menu, dashboard state card, and inbox. Category and unread filters reset pagination. Action links are rendered only from server-validated dashboard paths and take users to the module that owns the actual work.
