"use client";

import { usePathname, useRouter, useSearchParams } from "next/navigation";

import type { StorefrontLocale, StorefrontProductFilter } from "@/types/storefront";

export function ProductFilterSelect({
  locale,
  value,
}: {
  locale: StorefrontLocale;
  value: StorefrontProductFilter;
}) {
  const pathname = usePathname();
  const router = useRouter();
  const searchParams = useSearchParams();

  function change(next: StorefrontProductFilter) {
    const params = new URLSearchParams(searchParams.toString());
    if (next === "all") params.delete("filter");
    else params.set("filter", next);
    const query = params.toString();
    router.replace(query ? `${pathname}?${query}` : pathname, { scroll: false });
  }

  return (
    <label className="product-sort-control">
      <span className="sr-only">{locale === "sw" ? "Chuja bidhaa" : "Filter products"}</span>
      <select
        aria-label={locale === "sw" ? "Chuja bidhaa" : "Filter products"}
        onChange={(event) => change(event.target.value as StorefrontProductFilter)}
        style={{ fontSize: "0.7rem", fontWeight: 400 }}
        value={value}
      >
        <option value="all">{locale === "sw" ? "Bidhaa zote" : "All products"}</option>
        <option value="newest">{locale === "sw" ? "Mpya zaidi" : "Newest"}</option>
        <option value="recommended">{locale === "sw" ? "Zinazopendekezwa" : "Recommended"}</option>
        <option value="most_clicked">{locale === "sw" ? "Zilizobonyezwa zaidi" : "Most clicked"}</option>
      </select>
    </label>
  );
}
