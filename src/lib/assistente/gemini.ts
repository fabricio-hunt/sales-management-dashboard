import { GoogleGenAI } from "@google/genai";
import { CONTEXTO_DOCUMENTACAO } from "./contexto";

export type PapelMensagem = "user" | "model";
export type MensagemChat = { role: PapelMensagem; texto: string };

// Configurável via env sem precisar alterar código — troca de modelo Gemini
// (ex.: um flash mais novo) não deve exigir deploy de código.
const MODELO_PADRAO = "gemini-2.5-flash";

const SYSTEM_INSTRUCTION = `Você é o assistente de documentação do sistema de gestão comercial usado por esta distribuidora (um dashboard que substitui o controle antigo em planilha Excel).

Responda SOMENTE com base na documentação abaixo. Nunca invente uma funcionalidade, tela, regra de cálculo ou permissão que não esteja descrita nela.
Se a pergunta não puder ser respondida com o que está na documentação, diga claramente que não tem essa informação e sugira procurar o Manager do sistema — não tente adivinhar.
Quando o "Manual de Uso" e a "Ajuda contextual por tela" divergirem da "Documentação técnica de apoio", prefira o Manual e a Ajuda contextual — são a fonte mais atual; a documentação técnica pode estar desatualizada.
Responda sempre em português do Brasil, em tom direto e prático, como alguém que já usa o sistema no dia a dia. Respostas curtas e objetivas — evite parágrafos longos quando uma lista resolver.

--- DOCUMENTAÇÃO DO SISTEMA ---
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
      maxOutputTokens: 1024,
    },
    history: historicoAnterior,
  });

  const resposta = await chat.sendMessageStream({ message: ultima.texto });
  for await (const chunk of resposta) {
    if (chunk.text) yield chunk.text;
  }
}
