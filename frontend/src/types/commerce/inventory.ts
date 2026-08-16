type StockCostMode = "per_unit" | "total";
type StockTrackingMode = "quantity" | "individual";

type StockTrackedUnit = {
  id: string;
  internal_serial: string;
  model_name: string;
  brand: string;
  color: string;
  capacity: string;
  identifiers: Array<{ id: string; kind: string; value: string }>;
};

type StockReceiptLine = {
  id: string;
  product: string;
  product_name: string;
  product_sku: string;
  product_brand: string;
  product_variant: string;
  product_barcode: string;
  tracking_mode: StockTrackingMode;
  quantity_received: string;
  quantity_remaining: string;
  received_unit: string;
  conversion_to_base: string;
  unit_cost: string | null;
  received_unit_cost: string | null;
  total_buying_cost: string | null;
  tracked_units: StockTrackedUnit[];
};

type StockReceiptGroup = {
  id: string;
  code: string;
  name: string;
  quantity: string;
  unit: string;
  types: StockReceiptLine[];
};

type StockReceiptBatch = {
  id: string;
  code: string;
  name: string;
  groups: StockReceiptGroup[];
};

type StockReceipt = {
  id: string;
  parent_receipt: string | null;
  reference: string;
  status: "draft" | "received" | "archived";
  supplier_name: string;
  additional_cost: string;
  received_at: string | null;
  created_at: string;
  batches: StockReceiptBatch[];
  late_deliveries: StockReceipt[];
  product_type_count: number;
  quantities_by_unit: Array<{ unit: string; quantity: string }>;
  total_buying_value: string;
  correction_open: boolean;
  correction_deadline: string | null;
};

type StockUnitDefinition = { id: string; code: string; name: string };

export type {
  StockCostMode,
  StockReceipt,
  StockReceiptBatch,
  StockReceiptGroup,
  StockReceiptLine,
  StockTrackedUnit,
  StockTrackingMode,
  StockUnitDefinition,
};
