import { SalesWorkspace } from "@/components/commerce/sales/sales-workspace";
import { CommercePageShell } from "@/components/commerce/shared/commerce-page-shell";

export default async function Page({ params }: { params: Promise<{ businessId: string }> }) {
  return <CommercePageShell><SalesWorkspace businessId={(await params).businessId} /></CommercePageShell>;
}
