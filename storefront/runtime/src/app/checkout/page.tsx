import { StorefrontCheckout } from "@/components/checkout/storefront-checkout";
import { StorefrontShell } from "@/components/storefront-shell";
import { getStorefrontSite } from "@/services/storefront-api";

export default async function CheckoutPage() {
  const site = await getStorefrontSite();

  return (
    <StorefrontShell site={site}>
      <main className="checkout-page">
        <div className="page-shell checkout-page-shell">
          <StorefrontCheckout siteId={site.id} locale={site.defaultLocale} />
        </div>
      </main>
    </StorefrontShell>
  );
}
