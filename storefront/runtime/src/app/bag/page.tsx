import { StorefrontBag } from "@/components/bag/storefront-bag";
import { StorefrontShell } from "@/components/storefront-shell";
import { getStorefrontSite } from "@/services/storefront-api";

export default async function BagPage() {
  const site = await getStorefrontSite();

  return (
    <StorefrontShell site={site}>
      <main className="bag-page">
        <div className="page-shell bag-page-shell">
          <StorefrontBag siteId={site.id} locale={site.defaultLocale} />
        </div>
      </main>
    </StorefrontShell>
  );
}
