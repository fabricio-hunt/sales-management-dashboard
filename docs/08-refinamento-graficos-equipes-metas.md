# Refinamento: Gráficos, Equipes e Metas em Cascata

> Documento criado em 21/09/2026, fase de refinamento, a partir de feedback do cliente sobre
> gráficos, o Resumo da Distribuição, metas e organização por equipe. Objetivo: separar o que já
> pode virar plano de implementação do que depende de decisão/resposta do cliente. Nenhuma
> mudança de código foi feita a partir deste documento — só análise.

## 1. Feedback recebido (21/09/2026)

Resumo do que o cliente pediu, na íntegra por tema:

**Gráficos.** Só gráficos em barra, com rótulos e informações claras. Cada gráfico deve ser
colorido, com cores diferentes. Não quer gráficos de pizza nem de linha.

**Resumo da Distribuição.** Deve mostrar: Base ativa (cadastro), o que está ativo, a Meta e o
Realizado. O cliente reforça que possui **7 equipes**.

**Metas em cascata.** O Manager sobe a meta diária; supervisores e vendedores têm a meta que
precisam atingir (derivada da meta do Manager). A divisão não é por representante — é por
**equipe** (os gráficos de BI devem ser por equipe).

**Equipes.** Cada supervisor tem uma equipe. Cada equipe deve ter uma cor própria nos gráficos.
Cada equipe é identificada por um **número**, não por um nome, por causa da rotatividade de
pessoas.

**Analítico de Vendas.** Precisa ser organizado por equipe.

### 1.1 Complemento por áudio (21/09/2026)

Transcrição de um áudio do cliente, recebida no mesmo dia, detalhando a meta diária:

> No analítico de vendas por equipe, são sete equipes. Ele quer que as equipes sejam divididas —
> ou seja, ele vai cadastrar a meta diária, e os vendedores (sob supervisão dos supervisores) vão
> ter ali as metas que precisam atingir. Por exemplo: a Sheila, de Jundiaí, tem que vender,
> digamos, "Xoquito". Na segunda-feira e na terça, ela tem que vender "Prestígio". Isso precisa
> ser feito um a um — planilha por planilha, para cada vendedor. O representante (vendedor) não
> vai ter tablet por enquanto — isso fica pra um segundo módulo, talvez pelo celular. Por ora, o
> que ele vai ter é o supervisor.

Dois pontos relevantes que esse áudio muda em relação à leitura inicial do feedback:

- **A meta diária parece ser mais granular do que uma cota numérica** — soa como um plano de qual
  produto/marca empurrar em qual dia da semana, por vendedor (não só um valor em R$/caixas). Ver
  achado em 2.6 — isso **não existe em nenhuma planilha atual**, é funcionalidade nova.
- **Lançamento é manual, um vendedor de cada vez** ("planilha por planilha") — não confirma a
  leitura de "cascata automática" (Manager define um número, sistema distribui sozinho) que a
  seção 2.3 original assumia como uma das opções.
- **O vendedor não deve ter dispositivo próprio (tablet/app) por enquanto** — só o supervisor
  opera o sistema. Isso é uma tensão com o que já existe no código: hoje o sistema **já tem**
  login funcional pro vendedor (ele entra e vê a própria página, ver `04-regras-de-negocio.md` e
  `PENDENCIAS.md`, item resolvido em 26/08 na v2). Precisa esclarecer com o cliente se isso deve
  continuar existindo (só sem app de lançamento) ou se o acesso do vendedor deveria ser retirado.

## 2. Análise técnica gap-a-gap

### 2.1 Gráficos → só barra, coloridos, com rótulos — ✅ implementado em 21/09/2026

**Estava assim** (`dashboard`, biblioteca Recharts):

| Componente | Tipo antes | Onde é usado |
|---|---|---|
| `src/components/charts/CategoryBarChart.tsx` | Barra (horizontal) | `rankings/clientes`, `rankings/vendedores`, `rankings/financeiro`, `rankings/positivacao`, `analitico/cliente`, `analitico/devolucoes` |
| `src/components/dashboard/OverviewChart.tsx` | Barra (vertical) | Não referenciado em nenhuma tela hoje (órfão, deixado como está) |
| `src/components/charts/DistributionDonut.tsx` | **Pizza/donut** | `produtos/page.tsx` (Curva ABC de Produtos) |
| `src/components/charts/TrendLineChart.tsx` | **Linha/área** | `equipe/page.tsx` (faturamento diário), `analitico/faturamento-dia/page.tsx` |
| `src/components/charts/YearComparisonChart.tsx` | **Linha/área**, 2 séries | `comparativo-anual/page.tsx` |

**O que foi feito:**
- `DistributionDonut.tsx` → renomeado/reescrito como `DistributionBarChart.tsx` (barra vertical,
  cor por classe via `Cell`, rótulo de valor no topo). `produtos/page.tsx` atualizado.
- `TrendLineChart.tsx` → renomeado/reescrito como `TrendBarChart.tsx` (barra por dia). Sem rótulo
  por barra (14-31 pontos ficaria poluído — eixo + tooltip carregam o valor, seguindo a regra de
  "nunca rotular todo ponto" da skill de dataviz usada). `equipe/page.tsx` e
  `analitico/faturamento-dia/page.tsx` atualizados.
- `YearComparisonChart.tsx` → de área com 2 séries pra barras agrupadas lado a lado por mês,
  mesma legenda.
- `CategoryBarChart.tsx` → ganhou cor por item (`Cell`, opcional via `data[].color`, cai no
  `color` único se não informado — mantém compatibilidade com as 6 telas que já usavam) e rótulo
  de valor na ponta da barra (`LabelList`). Ajustada a margem direita do gráfico pra parar de
  cortar o rótulo no maior valor (achado ao testar no navegador, Ranking Financeiro).
- Paleta (`src/lib/design-tokens.ts`, `chartPalette`) expandida de 5 para **8 cores**, ordem fixa
  validada contra daltonismo (protanopia/tritanopia) — dá pra cobrir as 7 equipes sem repetir cor
  quando a entidade `equipes` existir.
- Testado no navegador logado (Curva ABC, Faturamento Diário, Visão Equipe, Comparativo Anual,
  Ranking Financeiro, Devoluções) e `tsc`/`eslint` limpos.

**O que fica em aberto** (depende da resposta às perguntas 12/13 da seção 3): se a recolorização
por item deve se estender também aos rankings hoje monocromáticos (cliente/vendedor individual),
e como a cor de cada equipe deve amarrar entre gráficos diferentes quando `equipes` existir.

### 2.2 Resumo da Distribuição → cadastro / ativo / meta / realizado, por equipe — ✅ implementado em 22/09/2026

**Decisões tomadas sem resposta do cliente** (ele está difícil de acessar — ver
`plano-implementacao-equipes.md`), documentadas pra revisitar se ele confirmar diferente depois:
- **Fica dentro da tela `/distribuicao` existente**, como uma seção nova no topo — não virou rota
  separada. O cliente chamou o pedido de "Resumo da Distribuição", mesmo nome já usado pela tela.
  Resolve a pergunta 11 (substitui ou convive) na prática: convive, a tabela por fornecedor que já
  existia continua embaixo, sem mudança.
- **"Meta"/"Realizado" = Obj. Positivação / positivação realizada** — mesmo par que o card
  "Positivação de Clientes" de `/equipe` já usa, só agregado por equipe em vez de por
  representante/escopo selecionado. Não é meta financeira.
- **"O que está ativo" = clientes com pelo menos 1 venda no mês corrente** (view nova,
  `vw_positivacao_equipe`) — período assumido como "mês corrente" (mesmo filtro `MesFilter` usado
  em todo o resto do sistema), pergunta 10 original não tinha esse detalhe confirmado.

Implementado: 4 mini-gráficos de barra (`DistributionBarChart`, já usava cor por item), cada barra
colorida com a cor fixa da equipe (pergunta 13 — mesma cor em qualquer gráfico). Manager vê todas
as equipes, Supervisor só a própria (mesmo mecanismo de escopo de `/equipe`). `tsc`/`eslint`
limpos.

**Estado anterior** (contexto de por que precisava de tela nova — segue válido como histórico):
existiam **duas** telas diferentes, nenhuma das duas era isso:

- `/distribuicao` (`src/app/(app)/distribuicao/page.tsx`) — tabela pivô: linhas = representante,
  colunas = fornecedor, célula = clientes positivados distintos, sem gráfico e sem os campos
  cadastro/base ativa/meta financeira.
- Card "Positivação de Clientes" em `equipe/page.tsx` — já tem Cadastro Total, Base Ativa, Obj.
  Positivação, Realizado Mês — mas é **tabela HTML por representante/escopo selecionado**, não
  gráfico de barra, e não é agrupado por equipe.

**O que muda:** nenhuma tela hoje atende ao pedido. É preciso um resumo novo (ou uma
reformulação de um dos dois existentes) que agrupe por equipe (não por representante nem por
fornecedor) e renderize em gráfico(s) de barra colorido(s) por equipe, com os quatro campos
pedidos.

### 2.3 Metas em cascata (Manager → Supervisor → Vendedor)

**Estado atual:** duas tabelas de meta, ambas por **representante**:

- `metas` — por representante × fornecedor × mês (`meta_cx`, `meta_dia_cx`, `meta_fin`, etc.).
- `metas_representante` — por representante × mês (`obj_positivacao`, overrides de
  cadastro/base ativa/positivação).

Ambas são preenchidas **uma a uma**, manualmente, em `admin/metas/MetasClient.tsx`. **Não existe
nenhum mecanismo de cascata** hoje — nenhum campo "meta da empresa" ou "meta da equipe" que se
propague para baixo. O único campo já "diário" é `meta_dia_cx` (cota diária de caixas), mas é
por representante, definido individualmente.

**O que muda:** é preciso um conceito de meta em nível de equipe (e possivelmente de
supervisor), mais um mecanismo de distribuição para vendedores — nenhuma peça disso existe hoje.
Esta é a área com mais perguntas em aberto (seção 3) antes de desenhar o schema.

### 2.4 Equipes numeradas, um supervisor por equipe, cor própria

**Estado atual:** **a entidade "equipe" não existe em nenhum lugar do sistema** — nem tabela, nem
tipo TypeScript, nem tela. O que existe hoje:

- `representantes.supervisor` (`supabase_schema.sql`) — campo de **texto livre**, sem validação,
  sem tabela própria, editado em `admin/representantes/RepresentantesClient.tsx`.
- `supervisor_representantes` (`supabase_migration_v2.sql`) — tabela de junção entre um usuário
  supervisor (`profiles`) e representantes, usada **só para escopo de RLS** (o que aquele
  supervisor pode ler), não é uma entidade de negócio com nome, número ou cor.
- O nome "EQUIPE 94" aparece hoje só como rótulo do arquivo Excel mensal importado — nunca foi
  persistido como atributo de venda, representante ou meta.

**O que muda:** é a mudança estrutural mais profunda do feedback. Precisa de:
- Tabela nova `equipes` (número, cor, supervisor vinculado).
- Vínculo representante → equipe (substituindo ou complementando o campo texto `supervisor`).
- Ajuste de `supervisor_representantes` e das políticas de RLS que dependem de `supervisor` para
  passarem a considerar a equipe.

### 2.5 Analítico de Vendas por equipe — ✅ implementado em 22/09/2026

**Era assim:** `src/app/(app)/analitico/vendas/page.tsx` filtrava e listava exclusivamente por
`representante_id` — os pills de filtro eram um por representante (rotulados pelo ID cru), e a
tabela de resultado tinha uma coluna `Rep` com o ID do representante. Não havia qualquer noção de
equipe na tela.

**Implementado:** primeira fileira de pills agora é por equipe (cor fixa da equipe no indicador),
e escolher uma abre uma segunda fileira só com os representantes daquela equipe — resolve a
pergunta 15 (drill-down continua necessário, decisão já tomada em 22/09). Tabela ganhou coluna
"Equipe" (cor + número) antes da coluna "Rep", que continua existindo. Manager vê todas as
equipes, Supervisor só a própria (mesmo mecanismo de `/distribuicao`). `tsc`/`eslint` limpos.

### 2.6 Achados nas planilhas `equipe-de-vendas/` (21/09/2026)

O cliente mencionou no áudio que ia criar uma pasta com as planilhas de cada equipe. Ela já
existe em `equipe-de-vendas/` (fora de `dashboard/`), com 6 arquivos — confirmam parte da seção 3
e trazem dado novo:

- **Números reais das equipes:** 92, 93, 94, 95, 96 e 97 — **falta um arquivo pra fechar as 7**
  que o cliente mencionou. Não são "1 a 7": são códigos no estilo do ERP, iguais ao padrão já
  visto em `representante_id` (ex.: "308", "90").
- **Cada planilha traz um nome de região** na célula de título da aba (o nome da ABA em si é
  genérico, "Equipe"/"EQUIPE" — o rótulo de região está no conteúdo da célula, não no nome da
  aba): 92 = **Campinas**, 93 = **Sorocaba**, 94 = **Jundiaí** (bate com o título já exibido em
  `/equipe` no sistema hoje), 95 = **EQ. SP**, 96 = **EQ. Sul**, 97 = **EQ. Itape**. Correção de
  22/09: a versão anterior deste documento dizia que 92/93 não tinham rótulo — checamos só o nome
  da aba, não o conteúdo da célula. Não é o nome do supervisor — é só um rótulo de região, então
  quem é o supervisor responsável por cada uma ainda não está confirmado.
- **Cada arquivo de equipe tem uma aba por representante**, nomeada com o próprio ID (confirma a
  hipótese "1 arquivo = 1 equipe, várias abas = vários representantes", achado de 22/09 depois do
  cliente confundir representante com equipe): 92 → 105, 175, 822, 114; 93 → 201, 202, 203, 205,
  206, 207, 208; 94 → 308, 310, 312, 401, 407, 408, 90; 95 → 113, 311, 314, 315, 316, 317, 318,
  414, 415, 425; 96 → 307, 309, 320, 321, 322, 323; 97 → 209, 211, 213, 214, 215, 216.
- **ACHADO GRAVE (22/09):** conferido contra produção — **nenhum** representante das equipes 92,
  93, 95, 96 e 97 existe na tabela `representantes`. Só os 7 da equipe 94 (Jundiaí) já foram
  importados, alguma vez. As outras 5 planilhas de `equipe-de-vendas/` nunca passaram pelo import
  mensal. Consequência: até esse import acontecer, o Resumo da Distribuição por equipe (2.2) só
  vai ter dado real pra 1 das 7 equipes — as outras 6 aparecem vazias mesmo com o schema pronto.
- **Quantidade de representantes varia por equipe** — de 4 (equipe 92) a 10 (equipe 95). Não é
  fixo.
- **A "Meta Dia (Caixas)" já existe na planilha hoje** — mas é um número fixo, repetido em todas
  as linhas de fornecedor do mesmo representante (ex.: representante 308 = 7 caixas/dia, sempre
  7, não importa o produto). É exatamente o que já está modelado em `metas.meta_dia_cx`. **Não
  há, em nenhuma planilha, nenhuma estrutura de "produto X num dia da semana, produto Y noutro"**
  — o exemplo da Sheila/Prestígio/Xoquito do áudio (seção 1.1) não aparece nos dados reais
  consultados. Confirma que é funcionalidade nova a desenhar, não algo pra extrair de um dado já
  existente — depende da resposta à pergunta 8 da seção 3.

## 3. Pontas soltas — perguntas para o cliente

### Equipes
1. Na pasta `equipe-de-vendas/` existem os arquivos das equipes 92, 93, 94, 95, 96 e 97 — falta
   uma para fechar as 7 mencionadas. Qual é o número da equipe que falta?
2. Cada planilha traz um nome de região (94 = Jundiaí, 95 = EQ. SP, 96 = EQ. Sul, 97 = EQ. Itape)
   — esse é o nome/identificação do supervisor responsável, ou é outra coisa? Quem é o supervisor
   de cada uma das 7 equipes?
3. Um representante pode pertencer a mais de uma equipe ao mesmo tempo, ou é sempre 1:1?
4. O número da equipe é fixo e permanente mesmo quando o supervisor ou os vendedores trocam
   (rotatividade)?
5. A cor de cada equipe é escolhida pelo cliente/manager (configurável em tela) ou pode ser
   atribuída automaticamente pelo sistema?
6. Vendas e metas históricas (lançadas antes de "equipe" existir no sistema) devem ser
   retroagidas para uma equipe com base no supervisor atual de cada representante, ou a
   organização por equipe vale só dali para frente?

### Metas em cascata
7. Hoje a planilha já tem "Meta Dia (Caixas)" — um número fixo, igual pra todos os produtos de
   cada vendedor (ex.: representante 308 = 7 caixas/dia). É essa a meta que o Manager vai definir
   daqui pra frente, ou é outra coisa mais detalhada?
8. No áudio o exemplo foi a Sheila (Jundiaí) vendendo "Prestígio" na segunda e terça, e "Xoquito"
   depois — é um plano de qual produto focar em cada dia da semana, por vendedor? Se for isso:
   muda toda semana ou é fixo no mês? E como o sistema marca se a meta do dia foi batida, já que
   o vendedor não vai ter tablet (quem lança o resultado — o supervisor)?
9. Essa meta diária (seja qual for a resposta acima) **substitui** as metas atuais por
   representante × fornecedor (`meta_cx`/`meta_fin`) ou **convive** com elas?

### Resumo da Distribuição
10. ✅ Respondida (22/09): são dois números diferentes — base ativa é cadastro,
    "ativo" é quem comprou num período. Período assumido como "mês corrente" por decisão própria
    (não confirmada) — ver 2.2.
11. ✅ Decidido por conta própria (22/09, cliente difícil de acessar): convive — vira seção nova no
    topo de `/distribuicao`, a tabela por fornecedor continua embaixo sem mudança. Ver 2.2.

### Gráficos
12. A conversão de pizza (Curva ABC de Produtos) e linha (faturamento diário, comparativo anual)
    para barra — já implementada em 21/09 (ver 2.1) — deveria se estender também aos rankings que
    já eram barra (recolorir cada barra individualmente), ou eles ficam como estão (uma cor só)?
13. A cor de cada equipe deve ser **a mesma em todos os gráficos** do sistema (ex.: Equipe 94
    sempre na mesma cor, em qualquer tela), ou a cor pode variar gráfico a gráfico?

### Acesso do vendedor
14. O áudio diz que o vendedor não vai ter tablet por enquanto e quem opera é o supervisor. Hoje
    o sistema já permite o vendedor logar e ver a própria página (`role=vendedor`, ver
    `04-regras-de-negocio.md`) — isso deve continuar existindo (só sem um app pra lançar dado), ou
    o vendedor não deveria ter acesso nenhum ao sistema por enquanto?

### Analítico de Vendas
15. Depois de agrupar por equipe, ainda é necessário abrir o detalhe por representante individual
    (drill-down) dentro da equipe, para supervisor/manager, ou a visão por representante deve
    desaparecer completamente das telas?

## 4. Respostas do cliente (22/09/2026) e status de cada pergunta

> **Nota de processo:** o `PENDENCIAS.md` (entrada de 21/09, parte 2) registrava que a mensagem
> formatada ainda **não** tinha sido confirmada como enviada; mesmo assim, o cliente respondeu a
> este bloco de 15 perguntas em 22/09/2026. Tratando como recebidas e válidas independente do
> canal exato de envio.

| # | Tema | Resposta do cliente | Status |
|---|---|---|---|
| 1 | Número da equipe que falta | "Não sei que arquivo vc está falando" | 🔁 pergunta mal formulada — citava jargão interno (nome de arquivo), precisa reformular |
| 2 | Nome de região = supervisor? | "Nome da região" (não é supervisor) | ⚠️ resolvido em parte — ainda falta saber quem é o supervisor de cada equipe |
| 3 | Representante em mais de uma equipe? | "Somente em uma equipe" | ✅ resolvido — vínculo 1:1 |
| 4 | Número da equipe é fixo? | "Sim" | ✅ resolvido |
| 5 | Cor escolhida ou automática? | "Sistema define" | ✅ resolvido (refinado pela resposta 13) |
| 6 | Histórico retroagido por equipe? | "Contabiliza o histórico também" | ✅ resolvido — retroativo |
| 7 | "Meta Dia" atual é a meta do Manager? | "Perguntar ao Alex Pai" | ⏳ encaminhada a terceiro |
| 8 | Meta é produto-por-dia (exemplo Sheila)? | "Na verdade não se deve focar em um produto por dia" | ⚠️ resolvido em parte — descarta a hipótese de produto-por-dia, mas não diz o que a meta diária é de fato (ver pergunta 7) |
| 9 | Meta diária substitui ou convive com metas atuais? | "Convivem" | ✅ resolvido |
| 10 | Base ativa vs "o que está ativo" | "São números diferentes: base ativa = clientes ativos na base; o que está ativo = clientes que compraram dentro de um determinado período" | ⚠️ resolvido em parte — falta definir o período exato |
| 11 | Resumo por equipe substitui `/distribuicao`? | "Perguntar ao Alex Pai" | ⏳ encaminhada a terceiro |
| 12 | Recolorir rankings também? | "Sim" | ✅ resolvido |
| 13 | Cor da equipe fixa entre gráficos? | "Cada equipe deve ter uma cor fixa" | ✅ resolvido |
| 14 | Vendedor mantém acesso de login? | "Perguntar ao Alex Pai" | ⏳ encaminhada a terceiro |
| 15 | Drill-down por representante ainda necessário? | "Ainda precisa" | ✅ resolvido |

### 4.1 Perguntas de acompanhamento (reformuladas / novas, ainda sem resposta)

a. **(substitui a pergunta 1)** Quais são os números das 7 equipes? Temos hoje 92, 93, 94, 95, 96
   e 97 — falta um número pra fechar as 7.
b. **(decorre da resposta 2)** Quem é o supervisor responsável por cada uma das 7 equipes?
c. **(decorre da resposta 8, provavelmente resolve junto com a pergunta 7)** Se não é
   produto-por-dia, o que exatamente compõe a meta diária que o Manager vai definir? É um valor
   numérico (caixas/R$) igual ao "Meta Dia" que já existe hoje, só que agora cascateando
   Manager → Supervisor → Vendedor?
d. **(decorre da resposta 10)** Qual é o período que define um cliente como "ativo" (comprou
   dentro de quanto tempo — últimos 30 dias, mês corrente, outro)?

### 4.2 Perguntas encaminhadas para o Alex Pai (7, 11, 14)

Ainda não está registrado em nenhum documento do projeto quem é o Alex Pai (sócio? gestor
comercial? outro papel?). Vale confirmar com o cliente antes de enviar essas 3 perguntas
diretamente a ele:
- Pergunta 7: se a "Meta Dia (Caixas)" já existente na planilha é a meta que o Manager vai
  definir daqui pra frente, ou é algo mais detalhado.
- Pergunta 11: se o novo resumo por equipe substitui a tela `/distribuicao` atual ou é uma
  tela/seção nova, convivendo com a atual.
- Pergunta 14: se o vendedor deve continuar podendo logar e ver a própria página, ou perder o
  acesso por enquanto.

## 5. Próximos passos

Gráficos (item 2.1) já implementados e testados — não dependia de resposta do cliente. Das 15
perguntas originais, 8 estão totalmente resolvidas (3, 4, 5, 6, 9, 12, 13, 15), 2 parcialmente
resolvidas mas com pendência nova (2, 10), 1 precisou ser reformulada (1) e 1 ficou sem resposta
direta, dependente de outra (8). As perguntas 7, 11 e 14 foram encaminhadas ao Alex Pai — ainda
não temos retorno dele.

**Feito em 22/09/2026:** `supabase_migration_v2_6.sql` (schema de `equipes` +
`representantes.equipe_id`) rodada em produção e verificada. As 6 equipes confirmadas (92-97) já
foram gravadas com cor fixa aprovada pelo cliente (`scripts/seed_equipes_v1.mjs`) — ver tabela em
`PENDENCIAS.md`. `representantes.equipe_id = '94'` vinculado pros 7 representantes que já existem
no banco. Ainda falta: o número da 7ª equipe (4.1.a), os supervisores (4.1.b) e — achado novo de
22/09 — **importar as planilhas de Campinas, Sorocaba, EQ. SP, EQ. Sul e EQ. Itape**, que nunca
passaram pelo import mensal. Sem isso, 6 das 7 equipes ficam sem representante vinculado e sem
histórico de vendas, mesmo com o schema e a cor prontos.

**Ainda bloqueado:** o mecanismo de meta em cascata (2.3) segue sem definição do "o quê" da meta
diária — depende da resposta do Alex Pai à pergunta 7 (e da 4.1.c). Não desenhar esse schema
ainda.
