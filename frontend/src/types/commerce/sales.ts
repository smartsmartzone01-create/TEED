type SaleAvailabilityUnit = {
  id: string;
  internal_serial: string;
  stock_reference: string;
  batch_name: string;
  group_name: string;
  model_name: string;
  brand: string;
  color: string;
  capacity: string;
  identifiers: Array<{ kind: string; value: string }>;
};

type SaleStockTarget = {
  id: string;
  name: string;
  sku: string;
  brand: string;
  variant: string;
  unit: string;
};

type SaleAvailabilityProduct = SaleStockTarget & {
  tracking_mode: "quantity" | "individual";
  current_quantity: string;
  selling_price: string | null;
  available_units: SaleAvailabilityUnit[];
  is_active?: boolean;
};

type TrackedSaleUnitDetails = {
  model_name: string;
  brand: string;
  color: string;
  capacity: string;
  condition: string;
  internal_serial: string;
  identifiers: Array<{ kind: string; value: string }>;
};

type SaleItem = {
  id: string;
  source: "catalog" | "manual";
  product: string;
  product_name: string;
  product_sku: string;
  product_unit: string;
  tracked_unit: string | null;
  tracked_unit_reference: string;
  tracked_unit_details: TrackedSaleUnitDetails | null;
  item_name: string;
  item_details: Record<string, string>;
  acquisition_unit_cost: string | null;
  quantity: string;
  unit_price: string;
  line_total: string;
  cost_total?: string;
  returned_quantity: string;
};

type TradeInDetail = {
  incoming_item_name: string;
  incoming_item_details: Record<string, string>;
  incoming_value: string;
  cash_top_up: string;
  add_to_stock: boolean;
  stock_product: string | null;
  stock_product_sku: string;
  stock_group_name: string;
  stock_receipt: string | null;
  stock_receipt_reference: string;
};

type WarrantyMonths = 3 | 6 | 12 | 24;

type Sale = {
  id: string;
  receipt_number: string;
  sale_mode: "stock" | "independent" | "trade_in";
  transaction_type: "normal" | "trade_in";
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
  warranty_months: WarrantyMonths | null;
  sold_at: string;
  items: SaleItem[];
  trade_in: TradeInDetail | null;
  recorded_by: string;
  status: "active" | "voided";
};

export type {
  Sale,
  SaleAvailabilityProduct,
  SaleAvailabilityUnit,
  SaleItem,
  SaleStockTarget,
  TradeInDetail,
  TrackedSaleUnitDetails,
  WarrantyMonths,
};
