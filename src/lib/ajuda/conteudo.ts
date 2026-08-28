// Ajuda contextual por módulo — o painel "Como usar esta tela" que aparece
// abaixo do título de cada página.
//
// A chave é o mesmo slug de modulos.slug / permissoes_role.modulo_slug, pra
// não criar um segundo vocabulário de identificação de tela.
//
// Regra de conteúdo: cada verbete responde três coisas que o usuário não tem
// como adivinhar sozinho — o que a tela responde, de onde vem o número, e o
// erro de leitura mais provável. Texto de recurso óbvio ("clique para
// filtrar") só ocupa espaço e ensina o usuário a ignorar o painel.

export type AjudaModuloConteudo = {
  resumo: string;
  passos: string[];
  fonte?: string;
  atencao?: string;
};

export const AJUDA: Record<string, AjudaModuloConteudo> = {
  dashboard: {
    resumo: "Ponto de partida do mês: quanto foi faturado, com que margem e como está a evolução.",
    passos: [
      "Comece pelos números do topo para ter a ordem de grandeza do período.",
      "Use os atalhos para descer ao detalhe do que chamou atenção.",
    ],
    fonte: "Calculado ao vivo sobre as vendas importadas do período aberto. Nada aqui é digitado à mão.",
    atencao:
      "O mês corrente é sempre parcial: você está comparando dias já vendidos contra a meta cheia do mês. Um percentual abaixo de 100% no meio do mês não significa meta perdida.",
  },

  equipe: {
    resumo: "Meta contra realizado de cada representante, por fornecedor, com positivação e atingimento.",
    passos: [
      "Escolha o representante para abrir o detalhe por fornecedor.",
      "Compare a coluna de realizado com a meta para achar onde a distância é maior.",
    ],
    fonte: "Realizado vem das vendas importadas; a meta vem de Metas por Fornecedor.",
    atencao:
      "Fornecedor sem meta cadastrada no mês não aparece com atingimento — some da comparação em vez de aparecer zerado.",
  },

  comissoes: {
    resumo: "Estimativa de comissão por representante e fornecedor, com base no atingimento.",
    passos: [
      "Confira primeiro se o % de premiação do mês está cadastrado em Metas por Fornecedor.",
      "O fator aplicado depende da faixa de atingimento configurada em Faixas de Comissão.",
    ],
    fonte: "realizado x % de premiação x fator da faixa de atingimento.",
    atencao:
      "Os valores ainda estão em validação e não devem ser usados para pagamento. A tela não separa CLT de PJ nem calcula o Prêmio de Positivação.",
  },

  "admin.vendas": {
    resumo: "Lançamento manual de venda, para corrigir ou registrar o que não veio do Palmtop.",
    passos: [
      "Escolha o cliente, adicione os itens e revise o total antes de salvar.",
      "Manager e Supervisor escolhem o representante; o vendedor lança sempre no próprio nome.",
    ],
    atencao:
      "Este não é o caminho normal da venda — o dia a dia entra pela importação. O que você lançar aqui fica marcado como manual e sobrevive à reimportação do período.",
  },

  "analitico.vendas": {
    resumo: "Detalhe linha a linha das vendas do período, para investigar um número do resumo.",
    passos: ["Filtre até isolar o caso que quer entender.", "Use como prova quando um total não bate com o esperado."],
    fonte: "As mesmas vendas que alimentam todos os outros painéis.",
  },

  "analitico.cliente": {
    resumo: "Comportamento de compra por cliente ao longo do período.",
    passos: ["Procure quedas bruscas — costumam indicar cliente em risco.", "Cruze com a carteira do representante."],
  },

  "analitico.faturamento_dia": {
    resumo: "Faturamento dia a dia, para enxergar ritmo e concentração no fim do mês.",
    passos: ["Compare o ritmo diário com o necessário para bater a meta."],
    atencao: "Dias sem venda aparecem como zero e não como falha — feriados e fins de semana entram no gráfico.",
  },

  "analitico.devolucoes": {
    resumo: "O que voltou, de quem e por quê.",
    passos: [
      "Procure repetição do mesmo produto ou do mesmo cliente.",
      "Manager: use o formulário no fim da tela pra registrar, editar ou excluir uma devolução lançada manualmente.",
    ],
    fonte: "Identificado pela transação de devolução na base importada.",
    atencao:
      "A devolução abate o realizado, então também afeta atingimento e comissão do período. Só devoluções lançadas manualmente por aqui podem ser editadas: as vindas do import do ERP são só-leitura, porque seriam sobrescritas no reimport do mês.",
  },

  produtos: {
    resumo: "Curva ABC: quais itens concentram o faturamento.",
    passos: ["A faixa A costuma ser a minoria dos itens com a maior parte do valor.", "Use para decidir foco e estoque."],
  },

  "rankings.positivacao": {
    resumo: "Quantos clientes distintos cada representante positivou no mês, contra o objetivo dele.",
    passos: ["Compare positivados com o objetivo cadastrado."],
    fonte: "Contagem de clientes distintos com venda no período.",
    atencao:
      "Positivação conta cliente único, não pedido. Dez pedidos do mesmo cliente contam uma positivação só.",
  },

  "rankings.financeiro": {
    resumo: "Ordenação por valor financeiro realizado no mês.",
    passos: ["Use junto com a meta para separar volume alto de meta batida."],
  },

  "rankings.clientes": {
    resumo: "Os 20 clientes que mais compraram no período.",
    passos: ["Útil para concentração de carteira: quanto do faturamento depende de poucos nomes."],
  },

  "rankings.vendedores": {
    resumo: "Os 10 representantes com maior realizado no período.",
    passos: ["Compare com a meta de cada um antes de tirar conclusão."],
    atencao: "Você só enxerga representantes dentro do seu escopo — para um vendedor, o ranking mostra apenas ele.",
  },

  distribuicao: {
    resumo: "Cobertura por fornecedor: onde a distribuição está furada.",
    passos: ["Procure fornecedor com desafio de distribuição cadastrado e execução abaixo."],
  },

  evolucao: {
    resumo: "Evolução de compra de cada cliente ao longo dos meses.",
    passos: ["Procure tendência de queda sustentada, não variação de um mês só."],
    atencao: "Precisa de mais de um mês importado para desenhar tendência. Com um mês só, o gráfico tem um ponto.",
  },

  "admin.importar": {
    resumo: "Entrada de dados do sistema. É o que mantém todas as outras telas atualizadas.",
    passos: [
      "Baixe o modelo em branco se tiver dúvida sobre os nomes de coluna esperados.",
      "Ordem recomendada no fechamento: fornecedores, clientes, metas, objetivos e por último vendas.",
    ],
    atencao:
      "Vendas substitui o período contido no arquivo e por isso pede confirmação. As outras quatro importações são aditivas e nunca apagam. Deixe Sobrescrever atribuições manuais desmarcado no uso normal.",
  },

  "admin.metas": {
    resumo: "Meta e percentual de premiação de cada representante por fornecedor, mês a mês.",
    passos: [
      "Selecione mês e representante para editar as linhas.",
      "Copiar do mês anterior evita redigitar quando pouca coisa muda.",
    ],
    atencao:
      "O % de premiação daqui é o que multiplica a comissão. Se ficar em zero, a comissão do representante sai zero mesmo com venda registrada.",
  },

  "admin.comissoes": {
    resumo: "Faixas de atingimento que definem o fator aplicado sobre a premiação.",
    passos: [
      "Cada faixa cobre um intervalo de atingimento e um fator.",
      "Proporcional escala com o próprio atingimento; fator fixo paga o fator cheio da faixa.",
      "Faixa de um fornecedor específico tem prioridade sobre a faixa geral.",
    ],
    atencao:
      "As faixas cadastradas hoje são um rascunho tirado da planilha original e ainda precisam ser confirmadas antes de qualquer pagamento.",
  },

  "admin.fornecedores": {
    resumo: "Cadastro de fornecedores e os apelidos com que aparecem no ERP.",
    passos: ["Use os apelidos quando o mesmo fornecedor vier escrito de formas diferentes na planilha."],
    atencao: "Apelido não cadastrado faz a venda daquele fornecedor não ser reconhecida na importação.",
  },

  "admin.clientes": {
    resumo: "Carteira de clientes e a qual representante cada um pertence.",
    passos: ["Vincule o cliente ao representante para ele entrar na positivação certa."],
    atencao:
      "Vínculo feito aqui não é sobrescrito pela importação, a menos que você marque a opção de sobrescrever ao importar.",
  },

  "admin.representantes": {
    resumo: "Cadastro da equipe. O ID precisa bater com o código usado pelo ERP.",
    passos: ["Informe o regime de contratação (CLT ou PJ) de cada um."],
    atencao:
      "O regime hoje é só cadastro: nenhum cálculo de comissão diferencia CLT de PJ ainda. ID diferente do ERP faz as vendas não encontrarem o representante.",
  },

  "admin.usuarios": {
    resumo: "Quem tem login, com que papel, e quais representantes cada supervisor acompanha.",
    passos: [
      "Ao criar, defina uma senha inicial e passe para a pessoa: ela será obrigada a trocar no primeiro acesso.",
      "Para um supervisor, expanda a linha, marque os representantes e clique em Salvar atribuições.",
      "O ícone de chave redefine a senha de quem perdeu o acesso.",
    ],
    atencao:
      "Supervisor sem representantes atribuídos enxerga zero em todas as telas de equipe. Não existe recuperação de senha por e-mail: redefinir aqui é o único caminho.",
  },

  "admin.permissoes": {
    resumo: "O que cada papel enxerga, módulo a módulo, com exceção por usuário.",
    passos: [
      "Ajuste o nível por papel para valer para todo mundo daquele papel.",
      "Uma exceção por usuário tem prioridade sobre o padrão do papel.",
    ],
    atencao:
      "Isto controla o acesso às telas, não o alcance dos dados. O escopo por representante é garantido no banco e não muda aqui: liberar uma tela a um vendedor não o faz ver dado de colega.",
  },

  configuracoes: {
    resumo: "Parâmetros gerais do sistema.",
    passos: ["Confira o período aberto antes de fechar o mês."],
  },

  conta: {
    resumo: "Seu nome de exibição e sua senha.",
    passos: ["O nome aparece para os outros usuários no sistema.", "A senha precisa ter no mínimo 6 caracteres."],
    atencao: "Se perder a senha, só o Manager consegue redefinir — o sistema não envia e-mail de recuperação.",
  },
};
