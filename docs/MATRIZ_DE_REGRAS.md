# Matriz de regras — onde cada regra está implementada

Rastreabilidade entre as regras levantadas e o código. Toda regra aqui tem implementação
e teste. Use esta tabela para conferir cobertura antes de cada ciclo de revisão.

Legenda de status: **✅ implementada e testada** · **⚙️ parametrizável** · **📋 documental**

---

## 1. Calendário e janelas de opção

| # | Regra | Status | Implementação | Teste |
|---|---|---|---|---|
| 1.1 | Janela de 01 a 30/09/2026 para optar por recolher IBS/CBS "por fora" do DAS, com efeito no 1º semestre de 2027 | ✅ | `calendario.ts` → `janela-setembro-2026` | `regras.test.ts` › "a janela de setembro/2026 vai de 01/09 a 30/09" |
| 1.2 | Mesma janela de setembro para empresas de fora que queiram ingressar no Simples em 2027 | ✅ | `calendario.ts` → descrição de `janela-setembro-2026` | idem |
| 1.3 | Cancelamento da opção até 30/11/2026, de forma irretratável | ✅ | `calendario.ts` → `cancelamento-novembro-2026` | › "o cancelamento da opção encerra em 30/11/2026 e é irretratável" |
| 1.4 | Segunda janela de 01 a 31/03/2027, com efeito no 2º semestre de 2027 | ✅ | `calendario.ts` → `janela-marco-2027` | › "a segunda janela vai de 01/03 a 31/03/2027" |
| 1.5 | Apenas 30 dias de janela → simulações precisam começar meses antes | ✅ | `calendario.ts` → `preparacao-simulacoes`, `apresentacao-cenarios` | › "a agenda ativa traz o que está aberto ou abre no horizonte" |
| 1.6 | Contagem regressiva de dias sobre a data corrente | ✅ | `calendario.ts` → `avaliarEvento`, `janelaVigente`, `proximaJanela` | › "conta os dias restantes da janela", › "identifica a janela vigente" |

## 2. Os dois modelos de recolhimento

| # | Regra | Status | Implementação | Teste |
|---|---|---|---|---|
| 2.1 | **Modelo Tradicional:** tudo dentro do DAS, guia única | ✅ | `motorSimulacao.ts` → `CenarioTradicional` | `motorSimulacao.test.ts` › "o cenário Tradicional é o faturamento pela alíquota efetiva" |
| 2.2 | No Tradicional, o cliente PJ só toma crédito no limite do IBS/CBS efetivamente pago dentro do DAS | ✅ | `fracaoIbsCbsEmbutidaNoDAS` | › "crédito embutido no DAS" (3 casos) |
| 2.3 | **Modelo Híbrido:** IRPJ, CSLL e CPP seguem no DAS, que fica mais barato | ✅ | `fatorPermanenteDAS` | › "fator permanente do DAS no modelo híbrido" (4 casos) |
| 2.4 | No Híbrido, IBS e CBS são apurados pelo regime não cumulativo (débito − crédito) | ✅ | `motorSimulacao.ts` → `simular` | › "a guia de IBS/CBS é débito menos crédito, com piso em zero" |
| 2.5 | No Híbrido, o crédito transferido na nota é integral | ✅ | `CenarioHibrido.creditoTransferido` | › "o crédito transferido no Híbrido é o débito integral da operação" |
| 2.6 | Crédito maior que débito gera saldo credor transportado | ✅ | `saldoCredorAcumulado` | › "crédito maior que débito gera saldo credor e guia zerada" |
| 2.7 | Alíquota efetiva do Simples: `((RBT12 × nominal) − PD) / RBT12` | ✅ | `calcularAliquotaEfetiva` | › "aplica ((RBT12 x nominal) - PD) / RBT12" |
| 2.8 | Anexo IV não tem CPP no DAS (INSS patronal recolhido à parte) | ✅ | `tabelasSimples.ts` → `ANEXO_IV` | › "o Anexo IV não tem CPP no DAS" |

## 3. Diretriz comercial B2B x B2C

| # | Regra | Status | Implementação | Teste |
|---|---|---|---|---|
| 3.1 | Clientes B2C devem majoritariamente ficar no Tradicional | ✅ | `diagnostico.ts` → `diagnosticar` | `regras.test.ts` › "B2C decide pelo menor custo em caixa" |
| 3.2 | Clientes B2B precisam migrar para o Híbrido sob pena de perder contratos | ✅ | `vantagemPonderada` + alerta de risco | › "B2B com Tradicional mais barato dispara o alerta de risco comercial" |
| 3.3 | Alerta explícito quando o Tradicional é mais barato mas o cliente é B2B | ✅ | `diagnostico.ts` → alerta "Risco comercial na cadeia B2B" | idem |
| 3.4 | Ponderação pelo percentual de receita vendida a PJ (perfil misto) | ✅ | `EntradaSimulacao.percentualReceitaB2B` | `motorSimulacao.test.ts` › "percentualReceitaB2B prevalece sobre o perfil declarado" |
| 3.5 | Ponto de equilíbrio comercial: quanto o Híbrido pode custar a mais e ainda compensar | ✅ | `Diagnostico.pontoDeEquilibrioComercial` | `regras.test.ts` › casos de diagnóstico |

## 4. Operação em 2026

| # | Regra | Status | Implementação | Teste |
|---|---|---|---|---|
| 4.1 | Em 2026 o Simples está dispensado de recolher a alíquota-teste de IBS/CBS | ✅ | `transicao.ts` → `simplesDispensadoDoRecolhimento` | `regras.test.ts` › "em 2026 o Simples está dispensado da alíquota-teste" |
| 4.2 | Preenchimento dos campos de IBS/CBS na nota é opcional em 2026 | 📋 | `transicao.ts` → observação do ano 2026 | — (regra informativa) |
| 4.3 | A opção híbrida só produz efeitos a partir de 2027 | ✅ | `opcaoHibridaDisponivel` | `motorSimulacao.test.ts` › "em 2026 o cenário Híbrido é marcado como indisponível" |

## 5. Obrigações acessórias e multas

| # | Regra | Status | Implementação | Teste |
|---|---|---|---|---|
| 5.1 | PGDAS-D vence no dia 20 | ✅ | `calendario.ts` → `vencimentoPgdasD` | `regras.test.ts` › "o PGDAS-D vence no dia 20 do mês seguinte" |
| 5.2 | Multa do PGDAS-D desde o 1º dia de atraso: 2% ao mês, piso de R$ 50 | ✅ | `obrigacoes.ts` → `calcularMultaAtraso` | › "o PGDAS-D tem piso de R$ 50 e multa desde o primeiro dia" |
| 5.3 | DEFIS 2025 entregue até 31/03/2026 | ✅ | `calendario.ts` → `defis-2025` | › "a DEFIS 2025 vence em 31/03/2026" |
| 5.4 | Multa inédita da DEFIS: 2% ao mês, piso de R$ 200 | ✅ | `REGRAS_MULTA.DEFIS` | › "a DEFIS tem piso de R$ 200" |
| 5.5 | Teto de 20% da base | ✅ | `RegraMulta.tetoPercentual` | › "respeita o teto de 20% da base" |
| 5.6 | Redução de 50% por espontaneidade, limitada ao piso | ✅ | `reducaoEspontanea` | › "a redução por espontaneidade nunca derruba a multa abaixo do piso" |
| 5.7 | Fim da DEFIS como obrigação autônoma; dados migram para o PGDAS-D | 📋 | `obrigacoes.ts` → observação da regra DEFIS | — (regra de preparação) |

## 6. Composição de receitas e limites

| # | Regra | Status | Implementação | Teste |
|---|---|---|---|---|
| 6.1 | Gorjetas integram a receita bruta mensal | ✅ | `receitaBruta.ts` → `COMPONENTES_RECEITA` | `regras.test.ts` › "gorjetas, juros, multas de mora e entrega futura integram a receita" |
| 6.2 | Juros recebidos integram a receita bruta | ✅ | idem | idem |
| 6.3 | Multas de mora recebidas integram a receita bruta | ✅ | idem | idem |
| 6.4 | Operações para entrega futura integram a receita do mês da operação | ✅ | idem | idem |
| 6.5 | Vendas canceladas, descontos incondicionais, IPI e ICMS-ST não integram | ✅ | idem | › "vendas canceladas, descontos incondicionais, IPI e ICMS-ST são deduzidos" |
| 6.6 | O IBS integra a conta do sublimite de faturamento | ✅ | `avaliarLimite(rbt12, ibsAcumulado12Meses)` | › "o IBS acumulado soma à base do sublimite" |
| 6.7 | Sublimite de ICMS/ISS em R$ 3.600.000 | ✅ | `SUBLIMITE_ICMS_ISS` | › "sinaliza atenção a partir de 80% do sublimite" |
| 6.8 | Limite geral do Simples em R$ 4.800.000 | ✅ | `LIMITE_SIMPLES_NACIONAL` | › "acima de 4,8 milhões o limite do regime é excedido" |

## 7. Malha fina sistêmica e auditoria cadastral

| # | Regra | Status | Implementação | Teste |
|---|---|---|---|---|
| 7.1 | Cruzamento automático do faturamento global entre CNPJs com sócios em comum | ✅ | `diagnostico.ts` → alerta de grupo econômico | `regras.test.ts` › "cruza o faturamento global de CNPJs interligados" |
| 7.2 | Débitos em aberto barram a confirmação ou alteração de regime em setembro | ✅ | `SituacaoCadastral.possuiDebitosEmAberto` → severidade `bloqueio` | › "débitos em aberto geram bloqueio" |
| 7.3 | Pendências cadastrais também impedem a opção | ✅ | `possuiPendenciasCadastrais` | › "pendências cadastrais também bloqueiam" |
| 7.4 | Regularização deve ocorrer antes de meados de 2026 | ✅ | `calendario.ts` → `auditoria-cadastral` (até 30/06/2026) | mensagem verificada em › "débitos em aberto geram bloqueio" |
| 7.5 | Decisão não pode ser registrada como definitiva com bloqueio aberto | ✅ | `PainelDiagnostico` → botão desabilitado | — (regra de interface) |

## 8. Cronograma da reforma (2026–2033)

| # | Regra | Status | Implementação | Teste |
|---|---|---|---|---|
| 8.1 | 2027: PIS/Cofins extintos, CBS integral, IPI zerado | ✅ | `CRONOGRAMA_TRANSICAO` | `regras.test.ts` › "em 2027 o PIS/Cofins é extinto e a opção híbrida passa a valer" |
| 8.2 | 2029–2032: ICMS/ISS reduzidos 10 p.p. ao ano, IBS em contrapartida | ✅ | `fracaoIcmsIss` | › "o ICMS/ISS cai 10 pontos ao ano entre 2029 e 2032 e zera em 2033" |
| 8.3 | 2033: regime pleno, IBS + CBS em 26,5% | ✅ | `ALIQUOTA_REFERENCIA_TOTAL` | › "em 2033 a alíquota combinada chega à referência de 26,5%" |
| 8.4 | Anos fora da tabela caem no extremo mais próximo | ✅ | `parametrosDoAno` | › "anos fora da tabela caem no extremo mais próximo" |

## 9. Fator R

| # | Regra | Status | Implementação | Teste |
|---|---|---|---|---|
| 9.1 | Fator R = folha 12 meses / RBT12; ≥ 28% → Anexo III, < 28% → Anexo V | ✅ | `fatorR.ts` → `calcularFatorR` | `regras.test.ts` › "28% é o piso de migração para o Anexo III" |
| 9.2 | Cálculo da folha faltante para virar de anexo | ✅ | `ResultadoFatorR.folhaFaltante` | › "calcula a folha faltante para virar de anexo" |
| 9.3 | Lista de atividades sujeitas ao Fator R | 📋 | `ATIVIDADES_SUJEITAS_AO_FATOR_R` | — (referência) |

---

## Parâmetros configuráveis

| Parâmetro | Valor atual | Arquivo |
|---|---|---|
| Alíquota de referência IBS + CBS | 26,5% | `transicao.ts` |
| Alíquota de referência CBS | 8,8% | `transicao.ts` |
| Alíquota de referência IBS | 17,7% | `transicao.ts` |
| Piso do Fator R | 28% | `fatorR.ts` |
| Sublimite de ICMS/ISS | R$ 3.600.000 | `tabelasSimples.ts` |
| Limite do Simples Nacional | R$ 4.800.000 | `tabelasSimples.ts` |
| Dia de vencimento do PGDAS-D | 20 | `calendario.ts` |
| Piso da multa do PGDAS-D | R$ 50 | `obrigacoes.ts` |
| Piso da multa da DEFIS | R$ 200 | `obrigacoes.ts` |
| Tabelas dos Anexos I a V | LC 123/2006 c/ LC 155/2016 | `tabelasSimples.ts` |

### Rotina de revalidação anual

1. Conferir as tabelas dos Anexos I a V (alíquotas nominais, parcelas a deduzir e repartição)
   contra a redação vigente da LC 123/2006.
2. Conferir as alíquotas de referência de IBS e CBS contra a fixação oficial do ano.
3. Rodar `npm test` — o teste "a repartição de cada faixa soma 100%" pega erro de digitação
   em qualquer percentual alterado.
4. Registrar a data da revalidação neste documento.

**Última revalidação:** pendente — tabelas inseridas a partir da legislação de referência,
confira antes do ciclo de setembro/2026.

---

## Importação de carteira (CSV)

Separador `;`. A primeira linha é tratada como cabeçalho quando começa por `nome`.
Valores aceitam formato brasileiro (`1.234,56`) ou ponto decimal (`1234.56`).

```
nome;cnpj;cnae;anexo;perfil;percentual_b2b;rbt12;faturamento_mensal;insumos;folha_12m
Metalúrgica Aurora Ltda;12.345.678/0001-90;2599-3/99;2;B2B;100;2400000;210000;96000;420000
```

| Coluna | Obrigatória | Observação |
|---|---|---|
| `nome` | Sim | Linha sem nome é ignorada e reportada |
| `anexo` | Não | 1 a 5; fora da faixa assume 1 |
| `perfil` | Não | `B2B`, `B2C` ou `MISTO`; inválido assume `B2C` |
| `percentual_b2b` | Não | Aceita `0,7` ou `70`; ausente deriva do perfil |
| Demais | Não | Ausentes assumem zero; RBT12 zerado gera aviso |
