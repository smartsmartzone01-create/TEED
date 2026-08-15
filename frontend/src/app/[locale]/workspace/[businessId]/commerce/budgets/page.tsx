import { BudgetsWorkspace } from "@/components/commerce/finance/budgets-workspace";
import { CommercePageShell } from "@/components/commerce/shared/commerce-page-shell";

export default async function Page({ params }: { params: Promise<{ businessId: string }> }) {
  return <CommercePageShell><BudgetsWorkspace businessId={(await params).businessId} /></CommercePageShell>;
}
