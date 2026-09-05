# Tunakuza Storefront

This directory separates the recovered storefront reference from the new Tunakuza-compatible runtime.

- `ecommerce-template/` is the recovered Django storefront. Keep it as a UI/UX and behavior reference while migration is in progress.
- `runtime/` is the new externally hostable storefront application. It must consume Tunakuza through a public storefront API and must never connect directly to the Tunakuza database.

## Runtime boundary

The storefront runtime owns public presentation only: branding, navigation, pages, sections, product discovery, cart/checkout UI, and public customer interactions.

Tunakuza remains the source of truth for business identity, catalog SKUs, prices, inventory, orders/sales, and future payment/fulfillment workflows.

The runtime is intentionally deployable independently so a merchant can use their own host and domain.

## Current phase

The first runtime patch establishes configurable store identity and the public-site shell while preserving the strongest UI patterns from the recovered project. Product and checkout API contracts will be introduced incrementally after the public backend boundary is designed.
