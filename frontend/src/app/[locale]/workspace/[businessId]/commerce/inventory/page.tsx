import { CommercePageShell } from "@/components/commerce/shared/commerce-page-shell";
import { StockWorkspace } from "@/components/commerce/stock/stock-workspace";

export default async function Page({ params }: { params: Promise<{ businessId: string }> }) {
  return <CommercePageShell><StockWorkspace businessId={(await params).businessId} /></CommercePageShell>;
}
