import { createServerSupabase } from "@/lib/supabase/server";
import { requirePageAccess } from "@/lib/auth/permissions";
import ImportHub from "./ImportHub";

export const revalidate = 0;

export default async function ImportarDadosPage() {
  await requirePageAccess("admin.importar");
  const supabase = await createServerSupabase();
  const { data: recentImports } = await supabase
    .from("import_log")
    .select("*")
    .order("executado_em", { ascending: false })
    .limit(10);

  return <ImportHub recentImports={recentImports ?? []} />;
}
