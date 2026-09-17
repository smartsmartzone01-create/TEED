import type { LocalizedText } from "@/types/storefront";

export type StorefrontOrderItem = {
  id: string;
  offerId: string;
  websiteVariantId: string | null;
  productSlug: string;
  title: LocalizedText;
  sku: string;
  options: Record<string, string>;
  imageUrl: string;
  quantity: number;
  unitPrice: string;
  lineTotal: string;
  currency: string;
};

export type StorefrontOrder = {
  id: string;
  orderNumber: string;
  status: "new" | "confirmed" | "completed" | "cancelled";
  customer: {
    fullName: string;
    phone: string;
    email: string;
  };
  deliveryAddress: string;
  note: string;
  currency: string;
  total: string;
  createdAt: string;
  items: StorefrontOrderItem[];
};

export type StorefrontOrderResponse = {
  success: boolean;
  message: string;
  data: StorefrontOrder | null;
  errors?: unknown;
};
