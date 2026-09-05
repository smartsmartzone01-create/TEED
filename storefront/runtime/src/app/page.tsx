import { FeaturedProductsSection } from "@/components/home/featured-products-section";
import { HeroSection } from "@/components/home/hero-section";
import { ServicesSection } from "@/components/home/services-section";
import { StorefrontShell } from "@/components/storefront-shell";
import { getStorefrontProducts, getStorefrontSite } from "@/services/storefront-api";

export default async function HomePage() {
  const [site, products] = await Promise.all([getStorefrontSite(), getStorefrontProducts()]);

  return (
    <StorefrontShell site={site}>
      <main>
        <HeroSection site={site} />
        <FeaturedProductsSection site={site} products={products} />
        <ServicesSection site={site} />
      </main>
    </StorefrontShell>
  );
}
