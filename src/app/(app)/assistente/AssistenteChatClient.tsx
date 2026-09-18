"use client";

import { useEffect, useRef, useState, type FormEvent, type KeyboardEvent } from "react";
import { Send, Bot, User, Loader2 } from "lucide-react";
import { toast } from "sonner";
import { Card } from "@/components/ui/card";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { cn } from "@/lib/utils";

type Mensagem = { role: "user" | "model"; texto: string };

// Mesmo limite de turnos aceito pelo backend (src/app/api/assistente/chat/route.ts)
// — truncar aqui também evita mandar um payload que o servidor só vai cortar.
const MAX_TURNOS_ENVIADOS = 12;

const PERGUNTAS_SUGERIDAS = [
  "Como a comissão é calculada?",
  "Quem pode importar a base de vendas?",
  "Por que a positivação pode aparecer diferente do esperado?",
];

export function AssistenteChatClient({ nome }: { nome: string }) {
  const [mensagens, setMensagens] = useState<Mensagem[]>([]);
  const [input, setInput] = useState("");
  const [enviando, setEnviando] = useState(false);
  const fimRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    fimRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [mensagens]);

  async function enviar(texto: string) {
    const pergunta = texto.trim();
    if (!pergunta || enviando) return;

    const historico: Mensagem[] = [...mensagens, { role: "user", texto: pergunta }];
    setMensagens([...historico, { role: "model", texto: "" }]);
    setInput("");
    setEnviando(true);

    try {
      const resposta = await fetch("/api/assistente/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ mensagens: historico.slice(-MAX_TURNOS_ENVIADOS) }),
      });

      if (!resposta.ok || !resposta.body) {
        throw new Error(await resposta.text().catch(() => "Falha ao obter resposta do assistente."));
      }

      const reader = resposta.body.getReader();
      const decoder = new TextDecoder();
      let acumulado = "";

      for (;;) {
        const { done, value } = await reader.read();
        if (done) break;
        acumulado += decoder.decode(value, { stream: true });
        const textoAtual = acumulado;
        setMensagens((atual) => {
          const copia = [...atual];
          copia[copia.length - 1] = { role: "model", texto: textoAtual };
          return copia;
        });
      }
    } catch (error) {
      console.error("[assistente]", error);
      toast.error("Não foi possível falar com o assistente agora. Tente novamente.");
      setMensagens((atual) => atual.slice(0, -2));
      setInput(pergunta);
    } finally {
      setEnviando(false);
    }
  }

  function onSubmit(event: FormEvent) {
    event.preventDefault();
    void enviar(input);
  }

  function onKeyDown(event: KeyboardEvent<HTMLTextAreaElement>) {
    if (event.key === "Enter" && !event.shiftKey) {
      event.preventDefault();
      void enviar(input);
    }
  }

  return (
    <Card className="flex h-[70vh] flex-col overflow-hidden">
      <ScrollArea className="flex-1 px-4 py-4">
        {mensagens.length === 0 ? (
          <div className="flex h-full flex-col items-center justify-center gap-4 text-center">
            <Bot className="h-10 w-10 text-muted-foreground" aria-hidden />
            <div className="space-y-1">
              <p className="font-medium text-foreground">Olá, {nome.split(" ")[0]}.</p>
              <p className="max-w-sm text-sm text-muted-foreground">
                Pergunte sobre como usar o sistema. Respondo com base no Manual de Uso e na documentação interna —
                se não souber, aviso em vez de chutar.
              </p>
            </div>
            <div className="flex flex-wrap justify-center gap-2">
              {PERGUNTAS_SUGERIDAS.map((pergunta) => (
                <Button key={pergunta} variant="outline" size="sm" onClick={() => enviar(pergunta)}>
                  {pergunta}
                </Button>
              ))}
            </div>
          </div>
        ) : (
          <div className="flex flex-col gap-4">
            {mensagens.map((mensagem, index) => (
              <div key={index} className={cn("flex gap-2", mensagem.role === "user" && "flex-row-reverse")}>
                <Avatar className="h-7 w-7 shrink-0">
                  <AvatarFallback>
                    {mensagem.role === "user" ? <User className="h-4 w-4" /> : <Bot className="h-4 w-4" />}
                  </AvatarFallback>
                </Avatar>
                <div
                  className={cn(
                    "max-w-[80%] rounded-lg px-3 py-2 text-sm whitespace-pre-wrap",
                    mensagem.role === "user" ? "bg-primary text-primary-foreground" : "bg-muted text-foreground"
                  )}
                >
                  {mensagem.texto || <Loader2 className="h-4 w-4 animate-spin" aria-label="Pensando" />}
                </div>
              </div>
            ))}
            <div ref={fimRef} />
          </div>
        )}
      </ScrollArea>

      <form onSubmit={onSubmit} className="flex items-end gap-2 border-t border-border p-3">
        <Textarea
          value={input}
          onChange={(event) => setInput(event.target.value)}
          onKeyDown={onKeyDown}
          placeholder="Digite sua pergunta sobre o sistema..."
          className="min-h-10 flex-1 resize-none"
          maxLength={2000}
          disabled={enviando}
        />
        <Button type="submit" disabled={enviando || !input.trim()} size="icon" aria-label="Enviar pergunta">
          <Send className="h-4 w-4" />
        </Button>
      </form>
    </Card>
  );
}
