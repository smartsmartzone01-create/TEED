import { StorefrontCustomerPasswordReset } from "@/components/customer-auth/storefront-customer-password-reset";
import { StorefrontShell } from "@/components/storefront-shell";
import { getStorefrontSite } from "@/services/storefront-api";

export default async function ForgotPasswordPage() {
  const site = await getStorefrontSite({ fresh: true });

  return (
    <StorefrontShell site={site}>
      <main className="storefront-customer-auth-page">
        <div className="page-shell storefront-customer-auth-page-inner">
          <StorefrontCustomerPasswordReset locale={site.defaultLocale} />
        </div>
      </main>
    </StorefrontShell>
  );
}
