import type { Metadata } from "next";
import { SharedOverview } from "@/components/shared-overview";

export const metadata: Metadata = {
  title: "Shared financial overview | Moneyfi",
  robots: { index: false, follow: false },
};

export default async function SharedOverviewPage({ params }: { params: Promise<{ token: string }> }) {
  const { token } = await params;
  return <SharedOverview token={token} />;
}