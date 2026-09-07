# Tunakuza Website / Storefront Implementation Handoff

> Purpose: durable implementation context for resuming Website/storefront work in another ChatGPT window or developer session.
>
> This document describes the architecture, the recovered ecommerce reference, the new runtime, the Website bounded context, the Commerce integration boundary, what has already been tested, known caveats, and the recommended next implementation steps.

## 1. Branch and repository status

This work currently lives on:

```text
agent/storefront-ecommerce-import
```

Pre-handoff remote head inspected on 2026-09-08:

```text
5871f69be687c4271231bb42f6cf7e2bd332f1da
style(workspace): match capability directory reference UI
```

The immediately preceding Website integration commit is:

```text
f0f219039f3622d2ea21dbac06a21f7fe481d2d9
refactor(website): consume Commerce storefront projection
```

At inspection time the branch had diverged from `main`: it was 15 commits ahead and 39 commits behind. `main` did not contain the Website module or the `storefront/` tree. Therefore this branch still contains real unmerged feature work and must not be treated as disposable.

Do not merge or modify `main` casually. Reconcile the branch with current `main` deliberately before any eventual merge, because `main` contains newer Commerce/Stock work that may overlap with this branch.

## 2. Original architectural goal

Tunakuza should help a merchant create and operate a website/ecommerce storefront, but Tunakuza itself does not need to host the merchant's public website.

The intended deployment boundary is:

```text
customer-domain.com
      |
      v
externally hosted storefront/runtime
      |
      | HTTPS / public API
      v
Tunakuza Website public API
      |
      +-- Website-owned public presentation
      |     branding
      |     descriptions
      |     images
      |     navigation
      |     SEO/content
      |     public listings/options
      |
      +-- optional Commerce integration
            SKU identity
            price
            inventory
            tracked units
            availability
```

The external storefront must never receive Tunakuza database credentials and must never connect directly to the Tunakuza database.

## 3. The three storefront pieces

Never confuse these three directories/domains.

### `storefront/ecommerce-template`

This is the recovered historical Django ecommerce project. It is a **UI/UX and behavioral reference**, not the architecture for Tunakuza Website.

The recovered branch contains, among other things:

```text
storefront/ecommerce-template/
├── Images/
├── kajotz/
├── manage.py
├── static/
├── store/
├── package.json
└── tailwind.config.js
```

Useful reference material includes:

- homepage and banners;
- header/footer and mobile navigation;
- product listing and filtering/search ideas;
- product detail layout;
- cart and checkout patterns;
- saved items;
- customer account/profile/order patterns;
- FAQ and legal/about pages;
- newsletter;
- images, icons, CSS and JavaScript behavior.

Important: do **not** revive its Django models/cart/orders as a second business backend. Tunakuza remains the business system.

Think of this directory as **Template #1 source material**.

### `storefront/runtime`

This is the new customer-facing storefront that merchants could actually deploy to their own host/domain.

It is a separate Next.js application and owns public presentation only.

Current/future responsibilities include:

```text
homepage
header/footer
catalog listing
product detail
English/Swahili presentation
images/theme/navigation
future cart
future checkout
future customer interactions
```

It must know only the public Website contract. It must not know Django table structure, `StockBatch`, `TrackedUnit`, receipt internals, or private Commerce APIs.

The runtime currently reads:

```text
STOREFRONT_API_URL
STOREFRONT_SITE_KEY
```

and calls endpoints under:

```text
/api/public/storefront/sites/{site_key}/
/api/public/storefront/sites/{site_key}/products/
/api/public/storefront/sites/{site_key}/products/{slug}/
```

If either environment variable is absent, the runtime currently falls back to demo site/catalog data. This can make integration testing look successful while actually showing demo products, so always verify the site name/data when testing the real backend.

The root `.gitignore` ignores `.env` and `.env.*`, so local `.env.local` configuration should remain uncommitted.

### `backend/apps/website`

This is the **Tunakuza Website bounded context / Website engine**.

Website is not Commerce. A workspace should eventually be able to use combinations such as:

```text
Website only
Website + Commerce
Website + Services
Website + Restaurant
Website + School
...
```

Commerce is therefore an optional integration, not a prerequisite for Website.

## 4. Website domain ownership

### `WebsiteSite`

Represents the public site and currently owns site-level configuration including:

- workspace/business;
- public key;
- slug/display name;
- default and supported locales;
- theme colors;
- contact details;
- navigation;
- hero content;
- services;
- newsletter configuration;
- publishing state.

English and Swahili are the currently supported public locales.

### `WebsiteListing`

Represents the public product/listing presentation and owns things such as:

- slug;
- localized title;
- short/long description;
- brand;
- badge;
- primary image;
- Website-defined options;
- publish/sort state.

### `WebsiteVariant`

Represents a sellable/public variant. It may be standalone or optionally linked to Commerce:

```python
commerce_product = ForeignKey(
    "commerce.Product",
    null=True,
    blank=True,
)
```

This nullable relationship is intentional.

Price and availability can independently be sourced from:

```text
website
commerce
```

A linked Commerce product must belong to the same workspace as the Website site.

## 5. Public Website contract

The external runtime receives serialized contracts, not Django models.

The main contract code lives in:

```text
backend/apps/website/contracts.py
```

A site contract includes public site identity, locales, theme, contact, navigation, hero, services and newsletter configuration.

A listing contract includes public listing metadata plus:

```text
options
skus
```

Website-defined options are merged with safe options derived from Commerce-backed individual inventory.

The purpose of the contract is to keep the public storefront stable even if Tunakuza changes internal database tables or operational services later.

## 6. Public API boundary

The public API lives primarily in:

```text
backend/apps/website/public_api.py
```

Public storefront views use no Tunakuza user authentication because public shoppers should not need Tunakuza accounts:

```text
authentication_classes = []
permission_classes = [AllowAny]
```

The API still requires the Website site to be published, the workspace/business to be active, and the caller to use a valid public site key. A dedicated public storefront throttle is also applied.

The intended flow is:

```text
Browser
  -> storefront/runtime
  -> Website public API
  -> Website resolver/contracts
  -> Commerce public-safe projection when needed
```

Do not expose internal Commerce endpoints to the storefront.

## 7. Commerce tracking invariant

The canonical invariant is:

```text
ONE SKU = ONE TRACKING MODE
```

One SKU is either:

```text
quantity
```

or:

```text
individual
```

but never both.

A store/workspace may absolutely contain a mixture of different SKUs using different tracking modes. Example:

```text
iPhone       -> individual
Samsung      -> individual
Charger      -> quantity
Cable        -> quantity
Protector    -> quantity
```

`Product.tracking_mode` is authoritative. Historical receipt/stock provenance must not reinterpret the SKU tracking mode.

## 8. Commerce is the inventory authority

Canonical Commerce exposure logic lives in:

```text
backend/apps/commerce/catalog/exposure.py
```

For a quantity SKU, canonical available quantity comes from `Product.current_quantity`.

For an individual SKU, canonical available quantity is the count of `TrackedUnit` records whose status is `AVAILABLE`.

Commerce now exposes consumer-specific projections rather than forcing Website, Search, Intelligence, Analytics, etc. to reverse-engineer raw Commerce models independently.

The Website-specific projection is:

```python
project_product_for_website(product)
```

It exposes public-safe information such as:

- product ID;
- SKU;
- brand/variant/unit;
- tracking mode;
- availability;
- selling price;
- grouped public attributes for individual units.

It deliberately excludes private operational information such as:

- IMEI;
- serial/internal serial;
- internal tracked-unit identifiers;
- receipt/MZIGO provenance;
- supplier;
- acquisition/cost price.

A public shopper may see `Black`, `256 GB`, `In stock`; they must never see an IMEI, supplier or internal receiving record.

## 9. Individual SKU grouping

For an individually tracked SKU, physical units must not become one storefront product choice per IMEI/serial.

Example internal inventory:

```text
unit 1 -> Black / 256 GB
unit 2 -> Black / 256 GB
unit 3 -> Black / 512 GB
unit 4 -> Blue / 256 GB
unit 5 -> Blue / 512 GB
```

The public storefront should derive customer-visible dimensions:

```text
Color: Black, Blue
Capacity: 256 GB, 512 GB
```

and then represent availability by public combination:

```text
Black + 256 GB -> in stock
Black + 512 GB -> out of stock
Blue + 256 GB  -> in stock
Blue + 512 GB  -> in stock
```

Commerce currently groups tracked units using these public-safe fields:

```text
model_name
brand
color
capacity
condition
```

Website converts those groups into public options/offers.

### Important current resolver rule

`backend/apps/website/catalog_resolver.py` currently activates a derived tracked-unit field only when:

1. there are Commerce offers;
2. **every offer has a non-empty value for that field**; and
3. the option is explicitly declared by Website **or** there is more than one distinct value.

This means one incomplete historical unit/group can prevent `Color`, `Capacity`, etc. from appearing as a selector at all. This is a likely explanation for the earlier real product page where the item was in stock but Color/Capacity selectors were missing.

Do not reintroduce a customer-visible fake value such as `Unspecified`. Instead, decide an explicit policy for incomplete inventory metadata.

Possible policy directions to evaluate:

- incomplete physical units are not storefront-sellable until required public attributes are completed;
- incomplete units count toward operational stock but not selectable online stock;
- required public attributes are defined per Website listing/product category;
- project only complete option combinations and expose a diagnostic/admin warning for excluded units.

The policy must be explicit before cart/order reservation logic depends on it.

## 10. Exact quantity visibility

Commerce should own the exact stock truth. Website should own the merchandising/display policy.

Future Website policy might allow:

```text
Availability only
Low-stock warning
Exact quantity
```

Example:

```text
Commerce truth: quantity = 19
Website policy A: In stock
Website policy B: Only 19 left
Website policy C: 19 available
```

This policy is **not implemented yet**. The current Website projection intentionally does not expose exact quantity publicly.

Do not confuse exact-stock display policy with the one-SKU/one-tracking-mode invariant.

## 11. Current real integration state

A real workspace/site named **Inventory Test Store** was used for end-to-end testing.

The important proof was that, after configuring `storefront/runtime/.env.local`, the runtime changed from demo identity (`Your Store`) to the real `Inventory Test Store` identity.

That proved the chain:

```text
browser
-> Next.js runtime
-> real public Website site key
-> WebsiteSite
-> real workspace
```

A real product page was also loaded successfully and showed the real SKU/price/availability. The unresolved issue was that expected individual attributes such as Color and Capacity did not appear.

Therefore the next investigation is primarily domain/data interpretation, not basic network connectivity.

Do not commit real local `.env.local` values or credentials. Retrieve the test site key from the local test database/configuration when needed.

## 12. Demo fallback warning

`storefront/runtime/src/services/storefront-api.ts` currently returns demo site/catalog data whenever either `STOREFRONT_API_URL` or `STOREFRONT_SITE_KEY` is missing.

During real integration tests, always verify at least one unmistakable real value such as the site display name or a known real SKU. Otherwise a polished demo storefront can hide a broken/missing backend connection.

## 13. Runtime caching warning

The runtime currently uses Next.js fetch revalidation windows (site approximately 60 seconds; products/product detail approximately 30 seconds).

When testing freshly recorded stock, remember that a browser refresh may not always mean a completely fresh backend request. If inventory changes seem not to appear, verify whether caching/revalidation is involved before assuming the Commerce projection is wrong.

For focused inventory debugging, consider a deliberate development-only no-cache strategy or explicit revalidation behavior rather than permanently weakening production caching.

## 14. Public option semantics need to stay explicit

Do not collapse every kind of Website option into one conceptual bucket.

At minimum keep these concepts distinct in future design:

1. **Inventory selection dimensions** — e.g. Color/Capacity/Condition that identify a Commerce-backed sellable configuration.
2. **Presentation options** — UI/content choices that do not change inventory identity.
3. **Order customizations** — e.g. gift wrap/engraving that affect an order but not the underlying Commerce SKU/unit grouping.

This distinction becomes important for cart, reservations, checkout and fulfillment.

## 15. Important code audit item

The public resolver correctly delegates Commerce inventory interpretation through `project_product_for_website()`.

However, `WebsiteVariant.resolved_availability()` still contains direct logic based on the linked product's `current_quantity`. For public Commerce-backed individual SKUs, the public resolver does not rely on that helper for final availability, but the helper remains a potential future source of inconsistent semantics if reused elsewhere.

Before declaring the Commerce <-> Website contract frozen, audit that helper and either:

- delegate it to Commerce canonical inventory state; or
- constrain/document it so it cannot become a second inventory interpretation path.

## 16. Performance audit item

The Website public API no longer directly prefetches raw tracked-unit/stock internals, which is a good domain-boundary cleanup.

But `project_product_for_website()` may query `product.tracked_units` when an individual product is projected. A catalog page with many individual SKUs could therefore produce repeated queries.

Do not solve this by making Website understand stock internals again. Prefer an optimization owned by Commerce (for example a Commerce selector/projection query plan or safe prefetch helper) so the domain boundary remains intact.

## 17. Testing already performed

The work was validated at several layers during the original implementation:

```text
Django             python manage.py check
Schema             python manage.py makemigrations --check --dry-run
Backend lint       python -m ruff check .
Commerce tests     python manage.py test apps.commerce.tests
Intelligence       python manage.py test apps.intelligence
Tunakuza frontend  pnpm lint / pnpm typecheck / pnpm build
Storefront runtime pnpm lint / pnpm typecheck / pnpm build
Real DB            Django shell inspection
Integration        runtime .env.local -> real public site
Browser            real site identity and real product detail
```

An obsolete Commerce test that allowed a quantity SKU to have an individual StockBatch was replaced with tests enforcing both directions of the one-SKU/one-tracking-mode invariant.

Do not claim these validations are current after future patches unless they are actually rerun.

## 18. What has not been built yet

The current storefront is an engineering foundation, not a completed ecommerce product.

Still incomplete/not implemented:

- full reconstruction of the recovered Django visual design in Next.js;
- Tunakuza Website builder/management UI;
- complete individual SKU option-matrix policy;
- merchant-configurable stock visibility;
- cart;
- Website orders;
- Commerce Sales synchronization;
- checkout;
- payments;
- delivery/fulfillment;
- domains;
- publishing/deployment workflow;
- mature customer accounts/order history.

The current disabled Add-to-bag behavior should not be treated as a bug until product selection/inventory semantics are stable enough to support cart contracts.

## 19. Recommended next validation

Before cart/orders, prove both tracking modes on the same real workspace using freshly and correctly recorded inventory.

### Case A: individual SKU

Example target dataset:

```text
iPhone
Black / 256 GB -> available
Black / 512 GB -> sold/out of stock
Blue  / 256 GB -> available
Blue  / 512 GB -> available
```

Expected storefront behavior:

```text
Color selector
Capacity selector
valid combinations represented correctly
availability calculated per combination
no IMEI/serial/internal identifiers exposed
```

Inspect each layer if it fails:

```text
TrackedUnit data
-> sku_inventory_state()
-> project_product_for_website()
-> resolve_storefront_variant()
-> serialize_listing()
-> public API JSON
-> runtime UI
```

This allows a precise distinction between bad data and bad resolver logic.

### Case B: quantity SKU

Example:

```text
Charger
tracking = quantity
quantity = 20
selling price = TZS X
```

Expected current behavior:

```text
correct price
correct in/low/out-of-stock state
no individual-unit selectors
```

Exact quantity display can be added later as Website policy.

## 20. Recommended implementation order

Do not jump directly to checkout.

Recommended sequence:

1. Record clean fresh quantity + individual inventory in the real test workspace.
2. Inspect Commerce projections directly in Django shell/tests.
3. Stabilize incomplete-metadata policy for individual units.
4. Stabilize Website option/offer matrix.
5. Add focused Commerce + Website tests for the canonical examples.
6. Verify public API JSON.
7. Verify runtime selectors and availability against the same cases.
8. Decide exact-stock display policy/contract.
9. Only then design cart line semantics and reservation/allocation.
10. Then proceed to orders, Sales synchronization, checkout/payment/fulfillment.

For individual products, cart selection should represent the public configuration (SKU + selected inventory dimensions) rather than exposing an IMEI/serial to the shopper. Actual physical-unit allocation/reservation belongs to Commerce/order fulfillment logic.

## 21. Local development checklist

Before resuming work in another window/session, first establish what code is actually checked out locally:

```powershell
git fetch origin
git branch --show-current
git rev-parse HEAD
git status --short
```

Then verify the critical feature files exist:

```powershell
Test-Path backend\apps\website\models.py
Test-Path backend\apps\commerce\catalog\exposure.py
Test-Path storefront\runtime\src\services\storefront-api.ts
Test-Path storefront\ecommerce-template\store\templates\store\product_detail.html
```

The first three are needed for the current end-to-end Website/Commerce/runtime implementation. The last one is only needed when consulting the recovered UI reference.

To test the real runtime locally, configure an uncommitted:

```text
storefront/runtime/.env.local
```

with:

```text
STOREFRONT_API_URL=http://127.0.0.1:8000
STOREFRONT_SITE_KEY=<real local published WebsiteSite public key>
```

Run the Tunakuza backend and the Next.js storefront runtime separately, then verify the runtime shows the real site identity rather than demo data.

## 22. Branch strategy before further implementation

The current storefront branch is valuable because it contains the unmerged Website/storefront feature, but it is behind current `main`.

Recommended rule:

- **Do not delete the branch.**
- **Do not merge it into `main` yet.**
- Before substantial new implementation, bring current `main` changes into a controlled storefront integration branch/worktree and resolve conflicts deliberately.
- Preserve `agent/storefront-ecommerce-import` as the known storefront feature history until the integration is proven.

A safe approach is to create a fresh integration branch from current `main` and then incorporate the storefront feature there (by carefully merging/cherry-picking the storefront commits), rather than blindly continuing on a branch that is many commits behind. This is especially important because current `main` contains newer Stock recording behavior needed for the fresh-inventory tests.

Do not accidentally carry the later unrelated Workspace Capability Directory UI commit merely because it sits at the storefront branch tip; decide explicitly whether that change belongs in the eventual integration.

## 23. Mental model

Keep this model fixed:

```text
storefront/ecommerce-template
= recovered old website
= visual/behavior reference only

storefront/runtime
= new deployable customer website
= presentation/client
= public API only

backend/apps/website
= Tunakuza Website engine
= site/listing/public contract/publishing
= optional Commerce link

backend/apps/commerce
= operational business engine
= SKU/tracking/inventory/sales truth
```

The architectural success so far is not that the old Django ecommerce project was converted into Tunakuza. The success is that its useful design knowledge was recovered while a new independently deployable storefront and a clean Tunakuza Website domain were created around a controlled public Commerce integration boundary.
