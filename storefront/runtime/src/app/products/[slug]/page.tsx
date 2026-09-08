import Link from "next/link";
import { notFound } from "next/navigation";

import { ProductDetail } from "@/components/catalog/product-detail";
import { StorefrontShell } from "@/components/storefront-shell";
import { getStorefrontProduct, getStorefrontSite } from "@/services/storefront-api";

export default async function ProductDetailPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const [site, product] = await Promise.all([getStorefrontSite(), getStorefrontProduct(slug)]);

  if (!product) {
    notFound();
  }

  const locale = site.defaultLocale;

  return (
    <StorefrontShell site={site}>
      <main className="product-page page-shell">
        <Link href="/products" className="back-link">
          ← {locale === "sw" ? "Rudi kwenye bidhaa" : "Back to products"}
        </Link>
        <ProductDetail product={product} locale={locale} />
      </main>
    </StorefrontShell>
  );
}
