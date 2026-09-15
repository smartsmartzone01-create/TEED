export type StorefrontLocale = "en" | "sw";
export type StorefrontProductFilter = "all" | "newest" | "recommended" | "most_clicked";

export type LocalizedText = Record<StorefrontLocale, string>;

export type StorefrontNavigationItem = { id: string; label: LocalizedText; href: string; children?: StorefrontNavigationItem[] };
export type StorefrontServiceHighlight = { id: string; title: LocalizedText; description: LocalizedText; imageUrl?: string };
export type StorefrontFeaturedSlide = { id: string; source: "standalone" | "listing"; listingId?: string; title: LocalizedText; description: LocalizedText; actionLabel: LocalizedText; actionHref: string; imageUrl?: string; imageSide: "left" | "right"; backgroundColor: string; textColor: string };
export type StorefrontCategory = { id: string; source: "standalone" | "family"; familyIds?: string[]; title: LocalizedText; description: LocalizedText; href: string; imageUrl?: string };
export type StorefrontMoney = { amount: string; currency: string };
export type StorefrontSkuAvailability = "in_stock" | "low_stock" | "out_of_stock";
export type StorefrontProductOptionValue = { value: string; label: LocalizedText; colorHex?: string };
export type StorefrontProductOption = { id: string; name: LocalizedText; values: StorefrontProductOptionValue[] };

export type StorefrontSku = {
  id: string;
  websiteVariantId: string;
  commerceProductId?: string;
  sku: string;
  options: Record<string, string>;
  price: StorefrontMoney | null;
  availability: StorefrontSkuAvailability;
  trackingMode?: "quantity" | "individual";
  imageUrl?: string;
  imageUrls?: string[];
};

export type StorefrontProductListing = {
  id: string;
  slug: string;
  title: LocalizedText;
  shortDescription: LocalizedText;
  description: LocalizedText;
  brand?: string;
  badge?: LocalizedText;
  primaryImageUrl: string;
  familyIds?: string[];
  options: StorefrontProductOption[];
  skus: StorefrontSku[];
  publishedAt?: string;
  detailViewCount?: number;
  isNew?: boolean;
};

export type StorefrontSiteConfig = {
  id: string;
  businessId: string;
  slug: string;
  displayName: string;
  defaultLocale: StorefrontLocale;
  supportedLocales: StorefrontLocale[];
  theme: { primaryColor: string; surfaceColor: string; textColor: string };
  contact: { phone?: string; email?: string; whatsapp?: string; instagram?: string };
  header: { logoImageUrl?: string };
  navigation: StorefrontNavigationItem[];
  hero: { backgroundPreset: "sky-white"; layout: "text" | "split"; eyebrow?: LocalizedText; title: LocalizedText; subtitle: LocalizedText; primaryAction: LocalizedText; primaryHref: string; secondaryAction?: LocalizedText; secondaryHref?: string; imageUrl?: string; imageAlt?: LocalizedText };
  featuredProducts: { enabled: boolean; items: StorefrontFeaturedSlide[]; rotationMs: number };
  categories?: { enabled: boolean; title: LocalizedText; items: StorefrontCategory[]; viewAllHref: string };
  services: StorefrontServiceHighlight[];
  newsletter: { enabled: boolean; title: LocalizedText; description: LocalizedText };
};
