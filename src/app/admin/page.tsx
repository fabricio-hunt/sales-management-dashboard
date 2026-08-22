"use client"
import { useState } from "react"
import { Upload, FileSpreadsheet, CheckCircle2, AlertCircle } from "lucide-react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Progress } from "@/components/ui/progress"
import { toast } from "sonner"
import * as xlsx from "xlsx"

export default function AdminPage() {
  const [isDragging, setIsDragging] = useState(false)
  const [file, setFile] = useState<File | null>(null)
  const [isUploading, setIsUploading] = useState(false)
  const [progress, setProgress] = useState(0)
  
  const onDragOver = (e: React.DragEvent) => {
    e.preventDefault()
    setIsDragging(true)
  }
  
  const onDragLeave = (e: React.DragEvent) => {
    e.preventDefault()
    setIsDragging(false)
  }
  
  const onDrop = (e: React.DragEvent) => {
    e.preventDefault()
    setIsDragging(false)
    if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
      handleFile(e.dataTransfer.files[0])
    }
  }
  
  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files.length > 0) {
      handleFile(e.target.files[0])
    }
  }

  const handleFile = (selectedFile: File) => {
    if (!selectedFile.name.endsWith(".xlsx") && !selectedFile.name.endsWith(".xls")) {
      toast.error("Formato inválido", { description: "Por favor, selecione um arquivo Excel (.xlsx ou .xls)" })
      return
    }
    setFile(selectedFile)
  }
  
  const processData = async () => {
    if (!file) return
    setIsUploading(true)
    setProgress(10)
    
    try {
      const reader = new FileReader()
      
      reader.onload = async (e) => {
        try {
          setProgress(30)
          const data = e.target?.result
          const workbook = xlsx.read(data, { type: "array", cellDates: true })
          
          setProgress(50)
          // Ensure "DD PEDIDOS" exists
          const sheetName = workbook.SheetNames.find(s => s.trim().toUpperCase() === "DD PEDIDOS") || workbook.SheetNames[0]
          const worksheet = workbook.Sheets[sheetName]
          const rawJson = xlsx.utils.sheet_to_json<any>(worksheet)
          
          setProgress(60)
          
          // Map to database schema
          const mappedData = rawJson.map(row => {
            let dataDocumento = null
            if (row["Data Documento"]) {
              dataDocumento = new Date(row["Data Documento"])
              if (isNaN(dataDocumento.getTime())) {
                dataDocumento = null
              }
            }

            return {
              data_documento: dataDocumento ? dataDocumento.toISOString() : null,
              nota_fiscal: row["Nota Fiscal"]?.toString() || null,
              cliente_nome: row["Cliente"] || null,
              cliente_cnpj: row["CPF\\CNPJ"]?.toString() || null,
              municipio: row["Município"] || null,
              uf: row["UF"] || null,
              representante: row["Representante"] || null,
              produto_nome: row["Produto"] || null,
              fornecedor_nome: row["Fornecedor"] || null,
              valor_venda_liquida: parseFloat(row["VDA LIQ"] ?? row["Venda Liq."] ?? row["TT VDA LIQ"]) || 0,
              valor_compra: parseFloat(row["Compra"]) || 0,
              qtde: parseFloat(row["Qtde Saída"] ?? row["PEDIDOS"]) || 0,
              desconto: parseFloat(row["Desconto"] ?? row["Desconto Promocional"]) || 0
            }
          })
          
          setProgress(70)

          // Insert in chunks of 500
          const chunkSize = 500
          
          const { supabase } = await import("@/lib/supabase")

          // Clear table first to avoid duplication (optional, but good for "refresh")
          // We will just do inserts for now. Let's delete all first.
          await supabase.from("pedidos").delete().neq('id', '00000000-0000-0000-0000-000000000000') // Deletes all

          for (let i = 0; i < mappedData.length; i += chunkSize) {
            const chunk = mappedData.slice(i, i + chunkSize)
            const { error } = await supabase.from("pedidos").insert(chunk)
            
            if (error) {
              console.error("Supabase insert error:", error)
              throw new Error(`Erro ao inserir lote ${i / chunkSize + 1}`)
            }
            
            // Update progress: from 70% to 100%
            const currentProgress = 70 + Math.floor(((i + chunkSize) / mappedData.length) * 30)
            setProgress(Math.min(currentProgress, 100))
          }
          
          toast.success("Sucesso!", { description: `${mappedData.length} registros inseridos com sucesso.` })
          setFile(null)
        } catch (error) {
          console.error(error)
          toast.error("Erro no processamento", { description: error instanceof Error ? error.message : "Houve um problema ao ler a planilha." })
        } finally {
          setIsUploading(false)
          setTimeout(() => setProgress(0), 1000)
        }
      }
      
      reader.readAsArrayBuffer(file)
    } catch (error) {
      setIsUploading(false)
      toast.error("Falha", { description: "Não foi possível iniciar o processamento." })
    }
  }

  return (
    <div className="p-8 max-w-5xl mx-auto space-y-8">
      <div className="flex flex-col gap-2">
        <h1 className="text-3xl font-bold tracking-tight">Atualização de Base de Dados</h1>
        <p className="text-muted-foreground">
          Faça o upload do Relatório de Vendas gerado pelo ERP. O processamento será feito localmente em lotes.
        </p>
      </div>

      <Card className="border-2 border-dashed">
        <CardHeader>
          <CardTitle>Área de Upload</CardTitle>
          <CardDescription>Formatos suportados: .xlsx</CardDescription>
        </CardHeader>
        <CardContent>
          <div 
            className={`flex flex-col items-center justify-center p-12 rounded-lg transition-colors ${
              isDragging ? "bg-blue-50 border-blue-500" : "bg-slate-50"
            }`}
            onDragOver={onDragOver}
            onDragLeave={onDragLeave}
            onDrop={onDrop}
          >
            {!file ? (
              <>
                <div className="w-16 h-16 mb-4 rounded-full bg-blue-100 flex items-center justify-center">
                  <Upload className="w-8 h-8 text-blue-600" />
                </div>
                <h3 className="text-lg font-medium mb-2">Arraste e solte o arquivo aqui</h3>
                <p className="text-sm text-muted-foreground mb-6">ou clique no botão abaixo para selecionar</p>
                <div className="relative">
                  <Button variant="outline" className="cursor-pointer">Procurar Arquivo</Button>
                  <input 
                    type="file" 
                    accept=".xlsx, .xls"
                    className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
                    onChange={handleFileChange}
                  />
                </div>
              </>
            ) : (
              <div className="flex flex-col items-center w-full max-w-md">
                <div className="w-16 h-16 mb-4 rounded-full bg-green-100 flex items-center justify-center">
                  <FileSpreadsheet className="w-8 h-8 text-green-600" />
                </div>
                <h3 className="text-lg font-medium mb-2 break-all text-center">{file.name}</h3>
                <p className="text-sm text-muted-foreground mb-6">
                  {(file.size / 1024 / 1024).toFixed(2)} MB
                </p>
                
                {isUploading ? (
                  <div className="w-full space-y-2">
                    <div className="flex justify-between text-sm">
                      <span>Processando e Sincronizando...</span>
                      <span>{progress}%</span>
                    </div>
                    <Progress value={progress} className="h-2" />
                  </div>
                ) : (
                  <div className="flex gap-4">
                    <Button variant="outline" onClick={() => setFile(null)}>Cancelar</Button>
                    <Button onClick={processData} className="bg-blue-600 hover:bg-blue-700">
                      <CheckCircle2 className="w-4 h-4 mr-2" />
                      Sincronizar com Banco
                    </Button>
                  </div>
                )}
              </div>
            )}
          </div>
        </CardContent>
      </Card>
      
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center text-sm font-medium text-muted-foreground">
              <AlertCircle className="w-4 h-4 mr-2 text-blue-500" />
              Como funciona o processamento?
            </CardTitle>
          </CardHeader>
          <CardContent className="text-sm text-muted-foreground space-y-2">
            <p>1. O arquivo é lido <strong>diretamente no seu navegador</strong> (não sobe inteiro para o servidor).</p>
            <p>2. Os dados brutos são extraídos das abas (ex: DD PEDIDOS).</p>
            <p>3. Os registros são enviados em lotes de 1.000 para o Supabase PostgreSQL.</p>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
