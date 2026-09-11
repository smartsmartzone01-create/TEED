type WebsiteSite = {
  id: string;
  public_key: string;
  slug: string;
  display_name: string;
  default_locale: string;
  supported_locales: string[];
  primary_color: string;
  surface_color: string;
  text_color: string;
  contact_phone: string;
  contact_email: string;
  contact_whatsapp: string;
  contact_instagram: string;
  navigation: unknown;
  hero: unknown;
  services: unknown;
  newsletter: unknown;
  is_published: boolean;
  created_at: string;
  updated_at: string;
};

type WebsiteMedia = {
  id: string;
  kind: string;
  public_url: string;
  storage_key: string;
  original_name: string;
  mime_type: string;
  alt_text: Record<string, string>;
  width: number | null;
  height: number | null;
  size_bytes: number | null;
  sort_order: number;
  created_at: string;
  updated_at: string;
};

type WebsiteVariantAvailability = "in_stock" | "low_stock" | "out_of_stock";

type WebsiteVariant = {
  id: string;
  sku: string;
  options: Record<string, string>;
  website_price: string | null;
  currency: string;
  website_availability: WebsiteVariantAvailability;
  media_id: string | null;
  commerce_product_id: string | null;
  price_source: "website" | "commerce";
  availability_source: "website" | "commerce";
  is_published: boolean;
  sort_order: number;
  created_at: string;
  updated_at: string;
};

type WebsiteListing = {
  id: string;
  slug: string;
  title: Record<string, string>;
  short_description: Record<string, string>;
  description: Record<string, string>;
  brand: string;
  badge: Record<string, string>;
  primary_media_id: string | null;
  options: unknown[];
  is_published: boolean;
  sort_order: number;
  variants: WebsiteVariant[];
  created_at: string;
  updated_at: string;
};

type WebsiteListingInput = {
  slug: string;
  title: Record<string, string>;
  short_description?: Record<string, string>;
  description?: Record<string, string>;
  brand?: string;
  badge?: Record<string, string>;
  primary_media_id?: string | null;
  options?: unknown[];
  is_published?: boolean;
  sort_order?: number;
};

type WebsiteVariantInput = {
  sku?: string;
  options?: Record<string, string>;
  website_price?: string | null;
  currency?: string;
  website_availability?: WebsiteVariantAvailability;
  media_id?: string | null;
  is_published?: boolean;
  sort_order?: number;
};

type WebsiteCommerceProduct = {
  id: string;
  family_id: string | null;
  family_name: string;
  name: string;
  sku: string;
  brand: string;
  variant: string;
  variant_options: unknown;
  tracking_mode: string;
  linked: boolean;
  website_listing_id: string | null;
  website_variant_id: string | null;
};

type WebsiteCommerceImportResult = {
  requested_product_ids: string[];
  imported_product_ids: string[];
  created_listings: number;
  created_variants: number;
  existing_variants: number;
};

export type {
  WebsiteCommerceImportResult,
  WebsiteCommerceProduct,
  WebsiteListing,
  WebsiteListingInput,
  WebsiteMedia,
  WebsiteSite,
  WebsiteVariant,
  WebsiteVariantAvailability,
  WebsiteVariantInput,
};
