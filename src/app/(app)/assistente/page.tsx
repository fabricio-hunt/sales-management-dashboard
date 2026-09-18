import { getCurrentProfile } from "@/lib/auth/session";
import { PageHeader } from "@/components/layout/PageHeader";
import { AssistenteChatClient } from "./AssistenteChatClient";

// Aberto a todo usuário logado, sem requirePageAccess — mesmo padrão de
// acesso do Manual de Uso (docs/page.tsx): não é um módulo revogável.
export const metadata = {
  title: "Assistente IA",
};

export default async function AssistentePage() {
  const profile = await getCurrentProfile();

  return (
    <div className="flex max-w-3xl flex-1 flex-col gap-6 p-6 md:p-8">
      <PageHeader
        title="Assistente IA"
        subtitle="Tire dúvidas sobre como usar o sistema — as respostas vêm do Manual de Uso e da documentação interna."
      />
      <AssistenteChatClient nome={profile?.nome ?? "usuário"} />
    </div>
  );
}
