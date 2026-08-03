"""Profile subdomain of the personal dashboard.

The existing ``apps.profiles`` Django application remains the runtime and
migration owner during the structural transition. Keeping that app label
stable protects already-applied migrations and existing database tables.

New dashboard-owned profile code should be introduced through this namespace
and moved from the compatibility application only through an explicit,
tested migration plan.
"""

from apps.profiles.models import UserProfile

__all__ = ["UserProfile"]
