type Product = {
  id: string; name: string; sku: string; barcode: string; group: string; brand: string;
  variant: string; unit: string; selling_price: string | null;
  tracking_mode: "quantity" | "individual"; low_stock_threshold: string;
  current_quantity: string; is_active: boolean;
};

type SaleItem = {
  id: string; product: string; product_name: string; quantity: string;
  unit_price: string; line_total: string; cost_total?: string;
  returned_quantity: string;
};

type Sale = {
  id: string; receipt_number: string; sale_type: "retail" | "wholesale";
  customer_name: string; customer_phone: string; subtotal: string;
  discount: string; total: string; cost_of_goods?: string;
  gross_profit?: string; payment_status: "paid" | "partial" | "unpaid";
  sold_at: string; items: SaleItem[]; recorded_by: string; status: "active" | "voided";
};

type Decision = {
  id: string; key: string; severity: "info" | "attention" | "urgent";
  title: string; explanation: string; action_path: string;
};

type CommercePulse = {
  revenue: string; cost_of_goods: string | null; gross_profit: string | null;
  operating_result: string | null; expenses: string | null; sales_count: number;
  low_stock_count: number; available_skus: number; sold_out_skus: number;
  stock_value: string | null; confidence: "partial" | "reliable";
  can_manage_finance: boolean;
};

type StockOverview = {
  id: string; reference: string; status: string; supplier_name: string;
  received_at: string | null; product_type_count: number;
  quantities_by_unit: Array<{ unit: string; quantity: string }>;
  total_buying_value: string;
};

type ReturnOverview = {
  id: string; receipt_number: string; resolution: string; reason: string;
  total: string; returned_at: string;
};

type CommerceOverview = {
  pulse: CommercePulse;
  decisions: Decision[];
  recent_sales: Sale[];
  recent_stock: StockOverview[];
  recent_returns: ReturnOverview[];
  sold_out_items: Product[];
};

export type {
  CommerceOverview,
  CommercePulse,
  Decision,
  Product,
  ReturnOverview,
  Sale,
  SaleItem,
  StockOverview,
};
