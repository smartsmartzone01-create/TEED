export type StorefrontLocale = "en" | "sw";

export type LocalizedText = Record<StorefrontLocale, string>;

export type StorefrontNavigationItem = {
  id: string;
  label: LocalizedText;
  href: string;
};

export type StorefrontServiceHighlight = {
  id: string;
  title: LocalizedText;
  description: LocalizedText;
  imageUrl?: string;
};

export type StorefrontMoney = {
  amount: string;
  currency: string;
};

export type StorefrontSkuAvailability = "in_stock" | "low_stock" | "out_of_stock";

export type StorefrontProductOptionValue = {
  value: string;
  label: LocalizedText;
  colorHex?: string;
};

export type StorefrontProductOption = {
  id: string;
  name: LocalizedText;
  values: StorefrontProductOptionValue[];
};

export type StorefrontSku = {
  id: string;
  commerceProductId?: string;
  sku: string;
  options: Record<string, string>;
  price: StorefrontMoney;
  availability: StorefrontSkuAvailability;
  imageUrl?: string;
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
  options: StorefrontProductOption[];
  skus: StorefrontSku[];
};

export type StorefrontSiteConfig = {
  id: string;
  businessId: string;
  slug: string;
  displayName: string;
  defaultLocale: StorefrontLocale;
  supportedLocales: StorefrontLocale[];
  theme: {
    primaryColor: string;
    surfaceColor: string;
    textColor: string;
  };
  contact: {
    phone?: string;
    email?: string;
    whatsapp?: string;
    instagram?: string;
  };
  navigation: StorefrontNavigationItem[];
  hero: {
    eyebrow?: LocalizedText;
    title: LocalizedText;
    subtitle: LocalizedText;
    primaryAction: LocalizedText;
    primaryHref: string;
    secondaryAction?: LocalizedText;
    secondaryHref?: string;
    imageUrl?: string;
  };
  services: StorefrontServiceHighlight[];
  newsletter: {
    enabled: boolean;
    title: LocalizedText;
    description: LocalizedText;
  };
};
