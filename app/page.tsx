import { DashboardShell } from "@/components/dashboard-shell";
import { getDashboardSummary } from "@/lib/data";

export const dynamic = "force-dynamic";

export default async function HomePage() {
  const dashboard = await getDashboardSummary();
  return <DashboardShell initialData={dashboard} />;
}
