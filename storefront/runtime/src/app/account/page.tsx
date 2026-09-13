import { StorefrontCustomerAccount } from "@/components/customer-auth/storefront-customer-account";
import { StorefrontShell } from "@/components/storefront-shell";
import { getStorefrontSite } from "@/services/storefront-api";

export default async function AccountPage() {
  const site = await getStorefrontSite({ fresh: true });

  return (
    <StorefrontShell site={site}>
      <main className="storefront-customer-auth-page">
        <div className="page-shell storefront-customer-auth-page-inner">
          <div className="storefront-customer-auth-stack">
            <StorefrontCustomerAccount locale={site.defaultLocale} siteName={site.displayName} />
          </div>
        </div>
      </main>
    </StorefrontShell>
  );
}
