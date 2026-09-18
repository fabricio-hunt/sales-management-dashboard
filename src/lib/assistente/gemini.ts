import { GoogleGenAI } from "@google/genai";
import { CONTEXTO_DOCUMENTACAO } from "./contexto";

export type PapelMensagem = "user" | "model";
export type MensagemChat = { role: PapelMensagem; texto: string };

// Configurável via env sem precisar alterar código — troca de modelo Gemini
// (ex.: um flash mais novo) não deve exigir deploy de código.
//
// gemini-2.5-flash foi descontinuado para novas chaves (a API passou a
// devolver 404 pedindo pra trocar por um modelo da família 3.x) — confirmado
// direto contra a API em 18/09/2026. Reavaliar este default se a API voltar a
// recomendar outro modelo.
const MODELO_PADRAO = "gemini-3.6-flash";

const SYSTEM_INSTRUCTION = `Você é o assistente de NEGÓCIO do sistema de gestão comercial usado por esta distribuidora (um dashboard que substitui o controle antigo em planilha Excel). Seu escopo é só uso do sistema e conceitos de negócio — como usar cada tela, o que cada número/métrica significa, regras de comissão e importação do ponto de vista de quem opera o sistema no dia a dia.

Responda SOMENTE com base na documentação abaixo. Nunca invente uma funcionalidade, tela, regra de cálculo ou permissão que não esteja descrita nela.
Se a pergunta não puder ser respondida com o que está na documentação, diga claramente que não tem essa informação e sugira procurar o Manager do sistema — não tente adivinhar.
Responda sempre em português do Brasil, em tom direto e prático, como alguém que já usa o sistema no dia a dia. Respostas curtas e objetivas — evite parágrafos longos quando uma lista resolver.

FORA DE ESCOPO — recuse educadamente e redirecione para negócio/uso, mesmo que você "soubesse" responder:
- Perguntas técnicas: arquitetura, stack, banco de dados, tabelas, código, deploy, infraestrutura, como o sistema foi construído.
- Perguntas de segurança: autenticação, permissões em nível de banco/RLS, criptografia, como os dados são protegidos, vulnerabilidades, ou qualquer variação de "o sistema é seguro?"/"como vocês protegem X?".
Para as duas categorias acima, responda algo como: "Isso foge do que posso responder aqui — sou focado em como usar o sistema e conceitos de negócio. Para essa pergunta, procure o time técnico/Manager." Não explique o motivo em detalhe, não tente responder parcialmente.

--- DOCUMENTAÇÃO DO SISTEMA (uso e negócio) ---
${CONTEXTO_DOCUMENTACAO}
--- FIM DA DOCUMENTAÇÃO ---`;

let client: GoogleGenAI | null = null;

function getClient(): GoogleGenAI {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) {
    throw new Error("GEMINI_API_KEY não configurada no ambiente.");
  }
  if (!client) {
    client = new GoogleGenAI({ apiKey });
  }
  return client;
}

// historico inclui a pergunta atual como último item (role "user"). O resto
// vira o history do chat do SDK; a última mensagem é enviada via
// sendMessageStream, que é o que efetivamente dispara a resposta.
export async function* perguntarAssistenteStream(historico: MensagemChat[]): AsyncGenerator<string> {
  const ultima = historico[historico.length - 1];
  if (!ultima || ultima.role !== "user") {
    throw new Error("A última mensagem do histórico precisa ser do usuário.");
  }

  const historicoAnterior = historico.slice(0, -1).map((mensagem) => ({
    role: mensagem.role,
    parts: [{ text: mensagem.texto }],
  }));

  const ai = getClient();
  const chat = ai.chats.create({
    model: process.env.GEMINI_MODEL || MODELO_PADRAO,
    config: {
      systemInstruction: SYSTEM_INSTRUCTION,
      temperature: 0.3,
      // Modelos gemini-3.x consomem "thinking tokens" do mesmo orçamento de
      // maxOutputTokens antes de gerar a resposta final — um valor baixo aqui
      // pode zerar a resposta visível mesmo com a chamada "funcionando" (sem
      // erro, só sem texto). 2048 dá folga sobre o raciocínio interno.
      maxOutputTokens: 2048,
    },
    history: historicoAnterior,
  });

  const resposta = await enviarComRetry(() => chat.sendMessageStream({ message: ultima.texto }));
  for await (const chunk of resposta) {
    if (chunk.text) yield chunk.text;
  }
}

// A API do Gemini devolve 503 ("model is currently experiencing high demand")
// com alguma frequência antes de sequer abrir o stream — observado na prática
// em 18/09/2026. Como isso acontece antes de qualquer chunk ser gerado (não
// tem conteúdo parcial pra descartar), vale a pena tentar de novo em vez de
// já cair na mensagem de erro genérica pro usuário. 429 (rate limit) entra na
// mesma lógica por ser igualmente transitório.
const ATRASOS_RETRY_MS = [500, 1500];

function isErroTransitorio(error: unknown): boolean {
  const status = (error as { status?: number } | undefined)?.status;
  return status === 503 || status === 429;
}

async function enviarComRetry<T>(chamada: () => Promise<T>): Promise<T> {
  for (let tentativa = 0; ; tentativa++) {
    try {
      return await chamada();
    } catch (error) {
      if (!isErroTransitorio(error) || tentativa >= ATRASOS_RETRY_MS.length) throw error;
      console.warn(`[assistente] erro transitório do Gemini, tentativa ${tentativa + 1}:`, error);
      await new Promise((resolve) => setTimeout(resolve, ATRASOS_RETRY_MS[tentativa]));
    }
  }
}
