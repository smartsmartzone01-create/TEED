import Link from "next/link";
import { notFound } from "next/navigation";

import { ProductCard } from "@/components/catalog/product-card";
import { ProductDetail } from "@/components/catalog/product-detail";
import { StorefrontShell } from "@/components/storefront-shell";
import { getStorefrontProduct, getStorefrontProducts, getStorefrontSite } from "@/services/storefront-api";

export default async function ProductDetailPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const [site, product, products] = await Promise.all([
    getStorefrontSite(),
    getStorefrontProduct(slug),
    getStorefrontProducts(),
  ]);

  if (!product) notFound();

  const locale = site.defaultLocale;
  const related = products.filter((item) => item.id !== product.id);
  const popularPicks = related.slice(0, 4);
  const compareProducts = related.slice(0, 2);

  return (
    <StorefrontShell site={site}>
      <main className="product-page product-detail-page">
        <div className="page-shell product-detail-shell">
          <Link href="/products" className="back-link product-detail-back-link">
            ← {locale === "sw" ? "Rudi kwenye bidhaa" : "Back to products"}
          </Link>
          <ProductDetail product={product} locale={locale} />
        </div>

        {popularPicks.length > 0 ? (
          <section className="page-shell product-detail-lower-section">
            <div className="product-detail-section-heading">
              <h2>{locale === "sw" ? "Chaguo maarufu" : "Popular Picks"}</h2>
              <Link href="/products" className="text-link">
                {locale === "sw" ? "Tazama zote" : "View all"} →
              </Link>
            </div>
            <div className="product-detail-recommended-rail">
              {popularPicks.map((item) => (
                <div className="product-detail-recommended-card" key={item.id}>
                  <ProductCard product={item} locale={locale} />
                </div>
              ))}
            </div>
          </section>
        ) : null}

        {compareProducts.length > 0 ? (
          <section className="page-shell product-detail-lower-section product-compare-section">
            <div className="product-detail-section-heading">
              <h2>{locale === "sw" ? "Linganisha bidhaa" : "Compare Products"}</h2>
            </div>
            <div className="product-compare-grid">
              {[product, ...compareProducts].map((item, index) => (
                <article className={`product-compare-card${index === 0 ? " is-current" : ""}`} key={item.id}>
                  <ProductCard product={item} locale={locale} />
                </article>
              ))}
            </div>
          </section>
        ) : null}
      </main>
    </StorefrontShell>
  );
}
