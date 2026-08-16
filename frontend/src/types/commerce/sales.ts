type SaleAvailabilityUnit = {
  id: string;
  internal_serial: string;
  model_name: string;
  brand: string;
  color: string;
  capacity: string;
  identifiers: Array<{ kind: string; value: string }>;
};

type SaleAvailabilityProduct = {
  id: string;
  name: string;
  sku: string;
  brand: string;
  variant: string;
  unit: string;
  tracking_mode: "quantity" | "individual";
  current_quantity: string;
  selling_price: string | null;
  available_units: SaleAvailabilityUnit[];
};

type SaleItem = {
  id: string;
  source: "catalog" | "manual";
  product: string;
  product_name: string;
  product_sku: string;
  tracked_unit: string | null;
  tracked_unit_reference: string;
  item_name: string;
  quantity: string;
  unit_price: string;
  line_total: string;
  cost_total?: string;
  returned_quantity: string;
};

type Sale = {
  id: string;
  receipt_number: string;
  sale_type: "retail" | "wholesale";
  customer_name: string;
  customer_phone: string;
  customer_region: string;
  subtotal: string;
  discount: string;
  total: string;
  cost_of_goods?: string;
  gross_profit?: string;
  payment_status: "paid" | "partial" | "unpaid";
  sold_at: string;
  items: SaleItem[];
  recorded_by: string;
  status: "active" | "voided";
};

export type {
  Sale,
  SaleAvailabilityProduct,
  SaleAvailabilityUnit,
  SaleItem,
};
