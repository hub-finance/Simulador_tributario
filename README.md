# Simulador de Transição Tributária — Simples Nacional 2027

Ferramenta de apoio à supervisão contábil para a decisão que precisa ser tomada na
**janela de 1º a 30 de setembro de 2026**: manter o cliente no modelo tradicional do
Simples Nacional (tudo dentro do DAS) ou migrar para o modelo híbrido, com IBS e CBS
recolhidos por fora pelo regime não cumulativo.

## O problema que o sistema resolve

A janela tem 30 dias corridos e vale para o 1º semestre de 2027. Depois de 30/11/2026 a
escolha é irretratável. Rodar essa análise cliente a cliente em planilha, dentro da janela,
não é viável — e errar custa contrato: no modelo tradicional, o comprador PJ só toma crédito
no limite do IBS/CBS efetivamente embutido na guia do DAS.

O simulador calcula os dois cenários, mede a diferença de crédito repassado ao comprador PJ
e transforma a diretriz comercial ("B2C fica, B2B migra") em um número: quanto o modelo
híbrido pode custar a mais em caixa e ainda assim compensar.

## Como rodar

```bash
npm install
npm run dev      # servidor de desenvolvimento
npm test         # 164 testes do motor, das regras, dos relatórios, da consulta e do conteúdo da Ajuda
npm run build    # build de produção em dist/
```

Requer Node 20+. O build gera um site estático — publicável em Netlify, Vercel ou
qualquer servidor de arquivos.

## O que o sistema faz

**Consulta por CNPJ.** Digite o CNPJ e o sistema busca na base pública da Receita Federal:
razão social, CNAE, anexo sugerido pela atividade, situação cadastral e quadro societário.
Situação diferente de ATIVA vira pendência cadastral automaticamente — a mesma que bloqueia
a opção na janela. Os sócios são cruzados com o resto da carteira para apontar grupo
econômico antes que a malha fina aponte. A consulta é conveniência: se a rede bloquear,
o preenchimento manual continua completo.

**Simulador.** Cadastro do cliente (RBT12, faturamento, insumos, folha, perfil comercial)
e comparativo lado a lado dos dois cenários, com a guia decomposta por tributo e o crédito
repassado ao cliente PJ em cada modelo.

**Diagnóstico.** Recomendação com nível de confiança, ponto de equilíbrio comercial e
alertas ordenados por severidade — de bloqueio cadastral a saldo credor acumulado.
A decisão é registrada com responsável, janela e observação.

**Projeção 2026–2033.** Os mesmos dados aplicados às alíquotas de cada ano da transição,
porque a decisão de setembro vale por um semestre mas o desenho de preço olha mais longe.

**Cronograma.** Todas as janelas e prazos com contagem regressiva sobre a data corrente,
e a consequência explícita de perder cada um.

**Ajuda.** Aba didática, para quem opera entender o assunto e conseguir explicar ao cliente:
a reforma do zero, glossário de cada termo da tela com a tradução para linguagem de cliente,
exemplo numérico calculado pelo próprio motor, roteiro de uso, analogias e respostas prontas
para as objeções da reunião, e a lista do que o sistema não faz.

**Relatórios.** Três documentos prontos para reunião, cada um com seu público:

| Documento | Para quem | O que entrega |
|---|---|---|
| Diagnóstico do cliente | Reunião com o cliente da casa | Recomendação, comparativo dos dois cenários, pontos de atenção e prazos |
| Diagnóstico de prospecção | Empresa que ainda não é cliente | Os dois modelos sem jargão, o valor em jogo no caso dele, contagem regressiva e proposta de conversa |
| Consolidado da carteira | Reunião interna de supervisão | Quem já decidiu, quem está travado, segmentação por prioridade e totais em jogo |

Cada um pode ser visualizado, impresso em PDF ou baixado como arquivo HTML autocontido —
que abre offline em qualquer navegador e pode ser anexado a e-mail. Os documentos são
gerados na máquina; nenhum dado de cliente sai dela.

## Arquitetura

```
src/
  dominio/          Regras de negócio puras, sem dependência de interface
    tabelasSimples.ts    Anexos I a V: faixas, alíquotas, repartição por tributo
    transicao.ts         Cronograma 2026–2033 de IBS/CBS e phase-out dos tributos atuais
    motorSimulacao.ts    Os dois cenários e o comparativo
    fatorR.ts            Anexo III x V
    receitaBruta.ts      Composição da receita e limite/sublimite
    obrigacoes.ts        PGDAS-D e DEFIS: multas por atraso
    calendario.ts        Janelas, prazos e contagem regressiva
    diagnostico.ts       Recomendação, alertas e bloqueios
    segmentacao.ts       Classificação da carteira em grupos de tratamento
  relatorios/       Geração dos três documentos e sua entrega (imprimir ou baixar)
  conteudo/         Texto da aba Ajuda, como dado estruturado e testável
  app/              Modelo de dados, persistência, importação CSV
    consultaCnpj.ts      Consulta à base da Receita Federal e sugestão de anexo pelo CNAE
    grupoEconomico.ts    Cruzamento de sócios entre os clientes da carteira
  ui/               Componentes de interface
db/schema.sql       Schema relacional de destino, para quando houver backend
docs/               Planejamento e matriz de regras
```

O domínio não conhece React e não conhece alíquota fixa: todo parâmetro vem do
cronograma de transição ou das tabelas dos anexos.

## Documentação

- **[docs/PLANEJAMENTO.md](docs/PLANEJAMENTO.md)** — cronograma-mestre, plano de ação do
  escritório fase a fase, segmentação da carteira em grupos de tratamento e roadmap do produto.
- **[docs/MATRIZ_DE_REGRAS.md](docs/MATRIZ_DE_REGRAS.md)** — cada regra levantada, onde está
  implementada e qual teste a cobre; parâmetros configuráveis e rotina de revalidação anual.
- **[CLAUDE.md](CLAUDE.md)** — convenções do projeto, incluindo o padrão obrigatório da aba Ajuda.

## Aviso

Os valores são estimativas baseadas nos parâmetros informados e nas alíquotas de referência
do cronograma de transição, sujeitas a alteração por regulamentação superveniente. As tabelas
dos anexos e as alíquotas de referência devem ser revalidadas antes de cada ciclo de decisão —
o procedimento está na matriz de regras. A ferramenta apoia a decisão do responsável técnico;
não a substitui.
