import { supabase } from "@/lib/supabase";
import ImportHub from "./ImportHub";

export const revalidate = 0;

export default async function ImportarDadosPage() {
  const { data: recentImports } = await supabase
    .from("import_log")
    .select("*")
    .order("executado_em", { ascending: false })
    .limit(10);

  return <ImportHub recentImports={recentImports ?? []} />;
}
