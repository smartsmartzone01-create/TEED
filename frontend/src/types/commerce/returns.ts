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

type SaleReturnSummary = {
  id: string;
  sale: string;
  receipt_number: string;
  resolution: ReturnResolution;
  reason: string;
  total: string;
  returned_at: string;
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

type ReturnCreateInput = {
  sale_id: string;
  resolution: ReturnResolution;
  reason: ReturnReason;
  returned_at: string;
  items: ReturnItemInput[];
};

export type {
  ReturnCondition,
  ReturnCreateInput,
  ReturnItemInput,
  ReturnReason,
  ReturnResolution,
  ReturnWorkspaceData,
  SaleReturnSummary,
};
