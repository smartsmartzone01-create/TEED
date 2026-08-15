import { ExpensesWorkspace } from "@/components/commerce/finance/expenses-workspace";
import { CommercePageShell } from "@/components/commerce/shared/commerce-page-shell";

export default async function Page({ params }: { params: Promise<{ businessId: string }> }) {
  return <CommercePageShell><ExpensesWorkspace businessId={(await params).businessId} /></CommercePageShell>;
}
