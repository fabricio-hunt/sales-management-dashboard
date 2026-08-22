import { Loader2 } from "lucide-react"

export default function Loading() {
  return (
    <div className="flex flex-col items-center justify-center w-full h-full min-h-[500px] space-y-4">
      <div className="p-4 bg-blue-50 text-blue-600 rounded-full animate-pulse">
        <Loader2 className="w-8 h-8 animate-spin" />
      </div>
      <div className="flex flex-col items-center">
        <h2 className="text-xl font-semibold text-slate-800">Carregando módulo...</h2>
        <p className="text-sm text-slate-500">Preparando os dados, por favor aguarde.</p>
      </div>
    </div>
  )
}
