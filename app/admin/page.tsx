import { AdminConsole } from "@/components/admin-console";
import { getAdminBootstrap } from "@/lib/data";

export const dynamic = "force-dynamic";

export default async function AdminPage() {
  const data = await getAdminBootstrap();
  return <AdminConsole initialData={data} />;
}
