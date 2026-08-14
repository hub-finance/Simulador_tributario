# Planejamento — Transição Tributária do Simples Nacional

Documento de trabalho do escritório. Cobre dois planos que correm em paralelo:

- **Plano A — Operação:** o que o escritório precisa fazer, e quando, para não perder as janelas.
- **Plano B — Produto:** o que precisa estar pronto no simulador, e quando, para sustentar o Plano A.

A premissa que organiza tudo: **setembro de 2026 é o novo janeiro.** A decisão tributária
que antes se tomava no início do ano passou a ser tomada em setembro do ano anterior, com
uma janela de 30 dias corridos. O trabalho de campo precisa estar concluído *antes* de a
janela abrir — dentro dela só cabe formalizar.

---

## 1. Cronograma-mestre

| Período | Evento | Categoria | Responsável | Efeito |
|---|---|---|---|---|
| 01/01/2026 – 31/03/2026 | Entrega da DEFIS ano-calendário 2025 | Obrigação acessória | Escritório | Multa mínima de R$ 200 (ou 2%/mês) em caso de atraso |
| 01/01/2026 – 30/06/2026 | Auditoria cadastral e regularização de débitos | Preparação | Escritório + Cliente | Débito em aberto **barra** a opção de setembro |
| 01/01/2026 – 31/08/2026 | Rodar simulações em toda a base | Preparação | Escritório | Sem simulação prévia, decide-se no escuro |
| 01/07/2026 – 31/08/2026 | Apresentação dos cenários e colheita da decisão | Preparação | Escritório + Cliente | Decisão formalizada por escrito |
| **01/09/2026 – 30/09/2026** | **Janela de opção — IBS/CBS por fora do DAS** | **Janela** | Escritório + Cliente | **1º semestre de 2027** |
| 01/09/2026 – 30/09/2026 | Solicitação de ingresso no Simples Nacional para 2027 | Janela | Escritório + Cliente | Ano-calendário 2027 |
| até 30/11/2026 | Cancelamento da opção de setembro | **Prazo irretratável** | Escritório | Após a data, a escolha não pode mais ser revertida |
| 01/01/2027 | CBS substitui PIS/Cofins; IPI zerado; IBS em 0,1% | Marco operacional | Escritório | Parametrização concluída até 31/12/2026 |
| **01/03/2027 – 31/03/2027** | **2ª janela de opção — IBS/CBS por fora do DAS** | **Janela** | Escritório + Cliente | **2º semestre de 2027** |
| Mensal, dia 20 | Vencimento do PGDAS-D | Obrigação acessória | Escritório | Multa de 2%/mês desde o 1º dia de atraso, piso de R$ 50 |

O mesmo cronograma está codificado em `src/dominio/calendario.ts` e aparece na aba
**Cronograma e prazos** do sistema, com contagem regressiva calculada sobre a data corrente.

---

## 2. Plano A — Operação do escritório

### Fase 1 · Auditoria cadastral (até 30/06/2026) — **pré-requisito de tudo**

Débito ou pendência cadastral **impede** a confirmação da opção em setembro. Um cliente
irregular perde a janela inteira, independentemente de qual cenário seja melhor para ele.

1. Levantar situação fiscal e cadastral de 100% da carteira (débitos federais, estaduais,
   municipais; divergências de endereço, CNAE e quadro societário).
2. Classificar por gravidade e prazo de resolução; abrir parcelamento onde couber.
3. Marcar no sistema, cliente a cliente, os campos **Débitos fiscais em aberto** e
   **Pendências cadastrais** — eles disparam o bloqueio no painel de decisão e impedem o
   registro da decisão como definitiva.
4. Meta: zero bloqueios em 30/06/2026.

### Fase 2 · Simulação de toda a base (até 31/08/2026)

1. Importar a carteira via CSV (layout em `docs/MATRIZ_DE_REGRAS.md`, seção "Importação").
2. Rodar as duas simulações para cada cliente no ano-base 2027.
3. Segmentar a carteira em quatro grupos de tratamento — o sistema faz isso automaticamente
   e o relatório consolidado já sai agrupado por prioridade:

| Grupo | Perfil | Resultado da simulação | Encaminhamento |
|---|---|---|---|
| **1. Tradicional tranquilo** | B2C | Tradicional mais barato | Comunicar e manter. Baixo esforço. |
| **2. Híbrido evidente** | B2B | Híbrido mais barato **e** dá mais crédito | Migrar. Decisão sem trade-off. |
| **3. Decisão comercial** | B2B | Tradicional mais barato, mas crédito limitado | **Reunião obrigatória.** O ponto de equilíbrio comercial calculado pelo sistema é o centro da conversa. |
| **4. Fronteira** | Qualquer | Perto do sublimite, Fator R oscilando ou grupo econômico | Análise individual antes de recomendar. |

O grupo 3 é onde está o risco de perder cliente e onde o escritório agrega mais valor.
Ele deve ser atacado primeiro.

### Fase 3 · Comunicação e decisão (01/07/2026 – 31/08/2026)

1. Informativo geral para a base explicando as duas vias de recolhimento e a janela de setembro.
2. Diagnóstico individual para os grupos 2, 3 e 4, usando o relatório "Diagnóstico do cliente".
   Para captar empresas novas no mesmo movimento, o relatório "Diagnóstico de prospecção" usa
   os mesmos cálculos com linguagem voltada a quem ainda não é cliente.
3. Reunião com todo o grupo 3 — pauta única: se o cliente aceita pagar mais imposto para
   preservar competitividade junto aos compradores PJ.
4. Decisão registrada no sistema com responsável, janela e observação. O registro é a prova
   de que a orientação foi dada e aceita.

### Fase 4 · Execução da janela (01/09/2026 – 30/09/2026)

Dentro da janela só se formaliza. Rotina diária: lista de clientes com decisão registrada e
opção ainda não formalizada, até zerar.

### Fase 5 · Revisão até o prazo irretratável (até 30/11/2026)

Reprocessar as simulações com os números fechados de outubro. Se o cenário virou para algum
cliente, cancelar a opção **antes de 30/11**. Depois dessa data não há mais volta para o
1º semestre de 2027 — resta a janela de março/2027, que só produz efeito no 2º semestre.

### Fase 6 · Virada operacional (dezembro/2026)

Parametrização de notas fiscais e obrigações para 01/01/2027: PIS/Cofins extintos, CBS
integral, IPI zerado, destaque de IBS/CBS na nota para quem optou pelo híbrido.

---

## 3. Plano B — Produto (o simulador)

### Entregue nesta versão

| Módulo | Arquivo | O que faz |
|---|---|---|
| Tabelas do Simples | `src/dominio/tabelasSimples.ts` | Anexos I a V com faixas, alíquotas, deduções e repartição por tributo |
| Cronograma da transição | `src/dominio/transicao.ts` | Alíquotas de IBS/CBS e phase-out de PIS/Cofins, ICMS/ISS e IPI, ano a ano até 2033 |
| Motor de simulação | `src/dominio/motorSimulacao.ts` | Os dois cenários, decomposição do DAS, crédito transferido, saldo credor |
| Fator R | `src/dominio/fatorR.ts` | Anexo III x V e folha faltante para virar |
| Receita bruta | `src/dominio/receitaBruta.ts` | Composição oficial da receita e limite/sublimite com IBS na conta |
| Obrigações e multas | `src/dominio/obrigacoes.ts` | PGDAS-D e DEFIS: piso, percentual mensal, teto e espontaneidade |
| Calendário | `src/dominio/calendario.ts` | Janelas, prazos e contagem regressiva |
| Diagnóstico | `src/dominio/diagnostico.ts` | Recomendação, ponto de equilíbrio comercial, alertas e bloqueios |
| Segmentação | `src/dominio/segmentacao.ts` | Classificação automática da carteira nos quatro grupos de tratamento da Fase 2 |
| Relatórios | `src/relatorios/` | Diagnóstico do cliente, diagnóstico de prospecção e consolidado da carteira |
| Interface | `src/ui/`, `src/App.tsx` | Dashboard, projeção 2026–2033, cronograma, relatórios e Ajuda |
| Aplicativo instalável | `vite.config.ts`, `src/app/atualizacao.ts` | Instala, funciona sem internet e se atualiza com um clique quando há versão nova |

### Próximos passos sugeridos

1. **Integração com o sistema contábil** — hoje a entrada é por CSV. O passo natural é
   consumir a API/exportação direta e eliminar a digitação.
2. **Backend e base compartilhada** — o schema relacional está em `db/schema.sql`.
   Enquanto não existe, os dados ficam no navegador de quem usa (`localStorage`), o que
   significa que a carteira não acompanha o usuário entre máquinas. É a maior limitação
   em aberto e a próxima a resolver.
3. **Histórico de simulações** — guardar cada rodada com data e parâmetros, para provar
   o que foi recomendado e com que números.
4. **Painel de carteira** — visão agregada: quantos clientes em cada grupo, quanto de
   imposto em jogo, quantos bloqueios abertos.
5. **Alertas automáticos de prazo** — disparo por e-mail conforme o calendário se aproxima.

---

## 4. Capacitação da equipe

| Iniciativa | O que é | Por que |
|---|---|---|
| **Curso Reforma Tributária do Consumo** (Receita Federal + CFC) | Curso oficial, acessível por Gov.br e pelos CRCs | Visão institucional de quem vai fiscalizar as novas regras |
| **Imersões privadas** (e-Auditoria, Tactus, Econet) | Simulações completas da transição do Simples para 2027 | Formato mão na massa, focado na rotina de escritório |
| **Workshops de entidades de classe** (CRC, SESCON regionais) | Debates focados nas dores do setor | Discussão prática da Resolução CGSN 186/2026 |

Sugestão de sequência: curso oficial primeiro (base conceitual comum para todo o time),
imersão privada depois (aplicação), workshops ao longo do ano (atualização).

---

## 5. Premissas declaradas

O simulador trabalha com parâmetros que ainda podem mudar por regulamentação. Todos estão
centralizados e são configuráveis — nenhum número está espalhado pelo código.

| Premissa | Valor adotado | Onde alterar |
|---|---|---|
| Alíquota de referência total (IBS + CBS) | 26,5% | `transicao.ts` |
| Divisão da referência | CBS 8,8% · IBS 17,7% | `transicao.ts` |
| DAS total no cenário Tradicional | Inalterado na transição, exceto pela saída do IPI zerado | `motorSimulacao.ts` |
| Saída do DAS no cenário Híbrido | Apenas o que já foi substituído por IBS/CBS naquele ano | `motorSimulacao.ts` |
| Crédito no Tradicional | Limitado ao IBS/CBS embutido na guia | `motorSimulacao.ts` |
| Crédito no Híbrido | Integral, igual ao débito destacado na nota | `motorSimulacao.ts` |

Revalidar a cada ciclo anual, junto com as tabelas dos anexos.
