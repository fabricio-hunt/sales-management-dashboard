# Representante vs. Equipe — o que é cada coisa

Documento criado em 22/09/2026 depois de uma confusão real: o cliente mandou "308, 310, 312, 401,
407, 408, 90" achando que eram os números das 7 equipes de vendas. Na verdade são 7
**representantes** — todos de uma única equipe. Este documento existe pra essa distinção nunca
mais gerar dúvida, com exemplo real tirado das planilhas.

## Em uma frase

- **Representante** = uma pessoa que vende (o vendedor). Existe no sistema desde o v1.
- **Equipe** = um grupo de representantes, sob um supervisor. Conceito novo, pedido pelo cliente
  em 21/09/2026 — **ainda não existia em lugar nenhum do sistema** antes disso.

Uma equipe é feita de vários representantes. Um representante pertence a, no máximo, uma equipe.

## O exemplo real que prova a relação

O cliente mantém uma planilha Excel por equipe, na pasta `equipe-de-vendas/`. Abrindo o arquivo
**`NV-RELATORIO DE VENDAS 2026 - AGOSTO - EQUIPE 94.xlsx`**, as abas (as "páginas" lá embaixo do
Excel) são:

```
RESUMO GERAL, Equipe, 308, 310, 312, 401, 407, 408, 90, vg, vg1, RK POSIT, RK FIN, ...
```

- **`94`** — o número no nome do arquivo — é a **equipe**.
- **`308`, `310`, `312`, `401`, `407`, `408`, `90`** — cada um é uma aba dentro desse mesmo
  arquivo, com o resultado daquele **representante** especificamente. São os 7 vendedores que
  formam a equipe 94.
- A aba `Equipe` (nome genérico, não confundir com a entidade) traz o resumo agregado dos 7
  representantes somados — é dali que sai o nome da região: a célula de título dessa aba diz
  **"Jundíaí"**. O nome da região não fica no nome da aba, fica escrito dentro da célula.

Ou seja: **1 arquivo = 1 equipe. Cada aba numérica dentro do arquivo = 1 representante daquela
equipe.**

## As 6 equipes confirmadas até agora

Existe um arquivo desses por equipe em `equipe-de-vendas/` — 6 arquivos, 6 equipes. Falta o 7º
arquivo (o cliente mencionou 7 equipes, só temos 6 planilhas). Abrindo os 6 e conferindo a célula
de região de cada um:

| Equipe (nº do arquivo) | Região (dentro da planilha) | Representantes (abas dentro do arquivo) | Já no sistema? |
|---|---|---|---|
| 92 | Campinas | 105, 175, 822, 114 | Sim (desde 22/09) |
| 93 | Sorocaba | 201, 202, 203, 205, 206, 207, 208 (+ 213, só nas vendas reais) | Sim (desde 22/09) |
| 94 | Jundiaí | 308, 310, 312, 401, 407, 408, 90 | Sim — primeira, desde 26/08 |
| 95 | EQ. SP | 113, 311, 314, 315, 316, 317, 318, 414, 415, 425 | Sim (desde 22/09) |
| 96 | EQ. Sul | 307, 309, 320, 321, 322, 323 (+ 313, só nas vendas reais) | Sim (desde 22/09) |
| 97 | EQ. Itape | 209, 211, 214, 215, 216 (213 tem aba aqui, mas venda real ficou na 93) | Sim (desde 22/09) |
| *(falta o nº)* | — | — | — |

Repare que o número de representantes por equipe **varia** (de 4 até 10) — não existe uma
quantidade fixa por equipe.

## Por que é fácil confundir os dois

Algumas fontes do porquê essa confusão é comum neste projeto especificamente:

1. **Os dois são só números**, sem nome próprio de pessoa em nenhum dos dois. Um representante
   como "308" não tem, no ERP, um nome mais informativo do que isso — no banco, o campo `nome` da
   tabela `representantes` literalmente guarda `"308 REPRESENTANTE 308"`. Uma equipe como "94"
   também só existe como número. Nenhum dos dois se apresenta como "Fulano de Tal" ou "Time do
   João" — os dois parecem a mesma coisa à primeira vista: **um número solto**.
2. **O nome da região (Jundiaí, Campinas...) fica escondido dentro da célula**, não no nome do
   arquivo nem no nome da aba — só olhando o conteúdo é que a região aparece. Isso faz a equipe
   parecer "sem nome" se você só olhar os nomes de arquivo/aba por fora.
3. **O sistema já usava a sigla "RPA"** pra se referir a representante em várias telas ("Visão
   Equipe (RPA)", "Gestão de Representantes (RPA)") — o próprio rótulo "Equipe" no menu já era
   usado pra uma tela que, até 21/09/2026, **não tinha nada a ver com o conceito novo de equipe**
   (era só a página de um representante individual). Ver `07-glossario-negocio.md`, termo "RPA".

## Como isso virou schema (22/09/2026)

- `representantes` — já existia desde o v1. Cada linha é um vendedor (`id`, `nome`, `supervisor`
  em texto livre, `regime` CLT/PJ).
- `equipes` — tabela nova (`supabase_migration_v2_6.sql`): `id` (o número do arquivo, ex.: "94"),
  `cor` (fixa, atribuída pelo sistema — ver `PENDENCIAS.md` pra tabela de cores aprovadas),
  `supervisor_id` (ainda não preenchido — falta saber quem é o supervisor de cada equipe).
- `representantes.equipe_id` — a coluna que liga um representante à sua equipe. Hoje só está
  preenchida para os 7 representantes da equipe 94, porque são os únicos que existem no banco (as
  outras 5 planilhas nunca foram importadas — ver `PENDENCIAS.md`, achado de 22/09).

Ver `02-banco-de-dados.md` (seção "Tabelas de dimensão") pro schema completo, e
`08-refinamento-graficos-equipes-metas.md` pro histórico completo de decisões sobre equipe.

## Atualização 22/09/2026 — as 5 planilhas restantes foram importadas

As 5 equipes que faltavam (Campinas, Sorocaba, EQ. SP, EQ. Sul, EQ. Itape) já foram importadas —
ver `PENDENCIAS.md` pro detalhe completo. Banco agora tem 41 representantes distribuídos nas 6
equipes confirmadas, todos com `equipe_id` preenchido.

## O que ainda falta saber

- O número da 7ª equipe (não existe arquivo pra ela ainda).
- Quem é o supervisor responsável por cada uma das 7 equipes.
- Confirmar com o cliente a equipe real dos representantes 213 e 313 — a planilha e o dado de
  venda discordam entre si pra esses dois (ver `PENDENCIAS.md`, achado de 22/09).
