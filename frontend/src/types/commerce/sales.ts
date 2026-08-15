type SaleItem = {
  id: string;
  product: string;
  product_name: string;
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

export type { Sale, SaleItem };
