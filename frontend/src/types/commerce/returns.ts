import type { Sale } from "@/types/commerce/sales";

type ReturnCondition = "sellable" | "damaged";
type ReturnResolution = "refund" | "replacement" | "credit";

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
  reason: string;
  returned_at: string;
  items: ReturnItemInput[];
};

export type {
  ReturnCondition,
  ReturnCreateInput,
  ReturnItemInput,
  ReturnResolution,
  ReturnWorkspaceData,
  SaleReturnSummary,
};
