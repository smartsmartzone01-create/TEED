import type { Sale } from "@/types/commerce/sales";

type ReturnCondition = "sellable" | "damaged";
type ReturnResolution = "refund" | "replacement" | "credit";
type ReturnReason =
  | "damaged"
  | "defective"
  | "wrong_item"
  | "wrong_size"
  | "changed_mind"
  | "not_as_expected"
  | "other";
type ReturnReplacementSource = "stock" | "independent";

type SaleReturnItemSummary = {
  id: string;
  sale_item: string;
  sale_item_name: string;
  sale_item_sku: string;
  quantity: string;
  condition: ReturnCondition;
  amount: string;
  cost_total: string;
};

type ReturnReplacementSummary = {
  id: string;
  source: ReturnReplacementSource;
  product: string | null;
  product_name: string;
  product_sku: string;
  tracked_unit: string | null;
  tracked_unit_reference: string;
  item_name: string;
  item_details: Record<string, string>;
  quantity: string;
  acquisition_unit_cost: string | null;
  cost_total: string;
};

type SaleReturnSummary = {
  id: string;
  return_number: string;
  sale: string;
  receipt_number: string;
  resolution: ReturnResolution;
  reason: string;
  total: string;
  refund_amount: string;
  credit_amount: string;
  recovered_inventory_cost: string;
  damaged_loss: string;
  replacement_cost: string;
  returned_at: string;
  items: SaleReturnItemSummary[];
  replacement: ReturnReplacementSummary | null;
};

type ReturnWorkspaceData = {
  returns: SaleReturnSummary[];
  sales: Sale[];
};

type ReturnItemInput = {
  sale_item_id: string;
  quantity: string;
  condition: ReturnCondition;
};

type StockReplacementInput = {
  source: "stock";
  product_id: string;
  tracked_unit_id?: string;
  quantity: string;
};

type IndependentReplacementInput = {
  source: "independent";
  item_name: string;
  item_details?: Record<string, string>;
  quantity: string;
  acquisition_unit_cost: string;
};

type ReturnReplacementInput = StockReplacementInput | IndependentReplacementInput;

type ReturnCreateInput = {
  sale_id: string;
  resolution: ReturnResolution;
  reason: ReturnReason;
  returned_at: string;
  items: ReturnItemInput[];
  replacement?: ReturnReplacementInput;
};

export type {
  IndependentReplacementInput,
  ReturnCondition,
  ReturnCreateInput,
  ReturnItemInput,
  ReturnReason,
  ReturnReplacementInput,
  ReturnReplacementSource,
  ReturnReplacementSummary,
  ReturnResolution,
  ReturnWorkspaceData,
  SaleReturnItemSummary,
  SaleReturnSummary,
  StockReplacementInput,
};
