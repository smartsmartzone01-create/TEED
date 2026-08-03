"""Personal dashboard domain.

The dashboard package groups user-facing account capabilities that share the
same personal-account boundary without forcing every small capability to become
an independent Django application.

Current subdomains:
- profile: personal profile information
- preferences: personal application preferences
- notifications: personal notification configuration

Security and workspace remain separate top-level domains.
"""
