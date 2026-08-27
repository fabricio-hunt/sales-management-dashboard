# Roteiro de Teste de Aceitação

Documento para acompanhar a primeira validação do cliente. A ideia não é caçar bug de tela — é
confirmar que o sistema responde às perguntas certas e que os números batem com a realidade dele.

---

## Antes de enviar o acesso

Checklist do nosso lado. Nada abaixo deve ficar pendente quando o cliente entrar.

- [ ] Representantes atribuídos a cada supervisor (`supervisor_representantes` não pode estar vazio)
- [ ] Ciclo de senha testado ponta a ponta em produção: criar usuário, entrar, ser obrigado a trocar
- [ ] Pelo menos uma venda manual lançada e conferida em Visão Equipe e nos rankings
- [ ] Meses anteriores importados (com um mês só, evolução e rankings não têm o que comparar)
- [ ] Percentuais de premiação preenchidos no mês, senão a comissão sai zerada

---

## Diga isto ao cliente antes de ele começar

Três coisas que ele vai encontrar e que **não são defeito**. Avisar antes evita que ele gaste o
teste reportando o que já sabemos:

1. **A comissão ainda não é para pagamento.** As faixas de atingimento são um rascunho tirado da
   planilha original. A tela avisa isso no topo. Falta ele nos informar as regras reais.
2. **CLT e PJ ainda não são diferenciados**, e o **Prêmio de Positivação ainda não entra no
   cálculo.** O campo de regime já existe no cadastro da equipe, mas nenhum cálculo o usa.
3. **O mês corrente é sempre parcial.** Comparar dias já vendidos contra a meta cheia do mês faz o
   atingimento parecer baixo. Não é a equipe indo mal nem conta errada.

---

## Roteiro

### 1. Primeiro acesso (todos os papéis)

| O que fazer | O que deve acontecer |
|---|---|
| Entrar com a senha recebida | É levado direto para a troca de senha e nada mais abre antes disso |
| Definir a nova senha | Cai no Resumo Geral |
| Sair e entrar de novo com a senha nova | Entra direto, sem pedir troca |
| Abrir **Minha conta** pelo rodapé do menu | Consegue mudar nome de exibição e senha |

### 2. Como Manager

| O que fazer | O que confirmar |
|---|---|
| Percorrer todas as telas do menu | Os totais batem com o que ele conhece do próprio negócio |
| Abrir **Como usar esta tela** em algumas telas | O texto explica de onde vem o número e faz sentido para a operação dele |
| Importar a planilha do mês | O total importado bate com a planilha de origem |
| Cadastrar meta e % de premiação de um representante | Reflete em Visão Equipe e em Comissão |
| Criar um usuário de teste | Consegue definir senha inicial e depois redefinir pelo ícone de chave |
| Ajustar Permissões de um papel | O item some ou aparece no menu daquele usuário |

**Pergunta central para ele:** olhando estas telas, ele consegue tomar as decisões que hoje toma na
planilha? O que falta?

### 3. Como Supervisor

| O que fazer | O que confirmar |
|---|---|
| Entrar e olhar Visão Equipe | Aparecem exatamente os representantes atribuídos, nenhum a mais |
| Tentar abrir uma tela administrativa pela URL | É trazido de volta ao Resumo Geral com aviso explicando o motivo |
| Lançar uma venda pelo Lançar Venda | Consegue escolher entre os representantes dele, e só entre eles |

### 4. Como Vendedor

| O que fazer | O que confirmar |
|---|---|
| Entrar e olhar as telas disponíveis | Vê apenas o próprio desempenho |
| Procurar dado de um colega em qualquer tela | Não encontra em lugar nenhum |
| Lançar uma venda | Sai no próprio nome, sem opção de escolher outro representante |

### 5. Segurança (fazer junto com ele, dá confiança)

| O que fazer | O que deve acontecer |
|---|---|
| Copiar uma URL interna e abrir em janela anônima | Cai no login, e depois de autenticar volta para a página pedida |
| Um vendedor abrir link de tela administrativa | Volta ao Resumo Geral com o aviso de acesso negado |
| Dois usuários diferentes abrirem a mesma tela | Cada um vê só o próprio escopo |

---

## Como registrar o retorno

Para cada ponto levantado, pedir:

- **em qual tela**, **qual mês** e **o que ele esperava ver**;
- se é **número errado** (dado/regra) ou **falta de recurso** (algo que não existe ainda).

Essa separação é o que decide a prioridade: número errado a gente corrige antes de qualquer coisa
nova, porque contamina a confiança em todo o resto.

---

## Perguntas que precisamos responder nesta rodada

Independentemente do que ele encontrar, estas quatro estão bloqueando o cálculo de comissão:

1. O que muda entre **CLT e PJ**? Percentual, faixa, ou só alguns dos prêmios se aplicam?
2. Como se calcula o **Prêmio de Positivação**? Valor por cliente positivado, ou percentual sobre algo?
3. Os três prêmios (Positivação, Caixa, Financeiro) **somam** ou são **excludentes**?
4. Quais são os **limiares e fatores reais** das faixas de atingimento?

E uma de dados, ainda em aberto: a positivação do representante 90 diverge — **471 contra 485**.
Qual dos dois números é o correto, e de onde sai o que ele considera certo?
