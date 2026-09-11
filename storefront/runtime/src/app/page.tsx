import { StorefrontShell } from "@/components/storefront-shell";
import { EcommerceClassicHome } from "@/components/templates/ecommerce/classic/ecommerce-classic-home";
import { getStorefrontProducts, getStorefrontSite } from "@/services/storefront-api";

export default async function HomePage() {
  const [site, products] = await Promise.all([getStorefrontSite(), getStorefrontProducts()]);

  return (
    <StorefrontShell site={site}>
      <EcommerceClassicHome site={site} products={products} />
    </StorefrontShell>
  );
}
