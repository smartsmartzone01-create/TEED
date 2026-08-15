import type { Product } from "@/types/commerce/catalog";
import type { Sale } from "@/types/commerce/sales";

type Decision = {
  id: string;
  key: string;
  severity: "info" | "attention" | "urgent";
  title: string;
  explanation: string;
  action_path: string;
};

type CommercePulse = {
  revenue: string;
  cost_of_goods: string | null;
  gross_profit: string | null;
  operating_result: string | null;
  expenses: string | null;
  sales_count: number;
  low_stock_count: number;
  available_skus: number;
  sold_out_skus: number;
  stock_value: string | null;
  confidence: "partial" | "reliable";
  can_manage_finance: boolean;
};

type StockOverview = {
  id: string;
  reference: string;
  status: string;
  supplier_name: string;
  received_at: string | null;
  product_type_count: number;
  quantities_by_unit: Array<{ unit: string; quantity: string }>;
  total_buying_value: string;
};

type ReturnOverview = {
  id: string;
  receipt_number: string;
  resolution: string;
  reason: string;
  total: string;
  returned_at: string;
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
  ReturnOverview,
  StockOverview,
};
