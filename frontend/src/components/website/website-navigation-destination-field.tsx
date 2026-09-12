import type {
  WebsiteListing,
  WebsiteNavigationSection,
  WebsiteNavigationTarget,
} from "@/types/website/website";

type WebsiteNavigationDestinationFieldProps = {
  disabled?: boolean;
  listings: WebsiteListing[];
  locale: string;
  onChange: (target: WebsiteNavigationTarget) => void;
  value: WebsiteNavigationTarget;
};

const SECTIONS: Array<{
  value: WebsiteNavigationSection;
  en: string;
  sw: string;
}> = [
  { value: "hero", en: "Hero", sw: "Hero" },
  { value: "popular", en: "Popular picks", sw: "Chaguo maarufu" },
  { value: "services", en: "Services", sw: "Huduma" },
  { value: "footer", en: "Footer", sw: "Sehemu ya chini" },
];

function listingLabel(listing: WebsiteListing, locale: string) {
  const title =
    listing.title[locale] || listing.title.en || listing.title.sw || listing.slug;
  const connected = listing.variants.some((variant) => variant.commerce_product_id);
  const source = connected
    ? locale === "sw"
      ? "Imeunganishwa na Commerce"
      : "Commerce connected"
    : locale === "sw"
      ? "Bidhaa ya Website"
      : "Website product";
  const variants =
    locale === "sw"
      ? `${listing.variants.length} aina`
      : `${listing.variants.length} variant${listing.variants.length === 1 ? "" : "s"}`;
  return `${title} · ${variants} · ${source}`;
}

function WebsiteNavigationDestinationField({
  disabled = false,
  listings,
  locale,
  onChange,
  value,
}: WebsiteNavigationDestinationFieldProps) {
  const sw = locale === "sw";

  return (
    <div className="grid min-w-0 gap-2">
      <label className="grid min-w-0 gap-1 text-xs font-medium text-slate-600 dark:text-slate-300">
        {sw ? "Unganisha na" : "Link to"}
        <select
          className="h-9 min-w-0 w-full rounded-md border border-slate-300 bg-white px-2.5 text-sm text-slate-900 outline-none focus:border-slate-500 dark:border-slate-700 dark:bg-slate-950 dark:text-white"
          disabled={disabled}
          onChange={(event) => {
            const type = event.target.value;
            if (type === "home") onChange({ type: "home" });
            if (type === "shop") onChange({ type: "shop" });
            if (type === "product")
              onChange({ type: "product", id: listings[0]?.id ?? "" });
            if (type === "section")
              onChange({ type: "section", section: "hero" });
            if (type === "external")
              onChange({ type: "external", url: "https://" });
          }}
          value={value.type}
        >
          <option value="home">{sw ? "Ukurasa wa mwanzo" : "Home"}</option>
          <option value="shop">{sw ? "Duka / Bidhaa zote" : "Shop / All products"}</option>
          <option value="product">{sw ? "Bidhaa ya Website" : "Website product"}</option>
          <option value="section">{sw ? "Sehemu ya homepage" : "Homepage section"}</option>
          <option value="external">{sw ? "Tovuti ya nje" : "External website"}</option>
          {value.type === "legacy" ? (
            <option value="legacy">{sw ? "Kiungo cha zamani" : "Existing custom link"}</option>
          ) : null}
        </select>
      </label>

      {value.type === "product" ? (
        <label className="grid min-w-0 gap-1 text-[11px] font-medium text-slate-600 dark:text-slate-300">
          {sw ? "Chagua bidhaa" : "Choose product"}
          <select
            className="h-9 min-w-0 w-full rounded-md border border-slate-300 bg-white px-2.5 text-sm text-slate-900 outline-none focus:border-slate-500 dark:border-slate-700 dark:bg-slate-950 dark:text-white"
            disabled={disabled || listings.length === 0}
            onChange={(event) =>
              onChange({ type: "product", id: event.target.value })
            }
            value={value.id}
          >
            {listings.length === 0 ? (
              <option value="">
                {sw ? "Hakuna bidhaa za Website bado" : "No Website products yet"}
              </option>
            ) : null}
            {listings.map((listing) => (
              <option key={listing.id} value={listing.id}>
                {listingLabel(listing, locale)}
              </option>
            ))}
          </select>
          <span className="font-normal leading-4 text-slate-400">
            {sw
              ? "Bidhaa za standalone na Commerce-connected zinaonekana hapa kwa njia ile ile."
              : "Standalone and Commerce-connected products appear here the same way."}
          </span>
        </label>
      ) : null}

      {value.type === "section" ? (
        <label className="grid min-w-0 gap-1 text-[11px] font-medium text-slate-600 dark:text-slate-300">
          {sw ? "Chagua sehemu" : "Choose section"}
          <select
            className="h-9 min-w-0 w-full rounded-md border border-slate-300 bg-white px-2.5 text-sm text-slate-900 outline-none focus:border-slate-500 dark:border-slate-700 dark:bg-slate-950 dark:text-white"
            disabled={disabled}
            onChange={(event) =>
              onChange({
                type: "section",
                section: event.target.value as WebsiteNavigationSection,
              })
            }
            value={value.section}
          >
            {SECTIONS.map((section) => (
              <option key={section.value} value={section.value}>
                {sw ? section.sw : section.en}
              </option>
            ))}
          </select>
        </label>
      ) : null}

      {value.type === "external" ? (
        <label className="grid min-w-0 gap-1 text-[11px] font-medium text-slate-600 dark:text-slate-300">
          {sw ? "Anwani ya tovuti" : "Website URL"}
          <input
            className="h-9 min-w-0 w-full rounded-md border border-slate-300 bg-white px-2.5 font-mono text-xs text-slate-900 outline-none focus:border-slate-500 dark:border-slate-700 dark:bg-slate-950 dark:text-white"
            disabled={disabled}
            onChange={(event) =>
              onChange({ type: "external", url: event.target.value })
            }
            placeholder="https://example.com"
            type="url"
            value={value.url}
          />
        </label>
      ) : null}

      {value.type === "legacy" ? (
        <div className="rounded-md border border-amber-200 bg-amber-50 px-3 py-2 text-[11px] leading-5 text-amber-800 dark:border-amber-900/60 dark:bg-amber-950/30 dark:text-amber-200">
          <span className="block font-semibold">
            {sw ? "Kiungo cha zamani" : "Existing custom link"}
          </span>
          <span className="break-all font-mono">{value.href}</span>
          <span className="mt-1 block font-sans text-amber-700/80 dark:text-amber-300/80">
            {sw
              ? "Kiungo hiki kitaendelea kufanya kazi. Chagua aina nyingine hapo juu ili Tunakuza kisimamie kiotomatiki."
              : "This link will keep working. Choose another destination type above to let Tunakuza manage it automatically."}
          </span>
        </div>
      ) : null}
    </div>
  );
}

export { WebsiteNavigationDestinationField };
