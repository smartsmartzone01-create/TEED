import { BusinessProfileOverview } from "@/components/workspace/business-profile-overview";

export default async function Page({ params }: { params: Promise<{ businessId: string }> }) {
  return <BusinessProfileOverview businessId={(await params).businessId} />;
}
