import { BusinessSettings } from "@/components/workspace/business-settings";

export default async function Page({ params }: { params: Promise<{ businessId: string }> }) {
  return <BusinessSettings businessId={(await params).businessId} />;
}
