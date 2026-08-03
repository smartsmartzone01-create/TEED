# Profile subdomain transition

The active Profile implementation remains in `apps.profiles` for migration compatibility. This directory is the approved destination boundary under the Dashboard domain.

Do not duplicate Profile models or register a second Django app. Runtime relocation must preserve the existing `profiles` app label and database migration history.
