# Security and access UI

The dashboard Security destination has four stable routes: overview, password, sessions and devices, and security activity. Desktop navigation expands under the Security sidebar item; mobile routes use the same compact sub-navigation pattern as Profile.

`SecurityProvider` owns live reads and refresh-after-write behavior. Components do not call APIs directly. Services own transport and CSRF behavior, schemas validate envelopes, types describe UI contracts, and translation files provide English and Swahili copy.

The dashboard security state is sourced from the same overview API. It displays verified-email and active-session facts rather than a decorative percentage. Sensitive audit details are never accepted by frontend schemas and therefore cannot accidentally appear in the interface.
