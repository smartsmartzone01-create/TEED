import { StorefrontShell } from "@/components/storefront-shell";
import { EcommerceClassicHome } from "@/components/templates/ecommerce/classic/ecommerce-classic-home";
import { getStorefrontProducts, getStorefrontSite } from "@/services/storefront-api";

type HomePageProps = {
  searchParams: Promise<{ preview?: string | string[] }>;
};

export default async function HomePage({ searchParams }: HomePageProps) {
  const params = await searchParams;
  const previewValue = Array.isArray(params.preview) ? params.preview[0] : params.preview;
  const fresh = previewValue === "workspace";
  const [site, products] = await Promise.all([
    getStorefrontSite({ fresh }),
    getStorefrontProducts({ fresh }),
  ]);

  return (
    <StorefrontShell site={site}>
      <EcommerceClassicHome site={site} products={products} />
    </StorefrontShell>
  );
}
