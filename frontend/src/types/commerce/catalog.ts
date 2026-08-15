type Product = {
  id: string;
  name: string;
  sku: string;
  barcode: string;
  group: string;
  brand: string;
  variant: string;
  unit: string;
  selling_price: string | null;
  tracking_mode: "quantity" | "individual";
  low_stock_threshold: string;
  current_quantity: string;
  is_active: boolean;
};

export type { Product };
