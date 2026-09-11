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

export type { WebsiteMedia, WebsiteSite };
