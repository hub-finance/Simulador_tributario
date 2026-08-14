# Convenções deste projeto

## Aba Ajuda — obrigatória em todo sistema

**Todo sistema construído para este usuário deve ter uma aba "Ajuda" didática.**

Não é uma página de FAQ técnica nem documentação de software. O objetivo é duplo:

1. **Quem opera o sistema entende o assunto**, não só os botões. Se a ferramenta calcula
   imposto, a Ajuda ensina o imposto.
2. **Quem opera consegue explicar para o cliente** — atual ou futuro. A Ajuda entrega a
   linguagem, as analogias e as respostas para as objeções que aparecem na reunião.

O que uma aba Ajuda precisa ter:

- **O assunto explicado do zero**, sem pressupor conhecimento prévio.
- **Glossário** de cada termo técnico que aparece na tela, com a tradução para linguagem
  de cliente ao lado da definição formal.
- **Exemplo numérico trabalhado**, calculado pelo próprio motor do sistema — nunca um
  número escrito à mão, que envelhece e passa a mentir.
- **Como ler cada número da tela**, campo a campo.
- **Como explicar ao cliente**: analogias prontas e respostas para as objeções comuns.
- **O que o sistema não faz**: premissas e limites declarados, para ninguém prometer o
  que a ferramenta não sustenta.

Regra de escrita: linguagem direta, sem jargão não explicado. Se um termo técnico é
inevitável, ele aparece uma vez com a explicação junto.

## Outras convenções

- Interface, documentação, nomes de variáveis, funções e commits em **português**.
- Regras de negócio ficam em `src/dominio/`, sem dependência de framework de interface,
  e são cobertas por teste.
- Parâmetros que mudam por lei (alíquotas, tabelas, prazos) ficam centralizados e
  documentados, nunca espalhados pelo código.
