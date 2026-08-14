import { describe, expect, it } from 'vitest';
import { CABECALHO_CSV, exportarCsv, importarCsv } from '../armazenamento';
import { clienteVazio } from '../tipos';

describe('importação de carteira via CSV', () => {
  it('lê uma linha completa com cabeçalho', () => {
    const csv = `${CABECALHO_CSV}
Metalúrgica Aurora Ltda;12.345.678/0001-90;2599-3/99;2;B2B;100;2400000;210000;96000;420000`;
    const { clientes, importados, erros } = importarCsv(csv);

    expect(importados).toBe(1);
    expect(erros).toHaveLength(0);
    expect(clientes[0]).toMatchObject({
      nome: 'Metalúrgica Aurora Ltda',
      cnpj: '12.345.678/0001-90',
      anexo: 2,
      perfil: 'B2B',
      percentualReceitaB2B: 1,
      rbt12: 2_400_000,
      faturamentoMensal: 210_000,
      insumosTributaveis: 96_000,
      folha12Meses: 420_000,
    });
  });

  it('funciona sem linha de cabeçalho', () => {
    const { importados, clientes } = importarCsv('Loja X;;;1;B2C;;500000;40000;20000;60000');
    expect(importados).toBe(1);
    expect(clientes[0].nome).toBe('Loja X');
  });

  it('aceita números no formato brasileiro', () => {
    const { clientes } = importarCsv('Loja Y;;;1;B2C;;1.234.567,89;98.000,50;0;0');
    expect(clientes[0].rbt12).toBeCloseTo(1_234_567.89, 2);
    expect(clientes[0].faturamentoMensal).toBeCloseTo(98_000.5, 2);
  });

  it('aceita percentual B2B como fração ou como inteiro', () => {
    expect(importarCsv('A;;;1;MISTO;0,7;100;10;0;0').clientes[0].percentualReceitaB2B).toBeCloseTo(0.7, 6);
    expect(importarCsv('B;;;1;MISTO;70;100;10;0;0').clientes[0].percentualReceitaB2B).toBeCloseTo(0.7, 6);
    expect(importarCsv('C;;;1;MISTO;150;100;10;0;0').clientes[0].percentualReceitaB2B).toBe(1);
  });

  it('deriva o percentual B2B do perfil quando não informado', () => {
    expect(importarCsv('A;;;1;B2B;;100;10;0;0').clientes[0].percentualReceitaB2B).toBe(1);
    expect(importarCsv('B;;;1;B2C;;100;10;0;0').clientes[0].percentualReceitaB2B).toBe(0);
    expect(importarCsv('C;;;1;MISTO;;100;10;0;0').clientes[0].percentualReceitaB2B).toBe(0.5);
  });

  it('normaliza perfil e anexo inválidos', () => {
    const { clientes } = importarCsv('Loja Z;;;9;XPTO;;100;10;0;0');
    expect(clientes[0].anexo).toBe(1);
    expect(clientes[0].perfil).toBe('B2C');
  });

  it('ignora linhas sem nome e reporta o erro', () => {
    const { importados, erros } = importarCsv('Loja A;;;1;B2C;;100;10;0;0\n;;;1;B2C;;100;10;0;0');
    expect(importados).toBe(1);
    expect(erros.some((e) => e.includes('nome ausente'))).toBe(true);
  });

  it('avisa quando o RBT12 vem zerado', () => {
    const { erros } = importarCsv('Loja B;;;1;B2C;;0;10000;0;0');
    expect(erros.some((e) => e.includes('RBT12 zerado'))).toBe(true);
  });

  it('trata arquivo vazio sem quebrar', () => {
    const { importados, erros } = importarCsv('   \n  \n');
    expect(importados).toBe(0);
    expect(erros).toEqual(['Arquivo vazio.']);
  });

  it('cada cliente importado recebe um id próprio', () => {
    const { clientes } = importarCsv('A;;;1;B2C;;100;10;0;0\nB;;;1;B2C;;100;10;0;0');
    expect(clientes[0].id).not.toBe(clientes[1].id);
  });
});

describe('exportação de carteira', () => {
  it('gera CSV com cabeçalho e uma linha por cliente', () => {
    const cliente = { ...clienteVazio('id-1'), nome: 'Loja A', rbt12: 500_000, perfil: 'B2B' as const };
    const linhas = exportarCsv([cliente]).split('\n');
    expect(linhas[0]).toBe(CABECALHO_CSV);
    expect(linhas[1]).toContain('Loja A');
    expect(linhas[1]).toContain('500000.00');
  });

  it('exportar e reimportar preserva os valores', () => {
    const original = {
      ...clienteVazio('id-1'),
      nome: 'Consultoria Vertice SS',
      cnpj: '45.678.912/0001-33',
      anexo: 5 as const,
      perfil: 'MISTO' as const,
      percentualReceitaB2B: 0.7,
      rbt12: 860_000,
      faturamentoMensal: 74_000,
      insumosTributaveis: 8_500,
      folha12Meses: 196_000,
    };
    const { clientes } = importarCsv(exportarCsv([original]));
    expect(clientes[0]).toMatchObject({
      nome: original.nome,
      cnpj: original.cnpj,
      anexo: original.anexo,
      perfil: original.perfil,
      percentualReceitaB2B: original.percentualReceitaB2B,
      rbt12: original.rbt12,
      faturamentoMensal: original.faturamentoMensal,
      insumosTributaveis: original.insumosTributaveis,
      folha12Meses: original.folha12Meses,
    });
  });
});
