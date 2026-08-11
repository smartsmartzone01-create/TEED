"""Dashboard notification composition boundary.

Persistent inbox state and APIs belong to ``apps.notifications``. The dashboard
may aggregate unread counts and links, but it must not duplicate that domain.
"""
