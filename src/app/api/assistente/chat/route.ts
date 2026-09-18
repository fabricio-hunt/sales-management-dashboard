import { NextRequest } from "next/server";
import { getCurrentProfile } from "@/lib/auth/session";
import { perguntarAssistenteStream, type MensagemChat } from "@/lib/assistente/gemini";

// Aberto a todo usuário autenticado (sem requirePermission) — mesmo padrão de
// acesso do Manual de Uso (/docs): não é um módulo revogável por permissão.
export const runtime = "nodejs";

const MAX_CARACTERES_MENSAGEM = 2000;
const MAX_TURNOS_HISTORICO = 12;

type MensagemBruta = { role?: unknown; texto?: unknown };

// Sem infraestrutura de rate limit persistente (ver plano) — este limite de
// tamanho/turnos é a única proteção de custo/abuso do v1.
function validarMensagens(body: unknown): MensagemChat[] | null {
  if (typeof body !== "object" || body === null) return null;
  const mensagens = (body as { mensagens?: unknown }).mensagens;
  if (!Array.isArray(mensagens) || mensagens.length === 0) return null;

  const recentes = mensagens.slice(-MAX_TURNOS_HISTORICO) as MensagemBruta[];
  const validas: MensagemChat[] = [];
  for (const item of recentes) {
    const role = item?.role;
    const texto = item?.texto;
    if (
      (role !== "user" && role !== "model") ||
      typeof texto !== "string" ||
      texto.trim().length === 0 ||
      texto.length > MAX_CARACTERES_MENSAGEM
    ) {
      return null;
    }
    validas.push({ role, texto });
  }

  if (validas[validas.length - 1].role !== "user") return null;
  return validas;
}

export async function POST(request: NextRequest) {
  const profile = await getCurrentProfile();
  if (!profile) {
    return new Response("Não autenticado.", { status: 401 });
  }

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return new Response("Corpo da requisição inválido.", { status: 400 });
  }

  const mensagens = validarMensagens(body);
  if (!mensagens) {
    return new Response("Mensagem inválida ou vazia.", { status: 400 });
  }

  let streamGemini: AsyncGenerator<string>;
  try {
    streamGemini = perguntarAssistenteStream(mensagens);
  } catch (error) {
    console.error("[assistente] falha ao preparar a conversa:", error);
    return new Response("Assistente indisponível no momento. Tente novamente em instantes.", { status: 502 });
  }

  const encoder = new TextEncoder();
  const stream = new ReadableStream<Uint8Array>({
    async start(controller) {
      try {
        for await (const pedaco of streamGemini) {
          controller.enqueue(encoder.encode(pedaco));
        }
      } catch (error) {
        console.error("[assistente] falha ao gerar resposta:", error);
        controller.enqueue(
          encoder.encode("\n\n[Não foi possível concluir a resposta agora. Tente novamente em instantes.]")
        );
      } finally {
        controller.close();
      }
    },
  });

  return new Response(stream, { headers: { "Content-Type": "text/plain; charset=utf-8" } });
}
