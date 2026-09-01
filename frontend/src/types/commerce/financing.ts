type FinancingAgreementType = "loan" | "installment";
type FinancingTransactionType = "normal" | "upfront" | "trade_in";
type FinancingSource = "stock" | "independent";
type FinancingMarketType = "retail" | "wholesale";
type FinancingMode = "business" | "partner";
type FinancingFrequency = "weekly" | "monthly";
type FinancingStatus = "active" | "due" | "overdue" | "paid" | "cancelled";
type FinancingWarrantyMonths = 3 | 6 | 12 | 24;

type FinancingAvailabilityProduct = {
  id: string;
  name: string;
  sku: string;
  unit: string;
  tracking_mode: "quantity" | "individual";
  current_quantity: string;
  selling_price: string | null;
  available_units: Array<{ id: string; label: string }>;
};

type FinancingItem = {
  id: string;
  product: string | null;
  product_name: string;
  product_sku: string;
  product_unit: string;
  tracked_unit: string | null;
  item_name: string;
  item_details: Record<string, string>;
  quantity: string;
  unit_price: string;
  line_total: string;
  acquisition_unit_cost?: string | null;
  cost_total?: string;
  warranty_months: FinancingWarrantyMonths | null;
};

type FinancingPayment = {
  id: string;
  amount: string;
  paid_at: string;
  method: string;
  reference: string;
  created_at: string;
};

type FinancingDocument = {
  id: string;
  original_name: string;
  description: string;
  created_at: string;
  download_path: string;
};

type FinancingAgreement = {
  id: string;
  reference: string;
  agreement_type: FinancingAgreementType;
  transaction_type: FinancingTransactionType;
  source: FinancingSource;
  market_type: FinancingMarketType;
  financing_mode: FinancingMode;
  status: FinancingStatus;
  customer_name: string;
  customer_phone: string;
  customer_region: string;
  contract_total: string;
  upfront_cash: string;
  trade_in_item_name: string;
  trade_in_credit: string;
  contribution_total: string;
  installment_amount: string;
  frequency: FinancingFrequency;
  next_due_date: string | null;
  release_threshold_percent: string;
  product_released_at: string | null;
  partner_name?: string;
  partner_settlement_amount?: string | null;
  partner_settlement_received?: boolean;
  business_commission?: string;
  payments_total: string;
  outstanding_balance: string;
  expected_business_income?: string;
  notes: string;
  items: FinancingItem[];
  payments: FinancingPayment[];
  documents: FinancingDocument[];
  created_at: string;
};

export type {
  FinancingAgreement,
  FinancingAgreementType,
  FinancingAvailabilityProduct,
  FinancingDocument,
  FinancingFrequency,
  FinancingItem,
  FinancingMarketType,
  FinancingMode,
  FinancingPayment,
  FinancingSource,
  FinancingStatus,
  FinancingTransactionType,
  FinancingWarrantyMonths,
};
