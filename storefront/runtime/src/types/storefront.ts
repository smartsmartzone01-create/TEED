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
