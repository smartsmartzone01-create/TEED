import { CommerceWorkspace } from "@/components/commerce/commerce-workspace";
export default async function Page({ params }: { params: Promise<{ businessId: string }> }) { return <CommerceWorkspace businessId={(await params).businessId} view="inventory" />; }
