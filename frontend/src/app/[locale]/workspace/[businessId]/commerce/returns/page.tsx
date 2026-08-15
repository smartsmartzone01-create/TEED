import { ReturnsWorkspace } from "@/components/commerce/returns/returns-workspace";
import { CommercePageShell } from "@/components/commerce/shared/commerce-page-shell";

export default async function Page({ params }: { params: Promise<{ businessId: string }> }) {
  return <CommercePageShell><ReturnsWorkspace businessId={(await params).businessId} /></CommercePageShell>;
}
