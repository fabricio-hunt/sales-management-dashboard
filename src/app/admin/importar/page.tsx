"use client";

import { useState } from "react";
import { UploadCloud, FileSpreadsheet, Download, Loader2, CheckCircle2, AlertCircle } from "lucide-react";

export default function ImportarDadosPage() {
  const [file, setFile] = useState<File | null>(null);
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState<{ type: "success" | "error" | ""; text: string }>({ type: "", text: "" });

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      setFile(e.target.files[0]);
      setMessage({ type: "", text: "" });
    }
  };

  const handleUpload = async () => {
    if (!file) return;

    setLoading(true);
    setMessage({ type: "", text: "" });

    const formData = new FormData();
    formData.append("file", file);

    try {
      const response = await fetch("/api/upload", {
        method: "POST",
        body: formData,
      });

      const data = await response.json();

      if (response.ok && data.success) {
        setMessage({ type: "success", text: data.message || "Arquivo importado com sucesso!" });
        setFile(null);
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
    <div className="flex flex-col gap-6 p-6">
      <div className="flex flex-col gap-2">
        <h1 className="text-3xl font-bold tracking-tight">Importação de Dados</h1>
        <p className="text-muted-foreground">
          Faça o upload do relatório de vendas para atualizar o banco de dados do sistema.
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Box Upload */}
        <div className="flex flex-col gap-4 border rounded-xl p-6 bg-card text-card-foreground shadow-sm">
          <h2 className="text-xl font-semibold">Atualizar Base de Dados</h2>
          
          <label className="flex flex-col items-center justify-center w-full h-48 border-2 border-dashed rounded-lg cursor-pointer bg-muted/20 border-muted-foreground/30 hover:bg-muted/50 transition-colors">
            <div className="flex flex-col items-center justify-center pt-5 pb-6">
              <UploadCloud className="w-10 h-10 mb-3 text-muted-foreground" />
              <p className="mb-2 text-sm text-muted-foreground">
                <span className="font-semibold">Clique para fazer upload</span> ou arraste o arquivo
              </p>
              <p className="text-xs text-muted-foreground">XLSX, XLS (Excel)</p>
            </div>
            <input 
              type="file" 
              className="hidden" 
              accept=".xlsx, .xls"
              onChange={handleFileChange}
              disabled={loading}
            />
          </label>

          {file && (
            <div className="flex items-center gap-2 p-3 bg-muted rounded-md text-sm">
              <FileSpreadsheet className="w-4 h-4 text-emerald-500" />
              <span className="flex-1 truncate">{file.name}</span>
              <span className="text-muted-foreground text-xs">{(file.size / 1024 / 1024).toFixed(2)} MB</span>
            </div>
          )}

          {message.text && (
            <div className={`flex items-start gap-2 p-4 rounded-md text-sm ${message.type === 'success' ? 'bg-emerald-50 text-emerald-700 dark:bg-emerald-950/50 dark:text-emerald-400' : 'bg-red-50 text-red-700 dark:bg-red-950/50 dark:text-red-400'}`}>
              {message.type === 'success' ? <CheckCircle2 className="w-5 h-5 shrink-0" /> : <AlertCircle className="w-5 h-5 shrink-0" />}
              <div>{message.text}</div>
            </div>
          )}

          <button
            onClick={handleUpload}
            disabled={!file || loading}
            className="w-full flex items-center justify-center gap-2 bg-primary text-primary-foreground h-10 px-4 py-2 rounded-md hover:bg-primary/90 disabled:opacity-50 font-medium transition-colors"
          >
            {loading ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin" />
                Processando...
              </>
            ) : (
              "Importar Dados"
            )}
          </button>
        </div>

        {/* Box Template / Instructions */}
        <div className="flex flex-col gap-4 border rounded-xl p-6 bg-card text-card-foreground shadow-sm h-fit">
          <h2 className="text-xl font-semibold flex items-center gap-2">
            <AlertCircle className="w-5 h-5" />
            Atenção (Guardrails)
          </h2>
          <div className="text-sm text-muted-foreground space-y-4">
            <p>
              O sistema utiliza validações automáticas para garantir a integridade dos dados (Guardrails).
            </p>
            <p>
              Seu arquivo Excel deve conter as mesmas colunas do <strong>Template Padrão</strong>. Arquivos com colunas faltando ou nomes divergentes serão bloqueados.
            </p>
            
            <div className="pt-2">
              <a 
                href="/api/download-template" 
                download
                className="inline-flex items-center gap-2 border border-input bg-background hover:bg-accent hover:text-accent-foreground h-9 px-4 py-2 rounded-md text-sm font-medium transition-colors"
              >
                <Download className="w-4 h-4" />
                Baixar Planilha de Exemplo
              </a>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
