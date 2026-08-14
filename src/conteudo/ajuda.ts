/**
 * Conteúdo da aba Ajuda.
 *
 * Escrito para duas leituras: quem opera o sistema e precisa entender o assunto, e
 * quem vai sentar na frente do cliente e precisa explicar. Por isso cada termo técnico
 * vem com a tradução para linguagem de cliente, e as objeções da reunião estão
 * respondidas por escrito.
 *
 * O conteúdo é dado, não marcação — assim ele é testável e pode ser reaproveitado em
 * material impresso sem reescrever nada.
 */

export type Bloco =
  | { tipo: 'paragrafo'; texto: string }
  | { tipo: 'destaque'; tom: 'info' | 'alerta' | 'ok'; titulo?: string; texto: string }
  | { tipo: 'lista'; itens: string[] }
  | { tipo: 'passos'; itens: { titulo: string; texto: string }[] }
  | { tipo: 'tabela'; colunas: string[]; linhas: string[][] }
  | { tipo: 'glossario'; termos: { termo: string; definicao: string; comoExplicar: string }[] }
  | { tipo: 'objecoes'; itens: { pergunta: string; resposta: string }[] }
  /** Exemplo numérico calculado ao vivo pelo motor — nunca escrito à mão. */
  | { tipo: 'exemplo-cadeia' }
  | { tipo: 'campos'; itens: { campo: string; oQueE: string; ondeAcha: string }[] };

export interface SecaoAjuda {
  id: string;
  titulo: string;
  resumo: string;
  blocos: Bloco[];
}

export const SECOES_AJUDA: SecaoAjuda[] = [
  // -----------------------------------------------------------------------
  {
    id: 'o-que-mudou',
    titulo: 'A reforma em cinco minutos',
    resumo: 'O que muda, por que muda e o que isso tem a ver com o Simples Nacional.',
    blocos: [
      {
        tipo: 'paragrafo',
        texto:
          'Hoje o Brasil cobra imposto sobre consumo por cinco tributos diferentes: PIS e Cofins (federais), ' +
          'IPI (federal, sobre indústria), ICMS (estadual) e ISS (municipal). Cada um com sua regra, sua base ' +
          'de cálculo e seu jeito de gerar crédito. A reforma substitui os cinco por dois.',
      },
      {
        tipo: 'tabela',
        colunas: ['Tributo novo', 'Quem cobra', 'Substitui'],
        linhas: [
          ['CBS — Contribuição sobre Bens e Serviços', 'União', 'PIS e Cofins'],
          ['IBS — Imposto sobre Bens e Serviços', 'Estados e municípios', 'ICMS e ISS'],
        ],
      },
      {
        tipo: 'paragrafo',
        texto:
          'O IPI é zerado (com exceção da Zona Franca de Manaus). Os dois novos tributos funcionam pelo ' +
          'regime não cumulativo pleno: a empresa paga imposto sobre o que vende e desconta o imposto que ' +
          'já foi pago no que comprou. O imposto incide só sobre o valor que aquela empresa agregou.',
      },
      {
        tipo: 'destaque',
        tom: 'info',
        titulo: 'Por que isso mexe com o Simples Nacional',
        texto:
          'A empresa do Simples paga tudo em uma guia só, o DAS, com alíquota reduzida. Isso é ótimo para ' +
          'quem paga — e ruim para quem compra dela, porque o comprador não consegue aproveitar crédito ' +
          'sobre um imposto que foi pago com desconto. A reforma dá ao optante do Simples a escolha: ' +
          'continuar assim, ou tirar IBS e CBS da guia única e apurá-los pelas regras normais, podendo ' +
          'então repassar o crédito cheio.',
      },
      {
        tipo: 'paragrafo',
        texto:
          'A mudança não acontece de uma vez. Entre 2026 e 2033 os tributos antigos vão saindo e os novos ' +
          'entrando, em um cronograma que o sistema conhece ano a ano — é ele que alimenta a aba Projeção.',
      },
      {
        tipo: 'tabela',
        colunas: ['Ano', 'O que acontece'],
        linhas: [
          ['2026', 'Ano de teste. Empresas do Simples estão dispensadas de recolher a alíquota-teste, e preencher os campos de IBS/CBS na nota é opcional. É o ano de decidir.'],
          ['2027', 'PIS e Cofins são extintos, a CBS entra integral, o IPI é zerado. O IBS ainda fica em 0,1%. Começa a valer a opção feita em setembro de 2026.'],
          ['2028', 'Igual a 2027.'],
          ['2029 a 2032', 'ICMS e ISS caem 10 pontos percentuais por ano (90%, 80%, 70%, 60%) e o IBS sobe na mesma proporção.'],
          ['2033', 'Regime pleno. ICMS, ISS, PIS, Cofins e IPI deixam de existir. Só IBS e CBS.'],
        ],
      },
    ],
  },

  // -----------------------------------------------------------------------
  {
    id: 'dois-modelos',
    titulo: 'Os dois caminhos possíveis',
    resumo: 'Tradicional e Híbrido: o que muda de fato em cada um.',
    blocos: [
      {
        tipo: 'paragrafo',
        texto:
          'A empresa optante pelo Simples Nacional continua no Simples nos dois casos. A escolha é só sobre ' +
          'onde o IBS e a CBS são recolhidos.',
      },
      {
        tipo: 'tabela',
        colunas: ['', 'Modelo Tradicional', 'Modelo Híbrido'],
        linhas: [
          ['Quantas guias', 'Uma (o DAS)', 'Duas (DAS reduzido + guia de IBS/CBS)'],
          ['O que fica no DAS', 'Tudo', 'IRPJ, CSLL e INSS patronal — e o ICMS/ISS ainda não substituído'],
          ['Como o IBS/CBS é calculado', 'Embutido na alíquota do Simples', 'Pelo regime normal: imposto sobre vendas menos crédito das compras'],
          ['Crédito que o comprador PJ aproveita', 'Limitado ao que estiver embutido na guia', 'Integral, igual ao destacado na nota'],
          ['Aproveita crédito das próprias compras', 'Não', 'Sim'],
          ['Complexidade operacional', 'Baixa', 'Maior: exige controle de créditos e apuração mensal'],
        ],
      },
      {
        tipo: 'destaque',
        tom: 'alerta',
        titulo: 'A regra prática',
        texto:
          'Quem vende para o consumidor final normalmente fica no Tradicional — o comprador pessoa física ' +
          'não aproveita crédito, então o crédito repassado não vale nada para ele. Quem vende ou presta ' +
          'serviço para outras empresas precisa avaliar o Híbrido com seriedade, porque o crédito limitado ' +
          'encarece o produto dele frente à concorrência.',
      },
      {
        tipo: 'paragrafo',
        texto:
          'Atenção: "normalmente" não é "sempre". Uma empresa B2C com muitas compras que geram crédito pode ' +
          'sair ganhando no Híbrido por pura economia de caixa. É exatamente por isso que se calcula em vez ' +
          'de decidir por regra de bolso.',
      },
    ],
  },

  // -----------------------------------------------------------------------
  {
    id: 'credito',
    titulo: 'Por que crédito decide contrato',
    resumo: 'O conceito que mais gera confusão, com exemplo numérico calculado pelo sistema.',
    blocos: [
      {
        tipo: 'paragrafo',
        texto:
          'Crédito tributário é o imposto que já foi pago nas etapas anteriores e que a empresa pode ' +
          'descontar do imposto que ela mesma deve. Quando uma empresa compra um insumo por R$ 1.000 com ' +
          'R$ 265 de imposto destacado na nota, esses R$ 265 viram crédito: ela abate esse valor do imposto ' +
          'que vai pagar sobre a própria venda.',
      },
      {
        tipo: 'destaque',
        tom: 'info',
        titulo: 'A consequência que o cliente precisa entender',
        texto:
          'Para uma empresa que compra de você, o custo real do seu produto não é o preço da nota. É o preço ' +
          'menos o crédito que ela consegue aproveitar. Dois fornecedores com o mesmo preço podem ter custos ' +
          'reais diferentes para o comprador — e o que der menos crédito perde a venda, sem nunca saber por quê.',
      },
      { tipo: 'exemplo-cadeia' },
      {
        tipo: 'paragrafo',
        texto:
          'É por isso que o sistema mostra a linha "preço líquido para o comprador PJ". Ela responde a ' +
          'pergunta que o departamento de compras do seu cliente vai fazer: quanto esse fornecedor me custa ' +
          'de verdade?',
      },
      {
        tipo: 'destaque',
        tom: 'ok',
        titulo: 'Quando o crédito não importa',
        texto:
          'Se quem compra é pessoa física — o consumidor final —, ela não apura imposto e não aproveita ' +
          'crédito nenhum. Para padaria, restaurante, loja de rua e e-commerce de varejo, essa conversa toda ' +
          'não muda nada: o que decide é o custo puro.',
      },
    ],
  },

  // -----------------------------------------------------------------------
  {
    id: 'calendario-porque',
    titulo: 'Por que setembro de 2026 é o novo janeiro',
    resumo: 'O calendário das janelas e o que acontece se cada prazo passar.',
    blocos: [
      {
        tipo: 'paragrafo',
        texto:
          'A decisão tributária que o escritório costumava tomar no começo do ano passou a ser tomada em ' +
          'setembro do ano anterior. A janela tem 30 dias corridos e vale para o primeiro semestre de 2027. ' +
          'Quem não se manifesta fica automaticamente no modelo Tradicional durante todo o período.',
      },
      {
        tipo: 'passos',
        itens: [
          {
            titulo: 'Até 30 de junho de 2026 — auditoria cadastral',
            texto:
              'Débito em aberto ou pendência cadastral impede a confirmação da opção. Um cliente irregular ' +
              'perde a janela inteira, por melhor que fosse o resultado da simulação. Este é o prazo real, ' +
              'não setembro.',
          },
          {
            titulo: 'Até 31 de agosto de 2026 — simulações e reuniões',
            texto:
              'As duas contas prontas e apresentadas a cada cliente, com a decisão registrada por escrito. ' +
              'Dentro da janela não há tempo para analisar; só para formalizar.',
          },
          {
            titulo: '1 a 30 de setembro de 2026 — a janela',
            texto:
              'Formalização da opção pelo recolhimento de IBS/CBS por fora. Na mesma janela, empresas que ' +
              'queiram ingressar no Simples Nacional em 2027 fazem a solicitação.',
          },
          {
            titulo: 'Até 30 de novembro de 2026 — última chance de voltar atrás',
            texto:
              'Se os números mudarem, ainda dá para cancelar a opção. Depois dessa data a escolha se torna ' +
              'irretratável para o primeiro semestre de 2027.',
          },
          {
            titulo: '1 a 31 de março de 2027 — segunda janela',
            texto:
              'Para quem não entrou no primeiro lote. A opção passa a valer a partir do segundo semestre de 2027.',
          },
        ],
      },
      {
        tipo: 'destaque',
        tom: 'alerta',
        titulo: 'A fiscalização também apertou',
        texto:
          'Atrasar o PGDAS-D gera multa a partir do primeiro dia após o vencimento (dia 20): 2% ao mês, com ' +
          'piso de R$ 50. A DEFIS ganhou multa própria, com piso de R$ 200. E o cruzamento do faturamento ' +
          'entre CNPJs com sócios em comum passou a rodar automaticamente, com os sistemas de União, ' +
          'estados e municípios integrados.',
      },
    ],
  },

  // -----------------------------------------------------------------------
  {
    id: 'glossario',
    titulo: 'Glossário',
    resumo: 'Cada termo da tela, com a definição formal e a versão para falar com o cliente.',
    blocos: [
      {
        tipo: 'glossario',
        termos: [
          {
            termo: 'DAS',
            definicao:
              'Documento de Arrecadação do Simples Nacional. A guia única que reúne todos os tributos do regime.',
            comoExplicar: 'É o boleto único do Simples, aquele que a empresa já paga todo mês.',
          },
          {
            termo: 'RBT12',
            definicao:
              'Receita Bruta dos últimos 12 meses. Define em qual faixa da tabela do anexo a empresa se enquadra.',
            comoExplicar: 'É o quanto a empresa faturou nos últimos doze meses. Quanto maior, maior a alíquota.',
          },
          {
            termo: 'Anexo',
            definicao:
              'Tabela de alíquotas do Simples Nacional. São cinco, de acordo com a atividade: I comércio, ' +
              'II indústria, III a V serviços.',
            comoExplicar: 'É a tabela de imposto da sua atividade. Comércio, indústria e serviço pagam diferente.',
          },
          {
            termo: 'Alíquota efetiva',
            definicao:
              'O percentual que a empresa realmente paga, calculado como ((RBT12 × alíquota nominal) − parcela ' +
              'a deduzir) ÷ RBT12. É sempre menor que a alíquota nominal da faixa.',
            comoExplicar:
              'É o percentual de verdade. A tabela mostra um número maior, mas existe um desconto fixo que ' +
              'derruba esse percentual — o que vale é o resultado da conta.',
          },
          {
            termo: 'Repartição',
            definicao:
              'A divisão do valor do DAS entre os tributos que o compõem: IRPJ, CSLL, CPP, PIS, Cofins, IPI, ' +
              'ICMS e ISS. Cada faixa de cada anexo tem a sua.',
            comoExplicar: 'Dentro daquele boleto único tem vários impostos misturados. A repartição diz quanto é de cada um.',
          },
          {
            termo: 'CPP',
            definicao:
              'Contribuição Patronal Previdenciária — o INSS que a empresa paga sobre a folha. Está dentro do ' +
              'DAS em quase todos os anexos, exceto no Anexo IV, onde é recolhido à parte.',
            comoExplicar: 'É o INSS da empresa sobre os salários. Na maioria dos casos já está embutido na guia.',
          },
          {
            termo: 'Não cumulatividade',
            definicao:
              'Regime em que o imposto devido é a diferença entre o imposto sobre as vendas (débito) e o imposto ' +
              'pago nas compras (crédito).',
            comoExplicar:
              'Você paga imposto só sobre o valor que a sua empresa acrescentou. O que já foi pago antes, na ' +
              'sua compra, você desconta.',
          },
          {
            termo: 'Crédito',
            definicao: 'O imposto pago nas etapas anteriores, que pode ser abatido do imposto devido.',
            comoExplicar: 'É imposto que você já pagou na compra e desconta na hora de pagar o seu.',
          },
          {
            termo: 'Saldo credor',
            definicao:
              'Quando o crédito das compras supera o imposto das vendas no mês, a diferença não é devolvida: ' +
              'fica acumulada para abater nos meses seguintes.',
            comoExplicar:
              'Sobrou crédito. Não vira dinheiro de volta, mas abate o imposto do mês que vem. Só cuidado: ' +
              'crédito parado não paga conta.',
          },
          {
            termo: 'Fator R',
            definicao:
              'A relação entre a folha de pagamento dos últimos 12 meses e o RBT12. Atingindo 28%, a atividade ' +
              'migra do Anexo V para o Anexo III, que é mais barato.',
            comoExplicar:
              'Se a sua folha representar pelo menos 28% do faturamento, você cai numa tabela mais barata. ' +
              'Vale conferir antes de decidir o pró-labore.',
          },
          {
            termo: 'Sublimite',
            definicao:
              'R$ 3.600.000 de receita em 12 meses. Acima dele, ICMS e ISS saem do DAS e passam ao regime ' +
              'normal do estado e do município. O IBS passa a integrar essa conta.',
            comoExplicar:
              'Passando de R$ 3,6 milhões por ano, o ICMS e o ISS saem da guia única e você passa a recolher ' +
              'separado, direto para o estado e a prefeitura.',
          },
          {
            termo: 'Limite do Simples',
            definicao: 'R$ 4.800.000 de receita em 12 meses. Acima disso, a empresa é excluída do regime.',
            comoExplicar: 'Passando de R$ 4,8 milhões por ano, a empresa sai do Simples e vai para Lucro Presumido ou Real.',
          },
          {
            termo: 'B2B e B2C',
            definicao:
              'B2B: vendas para pessoa jurídica. B2C: vendas para o consumidor final. A maioria das empresas ' +
              'é mista, e a proporção é o que pesa na decisão.',
            comoExplicar: 'Você vende mais para empresa ou para pessoa física? A resposta muda a recomendação.',
          },
          {
            termo: 'Ponto de equilíbrio comercial',
            definicao:
              'Quanto o modelo Híbrido pode custar a mais por mês e ainda compensar, considerando o crédito ' +
              'adicional que os compradores PJ passam a aproveitar.',
            comoExplicar:
              'É o quanto vale a pena pagar a mais de imposto para não perder cliente. Acima disso, não compensa.',
          },
        ],
      },
    ],
  },

  // -----------------------------------------------------------------------
  {
    id: 'ler-a-tela',
    titulo: 'Como ler a tela',
    resumo: 'Campo a campo: o que preencher, de onde tirar o dado e o que cada resultado significa.',
    blocos: [
      { tipo: 'paragrafo', texto: 'O que você preenche na seção Perfil do cliente:' },
      {
        tipo: 'campos',
        itens: [
          {
            campo: 'RBT12',
            oQueE: 'Receita bruta acumulada dos últimos 12 meses. Define a faixa e a alíquota.',
            ondeAcha: 'PGDAS-D da última competência ou relatório de faturamento do sistema contábil.',
          },
          {
            campo: 'Faturamento do mês',
            oQueE: 'Receita do mês que está sendo simulado. É a base do cálculo dos dois cenários.',
            ondeAcha: 'Apuração do mês. Para projeção, use a média dos últimos meses.',
          },
          {
            campo: 'Insumos e compras com crédito',
            oQueE:
              'Compras do mês que geram crédito de IBS/CBS. É o número que mais muda o resultado — quanto ' +
              'maior, mais o modelo Híbrido se paga.',
            ondeAcha:
              'Livro de entradas ou relatório de compras. Cuidado: nem toda despesa gera crédito. Folha de ' +
              'pagamento, por exemplo, não gera.',
          },
          {
            campo: 'Folha de pagamento 12 meses',
            oQueE: 'Salários, pró-labore e encargos dos últimos 12 meses. Base do Fator R.',
            ondeAcha: 'Folha do sistema de departamento pessoal.',
          },
          {
            campo: 'Perfil comercial e % vendido a PJ',
            oQueE:
              'A proporção da receita que vai para outras empresas. É o peso que o crédito tem na decisão — ' +
              'o eixo de tudo.',
            ondeAcha:
              'Relatório de notas emitidas, separando destinatário com CNPJ de destinatário pessoa física. ' +
              'Na dúvida, pergunte ao cliente: ele sabe.',
          },
          {
            campo: 'Saldo credor de IBS/CBS anterior',
            oQueE: 'Crédito que sobrou de meses anteriores e ainda pode ser aproveitado.',
            ondeAcha: 'Apuração do mês anterior. Em primeira simulação, deixe zero.',
          },
          {
            campo: 'IBS acumulado em 12 meses',
            oQueE: 'Entra na conta do sublimite, por regra nova. Em 2026 e 2027 o valor é irrelevante.',
            ondeAcha: 'Apuração de IBS. Zero enquanto a alíquota estiver em 0,1%.',
          },
          {
            campo: 'Débitos e pendências cadastrais',
            oQueE:
              'Marcar aqui trava o registro da decisão e emite alerta de bloqueio — porque na prática a ' +
              'opção não vai passar mesmo.',
            ondeAcha: 'Consulta de situação fiscal nos três âmbitos: federal, estadual e municipal.',
          },
        ],
      },
      { tipo: 'paragrafo', texto: 'O que o sistema devolve na seção Comparativo:' },
      {
        tipo: 'campos',
        itens: [
          {
            campo: 'Valor grande de cada cartão',
            oQueE: 'Quanto a empresa desembolsa no mês em cada cenário. No Híbrido é a soma das duas guias.',
            ondeAcha: '—',
          },
          {
            campo: 'Decomposição por tributo',
            oQueE:
              'Quanto do DAS é de cada imposto. É o que mostra por que o DAS do Híbrido fica menor: as ' +
              'parcelas substituídas por IBS/CBS saem da guia.',
            ondeAcha: '—',
          },
          {
            campo: 'Crédito repassado ao cliente PJ',
            oQueE: 'Quanto de crédito o comprador consegue aproveitar em cada cenário. A diferença é o argumento comercial.',
            ondeAcha: '—',
          },
          {
            campo: 'Preço líquido para o comprador PJ',
            oQueE: 'Preço menos crédito. É o custo real do seu produto para quem compra de você.',
            ondeAcha: '—',
          },
          {
            campo: 'Vantagem ponderada pelo mix',
            oQueE:
              'A diferença de caixa somada ao ganho de crédito, este último pesado pela fração vendida a PJ. ' +
              'É o número que define a recomendação.',
            ondeAcha: '—',
          },
        ],
      },
      {
        tipo: 'destaque',
        tom: 'info',
        titulo: 'Sobre o selo de confiança',
        texto:
          'Confiança alta significa margem folgada entre os cenários. Confiança baixa significa empate ' +
          'técnico — e empate técnico é motivo para análise individual, não para escolher no par ou ímpar. ' +
          'Nesses casos o sistema joga o cliente no grupo "Fronteira".',
      },
    ],
  },

  // -----------------------------------------------------------------------
  {
    id: 'usar-o-sistema',
    titulo: 'Roteiro de uso',
    resumo: 'Do primeiro cliente cadastrado até o relatório na mão do cliente.',
    blocos: [
      {
        tipo: 'passos',
        itens: [
          {
            titulo: '1. Carregue a carteira',
            texto:
              'Use "Importar CSV" com o arquivo exportado do sistema contábil, ou cadastre manualmente com ' +
              '"+ Cliente". O layout do CSV está na documentação do projeto.',
          },
          {
            titulo: '2. Marque quem tem pendência',
            texto:
              'Antes de olhar qualquer número, marque débitos e pendências cadastrais. Cliente bloqueado ' +
              'não decide nada em setembro — ele precisa é de regularização.',
          },
          {
            titulo: '3. Confira o perfil comercial',
            texto:
              'É o campo que mais influencia a recomendação e o que mais vem errado do sistema contábil. ' +
              'Ajuste a barra de percentual vendido a PJ com o cliente na linha, se precisar.',
          },
          {
            titulo: '4. Leia o diagnóstico, não só o número',
            texto:
              'A justificativa explica por que aquele cenário foi recomendado. Os alertas mostram o que ' +
              'pode derrubar a conta. Leia antes de levar para a reunião.',
          },
          {
            titulo: '5. Olhe a projeção',
            texto:
              'A decisão de setembro vale por um semestre, mas a estrutura de preço do cliente vive mais que ' +
              'isso. A aba Projeção mostra como a conta evolui até 2033.',
          },
          {
            titulo: '6. Gere o relatório',
            texto:
              'Na aba Relatórios, escolha o documento conforme o público. Baixe o arquivo para anexar em ' +
              'e-mail ou imprima em PDF na hora.',
          },
          {
            titulo: '7. Registre a decisão',
            texto:
              'Com responsável e observação. O registro é a prova de que a orientação foi dada e aceita — e ' +
              'o indicador verde na carteira mostra o avanço do trabalho.',
          },
        ],
      },
      {
        tipo: 'destaque',
        tom: 'alerta',
        titulo: 'Onde ficam os dados',
        texto:
          'Os dados ficam salvos no navegador desta máquina, não em servidor. Isso significa que nada de ' +
          'cliente sai daqui — e também que a carteira não é compartilhada entre computadores. Use "Exportar ' +
          'carteira" para levar os dados para outra máquina ou fazer cópia de segurança.',
      },
    ],
  },

  // -----------------------------------------------------------------------
  {
    id: 'explicar-ao-cliente',
    titulo: 'Como explicar ao cliente',
    resumo: 'Analogias que funcionam e respostas para as objeções que aparecem na reunião.',
    blocos: [
      {
        tipo: 'paragrafo',
        texto:
          'A conversa mais difícil é com o cliente B2B em que o modelo Tradicional é mais barato. Você vai ' +
          'recomendar que ele pague mais imposto. A recomendação só se sustenta se ele entender o que está ' +
          'comprando com esse dinheiro: competitividade.',
      },
      {
        tipo: 'destaque',
        tom: 'info',
        titulo: 'A analogia que funciona',
        texto:
          '"Hoje você entrega a mercadoria com um cupom de desconto pela metade. O concorrente entrega o ' +
          'cupom cheio. O preço na nota é o mesmo, mas para quem compra sai mais caro comprar de você — e ' +
          'o comprador vê isso no sistema dele, mesmo sem falar nada."',
      },
      {
        tipo: 'objecoes',
        itens: [
          {
            pergunta: 'Então eu vou pagar mais imposto?',
            resposta:
              'Nesse caso sim, em caixa. Mas o número que importa é o preço final que o seu cliente enxerga. ' +
              'Mostre a linha "preço líquido para o comprador PJ": no modelo Híbrido o seu produto fica mais ' +
              'barato para ele, sem você baixar preço. O que você paga a mais de imposto vira vantagem ' +
              'competitiva. Se ele não valoriza isso, a decisão é ficar no Tradicional — e está tudo certo.',
          },
          {
            pergunta: 'Vou sair do Simples Nacional?',
            resposta:
              'Não. A empresa continua no Simples Nacional nos dois casos. IRPJ, CSLL e INSS patronal seguem ' +
              'na guia única, que inclusive fica mais barata. O que muda é só onde o IBS e a CBS são ' +
              'recolhidos.',
          },
          {
            pergunta: 'Vai complicar minha rotina?',
            resposta:
              'Sim, um pouco: passa a existir uma segunda guia e é preciso controlar os créditos das compras. ' +
              'Esse controle é responsabilidade do escritório, não sua. O que muda do seu lado é garantir que ' +
              'as notas de compra cheguem completas.',
          },
          {
            pergunta: 'Meu concorrente vai fazer isso?',
            resposta:
              'Quem vende para indústria e grande varejo provavelmente vai, porque o comprador vai cobrar. ' +
              'Vale a pergunta inversa: se ele fizer e você não, o seu produto fica mais caro para o mesmo ' +
              'cliente, com o mesmo preço de tabela.',
          },
          {
            pergunta: 'Posso decidir depois?',
            resposta:
              'A janela é de 1º a 30 de setembro de 2026 e vale para o primeiro semestre de 2027. Quem não ' +
              'se manifesta fica no Tradicional. Existe uma segunda janela em março de 2027, mas ela só ' +
              'produz efeito no segundo semestre — ou seja, meio ano perdido.',
          },
          {
            pergunta: 'E se eu escolher errado?',
            resposta:
              'Até 30 de novembro de 2026 dá para cancelar a opção de setembro. Depois disso ela é ' +
              'irretratável para o período. Por isso reprocessamos as simulações em outubro, com os números ' +
              'fechados, antes desse prazo.',
          },
          {
            pergunta: 'Por que preciso regularizar débito antes?',
            resposta:
              'Porque débito em aberto impede a confirmação da opção. Não é questão de conveniência: o ' +
              'sistema não aceita. Se a regularização não sair até o meio do ano, a janela se perde ' +
              'independentemente de qual seria a melhor escolha.',
          },
          {
            pergunta: 'Esse número é garantido?',
            resposta:
              'É uma estimativa, e a resposta honesta é essa. Trabalhamos com as alíquotas de referência ' +
              'publicadas e com os seus números atuais. Se qualquer um dos dois mudar, refazemos a conta — ' +
              'e é para isso que existe o prazo de novembro.',
          },
        ],
      },
      {
        tipo: 'destaque',
        tom: 'ok',
        titulo: 'Para prospecção',
        texto:
          'Com empresa que ainda não é cliente, o caminho mais curto é pedir três números — faturamento ' +
          'mensal, compras com crédito e quanto da receita vai para empresas — e gerar o relatório de ' +
          'prospecção. Ele mostra o valor em jogo no caso específico dela e a contagem regressiva. É um ' +
          'diagnóstico honesto que abre conversa sem prometer economia.',
      },
    ],
  },

  // -----------------------------------------------------------------------
  {
    id: 'limites',
    titulo: 'O que o sistema não faz',
    resumo: 'Premissas declaradas e limites, para ninguém prometer o que a ferramenta não sustenta.',
    blocos: [
      {
        tipo: 'paragrafo',
        texto:
          'Toda ferramenta de simulação trabalha com premissas. As desta estão listadas abaixo — e é ' +
          'importante conhecê-las antes de apresentar um número como definitivo.',
      },
      {
        tipo: 'lista',
        itens: [
          'As alíquotas de referência (26,5% no regime pleno, sendo CBS 8,8% e IBS 17,7%) são estimativas e podem mudar por regulamentação.',
          'A simulação é mensal. Ela não projeta sazonalidade nem variação de faturamento ao longo do ano.',
          'O crédito é calculado sobre o valor informado de insumos, assumindo que todo ele gera crédito integral. Na prática, parte das compras pode não gerar.',
          'Regimes específicos — Zona Franca de Manaus, substituição tributária, monofásicos, imposto seletivo — não estão modelados.',
          'A empresa é tratada como estabelecimento único. Múltiplos estabelecimentos com alíquotas municipais diferentes não são segregados.',
          'O cálculo assume que a empresa permanece dentro do limite do Simples durante o período simulado.',
          'As tabelas dos anexos precisam ser revalidadas a cada ciclo anual, junto com as alíquotas de referência.',
        ],
      },
      {
        tipo: 'destaque',
        tom: 'alerta',
        titulo: 'A premissa mais relevante',
        texto:
          'No cenário Tradicional, o sistema assume que o valor total do DAS permanece o mesmo durante a ' +
          'transição, com exceção da parcela de IPI, que sai da guia quando o IPI é zerado em 2027. É a ' +
          'leitura mais conservadora entre as possíveis. Se a regulamentação ajustar as tabelas do Simples, ' +
          'o parâmetro muda em um único lugar do código.',
      },
      {
        tipo: 'destaque',
        tom: 'info',
        titulo: 'Uma curiosidade que vale entender',
        texto:
          'Para uma empresa 100% B2B que não tem compras gerando crédito, os dois modelos se equivalem ' +
          'exatamente: o imposto a mais que ela paga no Híbrido é igual ao crédito a mais que ela transfere. ' +
          'Não é coincidência, é identidade matemática do modelo. Nesses casos o sistema devolve confiança ' +
          'baixa e manda para análise individual, porque não existe resposta ótima — existe uma escolha ' +
          'sobre quem fica com a conta.',
      },
      {
        tipo: 'paragrafo',
        texto:
          'A ferramenta apoia a decisão do responsável técnico. Ela não substitui a análise de quem assina.',
      },
    ],
  },
];
