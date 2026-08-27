"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import {
  UploadCloud,
  FileSpreadsheet,
  Download,
  Loader2,
  CheckCircle2,
  AlertCircle,
  Receipt,
  Truck,
  UserCircle,
  Target,
  Percent,
} from "lucide-react";
import { PageHeader } from "@/components/layout/PageHeader";

type Tipo = "vendas" | "fornecedores" | "clientes" | "metas" | "metas_representante";

type ImportLogRow = {
  id: number;
  tipo: Tipo;
  arquivo_nome: string | null;
  executado_em: string;
  sucesso: boolean;
  linhas_processadas: number;
  linhas_ignoradas: number;
  periodo_inicio: string | null;
  periodo_fim: string | null;
  detalhes: Record<string, unknown>;
};

type PendingConfirmation = {
  message: string;
  periodo: { data_inicio: string; data_fim: string; representantes: string[] };
};

const TABS: { tipo: Tipo; label: string; icon: typeof Receipt }[] = [
  { tipo: "vendas", label: "Vendas (DD Pedidos)", icon: Receipt },
  { tipo: "fornecedores", label: "Fornecedores", icon: Truck },
  { tipo: "clientes", label: "Clientes", icon: UserCircle },
  { tipo: "metas", label: "Metas", icon: Target },
  { tipo: "metas_representante", label: "Objetivos (Positivação)", icon: Percent },
];

const DESCRICOES: Record<Tipo, string> = {
  vendas: "Substitui as vendas do período detectado no arquivo (delete-and-reinsert). É a única importação destrutiva — por isso pede confirmação antes de gravar.",
  fornecedores: "Cria fornecedores novos e atualiza os existentes (por Nome Fantasia). Aditivo — nunca apaga nada.",
  clientes: "Cria clientes novos e atualiza cadastro dos existentes (por Cod.Pessoa). Por padrão nunca sobrescreve representante/status já atribuídos.",
  metas: "Cria/atualiza metas por representante × fornecedor × mês. Não apaga metas do mês que não estejam no arquivo.",
  metas_representante: "Cria/atualiza objetivos por representante × mês (Obj. Positivação e os 3 overrides manuais). Deixe uma coluna de override em branco pra manter o cálculo automático — só preencha pra fixar um valor de referência.",
};

function fmtData(iso: string) {
  return new Date(iso).toLocaleString("pt-BR", { dateStyle: "short", timeStyle: "short" });
}

export default function ImportHub({ recentImports }: { recentImports: ImportLogRow[] }) {
  const [activeTab, setActiveTab] = useState<Tipo>("vendas");

  return (
    <div className="flex flex-col gap-6 p-6 max-w-5xl mx-auto">
      <PageHeader ajuda="admin.importar"
        title="Importação de Dados"
        subtitle="Cada tipo de dado tem sua própria importação, independente das outras — suba só o que precisar atualizar."
      />

      <div className="flex gap-2 border-b border-border overflow-x-auto">
        {TABS.map(({ tipo, label, icon: Icon }) => (
          <button
            key={tipo}
            onClick={() => setActiveTab(tipo)}
            className={`flex items-center gap-2 px-4 py-2.5 text-sm font-medium whitespace-nowrap border-b-2 transition-colors ${
              activeTab === tipo
                ? "border-primary text-primary"
                : "border-transparent text-muted-foreground hover:text-foreground"
            }`}
          >
            <Icon className="w-4 h-4" />
            {label}
          </button>
        ))}
      </div>

      <ImportCard tipo={activeTab} />

      <div className="border rounded-xl bg-card text-card-foreground shadow-sm">
        <div className="p-4 border-b">
          <h2 className="font-semibold">Últimas importações</h2>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-muted/40">
              <tr>
                <th className="px-4 py-2 text-left">Quando</th>
                <th className="px-4 py-2 text-left">Tipo</th>
                <th className="px-4 py-2 text-left">Arquivo</th>
                <th className="px-4 py-2 text-right">Linhas</th>
                <th className="px-4 py-2 text-right">Ignoradas</th>
                <th className="px-4 py-2 text-left">Status</th>
              </tr>
            </thead>
            <tbody>
              {recentImports.length === 0 ? (
                <tr><td colSpan={6} className="text-center py-6 text-muted-foreground">Nenhuma importação registrada ainda.</td></tr>
              ) : (
                recentImports.map((log) => (
                  <tr key={log.id} className="border-t">
                    <td className="px-4 py-2 whitespace-nowrap">{fmtData(log.executado_em)}</td>
                    <td className="px-4 py-2 capitalize">{log.tipo}</td>
                    <td className="px-4 py-2 truncate max-w-[220px]">{log.arquivo_nome ?? "-"}</td>
                    <td className="px-4 py-2 text-right font-mono">{log.linhas_processadas}</td>
                    <td className="px-4 py-2 text-right font-mono">{log.linhas_ignoradas || "-"}</td>
                    <td className="px-4 py-2">
                      {log.sucesso ? (
                        <span className="inline-flex items-center gap-1 text-emerald-600"><CheckCircle2 className="w-3.5 h-3.5" /> Sucesso</span>
                      ) : (
                        <span className="inline-flex items-center gap-1 text-rose-600"><AlertCircle className="w-3.5 h-3.5" /> Falhou</span>
                      )}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}

function ImportCard({ tipo }: { tipo: Tipo }) {
  const router = useRouter();
  const [file, setFile] = useState<File | null>(null);
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState<{ type: "success" | "error" | ""; text: string }>({ type: "", text: "" });
  const [pendingConfirmation, setPendingConfirmation] = useState<PendingConfirmation | null>(null);
  const [fornecedoresNovos, setFornecedoresNovos] = useState<string[]>([]);
  const [forcarOverwrite, setForcarOverwrite] = useState(false);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      setFile(e.target.files[0]);
      setMessage({ type: "", text: "" });
      setPendingConfirmation(null);
      setFornecedoresNovos([]);
    }
  };

  const doUpload = async (confirm: boolean) => {
    if (!file) return;
    setLoading(true);
    setMessage({ type: "", text: "" });

    const formData = new FormData();
    formData.append("file", file);
    if (confirm) formData.append("confirm", "true");
    if (tipo === "clientes" && forcarOverwrite) formData.append("forcarOverwrite", "true");

    try {
      const response = await fetch(`/api/admin/import/${tipo}`, { method: "POST", body: formData });
      const data = await response.json();

      if (response.status === 409 && data.needsConfirmation) {
        setPendingConfirmation({ message: data.message, periodo: data.periodo });
      } else if (response.ok && data.success) {
        setMessage({ type: "success", text: data.message || "Importação concluída com sucesso!" });
        setFornecedoresNovos(data.stats?.fornecedoresNovosParaRevisar ?? []);
        setFile(null);
        setPendingConfirmation(null);
        router.refresh();
      } else {
        setMessage({ type: "error", text: data.error || "Ocorreu um erro ao importar o arquivo." });
      }
    } catch (error) {
      console.error(error);
      setMessage({ type: "error", text: "Falha de comunicação com o servidor." });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
      <div className="flex flex-col gap-4 border rounded-xl p-6 bg-card text-card-foreground shadow-sm">
        <label className="flex flex-col items-center justify-center w-full h-40 border-2 border-dashed rounded-lg cursor-pointer bg-muted/20 border-muted-foreground/30 hover:bg-muted/50 transition-colors">
          <div className="flex flex-col items-center justify-center pt-5 pb-6">
            <UploadCloud className="w-9 h-9 mb-3 text-muted-foreground" />
            <p className="mb-2 text-sm text-muted-foreground">
              <span className="font-semibold">Clique para fazer upload</span> ou arraste o arquivo
            </p>
            <p className="text-xs text-muted-foreground">XLSX, XLS (Excel)</p>
          </div>
          <input type="file" className="hidden" accept=".xlsx, .xls" onChange={handleFileChange} disabled={loading} />
        </label>

        {file && (
          <div className="flex items-center gap-2 p-3 bg-muted rounded-md text-sm">
            <FileSpreadsheet className="w-4 h-4 text-emerald-500" />
            <span className="flex-1 truncate">{file.name}</span>
            <span className="text-muted-foreground text-xs">{(file.size / 1024 / 1024).toFixed(2)} MB</span>
          </div>
        )}

        {tipo === "clientes" && (
          <label className="flex items-center gap-2 text-sm">
            <input type="checkbox" checked={forcarOverwrite} onChange={(e) => setForcarOverwrite(e.target.checked)} />
            Sobrescrever atribuições manuais (representante/status) com o que vier no arquivo
          </label>
        )}

        {message.text && (
          <div className={`flex items-start gap-2 p-4 rounded-md text-sm ${message.type === "success" ? "bg-emerald-50 text-emerald-700 dark:bg-emerald-950/50 dark:text-emerald-400" : "bg-red-50 text-red-700 dark:bg-red-950/50 dark:text-red-400"}`}>
            {message.type === "success" ? <CheckCircle2 className="w-5 h-5 shrink-0" /> : <AlertCircle className="w-5 h-5 shrink-0" />}
            <div>{message.text}</div>
          </div>
        )}

        {fornecedoresNovos.length > 0 && (
          <div className="flex items-start gap-2 p-4 rounded-md text-sm bg-amber-50 text-amber-800 dark:bg-amber-950/50 dark:text-amber-400 border border-amber-200 dark:border-amber-900">
            <AlertCircle className="w-5 h-5 shrink-0" />
            <div>
              {fornecedoresNovos.length} fornecedor(es) novo(s) criado(s) automaticamente ({fornecedoresNovos.join(", ")}).
              Revise o nome fantasia em <a href="/admin/fornecedores" className="underline font-medium">/admin/fornecedores</a>.
            </div>
          </div>
        )}

        {pendingConfirmation && (
          <div className="flex flex-col gap-3 p-4 rounded-md text-sm bg-amber-50 text-amber-800 dark:bg-amber-950/50 dark:text-amber-400 border border-amber-200 dark:border-amber-900">
            <div className="flex items-start gap-2">
              <AlertCircle className="w-5 h-5 shrink-0" />
              <div>{pendingConfirmation.message}</div>
            </div>
            <div className="flex gap-2">
              <button
                onClick={() => doUpload(true)}
                disabled={loading}
                className="flex-1 h-9 px-4 rounded-md bg-amber-600 text-white hover:bg-amber-700 disabled:opacity-50 font-medium transition-colors"
              >
                {loading ? "Substituindo..." : "Confirmar substituição"}
              </button>
              <button
                onClick={() => setPendingConfirmation(null)}
                disabled={loading}
                className="h-9 px-4 rounded-md border border-input hover:bg-accent transition-colors"
              >
                Cancelar
              </button>
            </div>
          </div>
        )}

        <button
          onClick={() => doUpload(false)}
          disabled={!file || loading || !!pendingConfirmation}
          className="w-full flex items-center justify-center gap-2 bg-primary text-primary-foreground h-10 px-4 py-2 rounded-md hover:bg-primary/90 disabled:opacity-50 font-medium transition-colors"
        >
          {loading ? (<><Loader2 className="w-4 h-4 animate-spin" /> Processando...</>) : "Importar"}
        </button>
      </div>

      <div className="flex flex-col gap-4 border rounded-xl p-6 bg-card text-card-foreground shadow-sm h-fit">
        <h2 className="text-lg font-semibold flex items-center gap-2">
          <AlertCircle className="w-5 h-5" />
          Como funciona
        </h2>
        <p className="text-sm text-muted-foreground">{DESCRICOES[tipo]}</p>
        <p className="text-sm text-muted-foreground">
          O arquivo deve ter as mesmas colunas do template — colunas faltando bloqueiam a importação.
        </p>
        <a
          href={`/api/download-template?tipo=${tipo}`}
          download
          className="inline-flex items-center gap-2 border border-input bg-background hover:bg-accent hover:text-accent-foreground h-9 px-4 py-2 rounded-md text-sm font-medium transition-colors w-fit"
        >
          <Download className="w-4 h-4" />
          Baixar modelo
        </a>
      </div>
    </div>
  );
}
