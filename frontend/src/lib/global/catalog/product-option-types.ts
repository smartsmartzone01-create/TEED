type ProductOptionLocale = "en" | "sw";

const productOptionTypes = [
  { key: "color", labels: { en: "Color", sw: "Rangi" } },
  { key: "storage", labels: { en: "Storage", sw: "Hifadhi" } },
  { key: "capacity", labels: { en: "Capacity", sw: "Uwezo" } },
  { key: "size", labels: { en: "Size", sw: "Ukubwa" } },
  { key: "ram", labels: { en: "RAM", sw: "RAM" } },
  { key: "screen_size", labels: { en: "Screen size", sw: "Ukubwa wa skrini" } },
  { key: "pack_size", labels: { en: "Pack size", sw: "Ukubwa wa kifurushi" } },
  { key: "material", labels: { en: "Material", sw: "Nyenzo" } },
  { key: "style", labels: { en: "Style", sw: "Mtindo" } },
  { key: "model", labels: { en: "Model", sw: "Modeli" } },
  { key: "weight", labels: { en: "Weight", sw: "Uzito" } },
  { key: "length", labels: { en: "Length", sw: "Urefu" } },
  { key: "volume", labels: { en: "Volume", sw: "Ujazo" } },
  { key: "voltage", labels: { en: "Voltage", sw: "Volti" } },
  { key: "flavor", labels: { en: "Flavor", sw: "Ladha" } },
] as const;

const productOptionTypeKeys = productOptionTypes.map((option) => option.key);
const productOptionTypeKeySet = new Set<string>(productOptionTypeKeys);

type ProductOptionTypeKey = (typeof productOptionTypes)[number]["key"];

function isKnownProductOptionType(value: string): value is ProductOptionTypeKey {
  return productOptionTypeKeySet.has(value);
}

function productOptionTypeLabel(value: string, locale: ProductOptionLocale): string {
  return productOptionTypes.find((option) => option.key === value)?.labels[locale] ?? value;
}

function customProductOptionKey(label: string): string {
  return label
    .normalize("NFKD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "_")
    .replace(/^_+|_+$/g, "")
    .slice(0, 48);
}

export {
  customProductOptionKey,
  isKnownProductOptionType,
  productOptionTypeKeys,
  productOptionTypeLabel,
  productOptionTypes,
};
export type { ProductOptionLocale, ProductOptionTypeKey };
