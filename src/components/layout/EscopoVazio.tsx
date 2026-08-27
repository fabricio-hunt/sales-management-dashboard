import { Alert } from "@/components/ui/alert"
import type { Profile } from "@/lib/auth/session"

// Tela vazia explicada. /equipe e /comissoes caem aqui pelo mesmo motivo
// aparente ("não há representante nenhum pra mostrar"), mas a causa e o
// responsável mudam por papel — antes as duas mostravam um texto de
// desenvolvedor (rodar scripts/seed_metas_v1.mjs, editar a tabela
// metas_representante) que não fazia sentido nenhum pro usuário final.
export function EscopoVazio({
  profile,
  escopo,
  mes,
  tela,
}: {
  profile: Profile
  escopo: string[] | "todos"
  mes: string
  tela: string
}) {
  const periodo = mes.slice(0, 7).split("-").reverse().join("/")

  // Supervisor sem nenhum representante atribuído: não é falta de dado, é um
  // passo de cadastro que só o Manager consegue fazer.
  if (profile.role === "supervisor" && escopo !== "todos" && escopo.length === 0) {
    return (
      <div className="p-8 max-w-2xl mx-auto">
        <Alert variant="bloqueio" titulo="Você ainda não tem representantes atribuídos">
          <p>
            {tela} mostra os números da sua equipe, e nenhuma equipe foi vinculada ao seu usuário ainda — por isso
            a tela está vazia. Não há nada que você possa fazer aqui até lá.
          </p>
          <p className="mt-1">
            Peça ao Manager para abrir <code>Usuários</code>, expandir o seu nome, marcar os representantes e
            clicar em <strong>Salvar atribuições</strong>.
          </p>
        </Alert>
      </div>
    )
  }

  if (profile.role === "vendedor") {
    return (
      <div className="p-8 max-w-2xl mx-auto">
        <Alert variant="info" titulo={`Sem dados para ${periodo}`}>
          <p>
            {tela} depende das metas do mês, e o seu representante ainda não tem metas lançadas para este período.
            Assim que o Manager cadastrar, os números aparecem aqui automaticamente.
          </p>
        </Alert>
      </div>
    )
  }

  return (
    <div className="p-8 max-w-2xl mx-auto">
      <Alert variant="info" titulo={`Nenhuma meta cadastrada para ${periodo}`}>
        <p>
          {tela} calcula tudo a partir das metas do mês, e ainda não existe nenhuma para {periodo}.
        </p>
        <p className="mt-1">
          Você pode cadastrar manualmente em <code>Metas por Fornecedor</code> ou enviar a planilha de objetivos
          em <code>Importar Base</code>.
        </p>
      </Alert>
    </div>
  )
}
