import { describe, expect, it, vi } from 'vitest';
import {
  anexoSugeridoPorCnae,
  consultarCnpj,
  extrairDados,
  formatarCnpj,
  normalizarCnpj,
  preencherComDadosDaReceita,
  validarCnpj,
} from '../consultaCnpj';
import { chaveDoSocio, sincronizarGruposEconomicos, vinculosDoCliente } from '../grupoEconomico';
import { clienteVazio, type Cliente } from '../tipos';

/** Resposta representativa da BrasilAPI, no formato documentado do endpoint de CNPJ. */
const RESPOSTA = {
  cnpj: '19131243000197',
  razao_social: 'OPEN KNOWLEDGE BRASIL',
  nome_fantasia: 'REDE PELO CONHECIMENTO LIVRE',
  cnae_fiscal: 9430800,
  cnae_fiscal_descricao: 'Atividades de associações de defesa de direitos sociais',
  descricao_situacao_cadastral: 'ATIVA',
  porte: 'DEMAIS',
  municipio: 'SAO PAULO',
  uf: 'SP',
  opcao_pelo_simples: false,
  opcao_pelo_mei: false,
  data_opcao_pelo_simples: null,
  qsa: [
    { nome_socio: 'FERNANDA CAMPAGNUCCI PEREIRA', qualificacao_socio: 'Diretor' },
    { nome_socio: 'NATALIA MAZOTTE CORTEZ', qualificacao_socio: 'Presidente' },
  ],
};

function resposta(corpo: unknown, status = 200) {
  return {
    ok: status >= 200 && status < 300,
    status,
    json: async () => corpo,
  } as Response;
}

describe('normalização e formatação', () => {
  it('remove tudo que não é dígito', () => {
    expect(normalizarCnpj('19.131.243/0001-97')).toBe('19131243000197');
    expect(normalizarCnpj('  19131243000197  ')).toBe('19131243000197');
  });

  it('formata progressivamente enquanto digita', () => {
    expect(formatarCnpj('19')).toBe('19');
    expect(formatarCnpj('19131')).toBe('19.131');
    expect(formatarCnpj('19131243')).toBe('19.131.243');
    expect(formatarCnpj('191312430001')).toBe('19.131.243/0001');
    expect(formatarCnpj('19131243000197')).toBe('19.131.243/0001-97');
  });

  it('ignora dígitos além dos 14', () => {
    expect(formatarCnpj('191312430001979999')).toBe('19.131.243/0001-97');
  });
});

describe('validação dos dígitos verificadores', () => {
  it('aceita CNPJ válido, com ou sem máscara', () => {
    expect(validarCnpj('19131243000197')).toBe(true);
    expect(validarCnpj('19.131.243/0001-97')).toBe(true);
    expect(validarCnpj('33.000.167/0001-01')).toBe(true);
  });

  it('rejeita dígito verificador errado', () => {
    expect(validarCnpj('19131243000198')).toBe(false);
    expect(validarCnpj('19131243000187')).toBe(false);
  });

  it('rejeita tamanho incorreto e sequências repetidas', () => {
    expect(validarCnpj('1913124300019')).toBe(false);
    expect(validarCnpj('')).toBe(false);
    expect(validarCnpj('11111111111111')).toBe(false);
    expect(validarCnpj('00000000000000')).toBe(false);
  });
});

describe('extração da resposta', () => {
  it('lê os campos de interesse', () => {
    const d = extrairDados(RESPOSTA)!;
    expect(d.razaoSocial).toBe('OPEN KNOWLEDGE BRASIL');
    expect(d.cnaePrincipal).toBe('9430800');
    expect(d.situacaoCadastral).toBe('ATIVA');
    expect(d.cadastroIrregular).toBe(false);
    expect(d.uf).toBe('SP');
    expect(d.optantePeloSimples).toBe(false);
    expect(d.socios.map((s) => s.nome)).toEqual([
      'FERNANDA CAMPAGNUCCI PEREIRA',
      'NATALIA MAZOTTE CORTEZ',
    ]);
  });

  it('marca cadastro irregular quando a situação não é ATIVA', () => {
    expect(extrairDados({ ...RESPOSTA, descricao_situacao_cadastral: 'BAIXADA' })!.cadastroIrregular).toBe(true);
    expect(extrairDados({ ...RESPOSTA, descricao_situacao_cadastral: 'SUSPENSA' })!.cadastroIrregular).toBe(true);
  });

  it('não marca irregular quando a situação vem vazia', () => {
    const d = extrairDados({ ...RESPOSTA, descricao_situacao_cadastral: '' })!;
    expect(d.situacaoCadastral).toBe('DESCONHECIDA');
    expect(d.cadastroIrregular).toBe(false);
  });

  it('tolera campos ausentes sem quebrar', () => {
    const d = extrairDados({ cnpj: '19131243000197' })!;
    expect(d.razaoSocial).toBe('');
    expect(d.socios).toEqual([]);
    expect(d.optantePeloSimples).toBeNull();
  });

  it('aceita "Sim"/"Não" no lugar de booleano', () => {
    expect(extrairDados({ ...RESPOSTA, opcao_pelo_simples: 'Sim' })!.optantePeloSimples).toBe(true);
    expect(extrairDados({ ...RESPOSTA, opcao_pelo_simples: 'Não' })!.optantePeloSimples).toBe(false);
  });

  it('devolve nulo para payload que não é objeto ou vem vazio', () => {
    expect(extrairDados(null)).toBeNull();
    expect(extrairDados('texto')).toBeNull();
    expect(extrairDados({})).toBeNull();
  });
});

describe('consulta', () => {
  it('devolve os dados quando o serviço responde', async () => {
    const buscar = vi.fn().mockResolvedValue(resposta(RESPOSTA));
    const r = await consultarCnpj('19.131.243/0001-97', buscar);
    expect(r.estado).toBe('ok');
    expect(buscar).toHaveBeenCalledWith(
      'https://brasilapi.com.br/api/cnpj/v1/19131243000197',
      expect.objectContaining({ headers: { Accept: 'application/json' } }),
    );
  });

  it('não vai à rede com CNPJ inválido', async () => {
    const buscar = vi.fn();
    const r = await consultarCnpj('19131243000198', buscar);
    expect(r).toEqual({ estado: 'invalido', motivo: 'Dígitos verificadores não conferem — confira a digitação.' });
    expect(buscar).not.toHaveBeenCalled();
  });

  it('exige os 14 dígitos', async () => {
    const buscar = vi.fn();
    const r = await consultarCnpj('191312', buscar);
    expect(r.estado).toBe('invalido');
    expect(buscar).not.toHaveBeenCalled();
  });

  it('trata 404 como não encontrado', async () => {
    const r = await consultarCnpj('19131243000197', vi.fn().mockResolvedValue(resposta({}, 404)));
    expect(r.estado).toBe('nao-encontrado');
  });

  it('trata 429 com mensagem de limite', async () => {
    const r = await consultarCnpj('19131243000197', vi.fn().mockResolvedValue(resposta({}, 429)));
    expect(r).toMatchObject({ estado: 'indisponivel' });
    if (r.estado === 'indisponivel') expect(r.motivo).toContain('limite de consultas');
  });

  it('falha de rede não lança, vira indisponível', async () => {
    const r = await consultarCnpj('19131243000197', vi.fn().mockRejectedValue(new TypeError('Failed to fetch')));
    expect(r).toMatchObject({ estado: 'indisponivel' });
    if (r.estado === 'indisponivel') expect(r.motivo).toContain('não foi possível alcançar');
  });

  it('resposta em formato inesperado vira indisponível', async () => {
    const r = await consultarCnpj('19131243000197', vi.fn().mockResolvedValue(resposta({ erro: 'x' })));
    expect(r).toMatchObject({ estado: 'indisponivel' });
  });

  it('sem fetch no ambiente, avisa em vez de quebrar', async () => {
    const r = await consultarCnpj('19131243000197', undefined as unknown as typeof fetch);
    expect(r).toMatchObject({ estado: 'indisponivel' });
  });
});

describe('sugestão de anexo pelo CNAE', () => {
  it('indústria vai para o Anexo II', () => {
    expect(anexoSugeridoPorCnae('2599399')?.anexo).toBe(2);
    expect(anexoSugeridoPorCnae('1091101')?.anexo).toBe(2);
  });

  it('comércio vai para o Anexo I', () => {
    expect(anexoSugeridoPorCnae('4711302')?.anexo).toBe(1);
    expect(anexoSugeridoPorCnae('4530703')?.anexo).toBe(1);
  });

  it('construção civil, advocacia, vigilância e limpeza vão para o Anexo IV', () => {
    expect(anexoSugeridoPorCnae('4120400')?.anexo).toBe(4);
    expect(anexoSugeridoPorCnae('6911701')?.anexo).toBe(4);
    expect(anexoSugeridoPorCnae('8011101')?.anexo).toBe(4);
    expect(anexoSugeridoPorCnae('8121400')?.anexo).toBe(4);
  });

  it('o Anexo IV não fica sujeito ao Fator R', () => {
    expect(anexoSugeridoPorCnae('4120400')?.sujeitoAoFatorR).toBe(false);
  });

  it('serviços do Fator R saem no Anexo III com a chave ligada', () => {
    for (const cnae of ['6201501', '7020400', '7112000', '8630501', '6920601']) {
      const s = anexoSugeridoPorCnae(cnae)!;
      expect(s.anexo, cnae).toBe(3);
      expect(s.sujeitoAoFatorR, cnae).toBe(true);
    }
  });

  it('demais serviços saem no Anexo III sem Fator R', () => {
    const s = anexoSugeridoPorCnae('5611201')!;
    expect(s.anexo).toBe(3);
    expect(s.sujeitoAoFatorR).toBe(false);
  });

  it('CNAE muito curto não gera sugestão', () => {
    expect(anexoSugeridoPorCnae('4')).toBeNull();
    expect(anexoSugeridoPorCnae('')).toBeNull();
  });
});

describe('preenchimento do cadastro', () => {
  it('preenche identificação e sócios, sem tocar nos números da simulação', () => {
    const { alteracoes } = preencherComDadosDaReceita(extrairDados(RESPOSTA)!);
    expect(alteracoes.nome).toBe('OPEN KNOWLEDGE BRASIL');
    expect(alteracoes.cnpj).toBe('19.131.243/0001-97');
    expect(alteracoes.cnae).toBe('9430800');
    expect(alteracoes.socios).toHaveLength(2);
    // Os números que sustentam o cálculo não vêm da Receita.
    expect(alteracoes).not.toHaveProperty('rbt12');
    expect(alteracoes).not.toHaveProperty('faturamentoMensal');
    expect(alteracoes).not.toHaveProperty('insumosTributaveis');
    expect(alteracoes).not.toHaveProperty('folha12Meses');
  });

  it('situação irregular vira pendência cadastral', () => {
    const dados = extrairDados({ ...RESPOSTA, descricao_situacao_cadastral: 'BAIXADA' })!;
    const { alteracoes, avisos } = preencherComDadosDaReceita(dados);
    expect(alteracoes.possuiPendenciasCadastrais).toBe(true);
    expect(avisos.join(' ')).toContain('BAIXADA');
  });

  it('situação ativa não marca pendência', () => {
    const { alteracoes } = preencherComDadosDaReceita(extrairDados(RESPOSTA)!);
    expect(alteracoes.possuiPendenciasCadastrais).toBeUndefined();
  });

  it('avisa quando a empresa não é optante do Simples', () => {
    const { avisos } = preencherComDadosDaReceita(extrairDados(RESPOSTA)!);
    expect(avisos.join(' ')).toContain('não consta como optante do Simples');
  });

  it('avisa quando a empresa é MEI', () => {
    const dados = extrairDados({ ...RESPOSTA, opcao_pelo_mei: true })!;
    expect(preencherComDadosDaReceita(dados).avisos.join(' ')).toContain('MEI');
  });
});

describe('grupo econômico por sócio em comum', () => {
  const comSocios = (id: string, nome: string, socios: string[], rbt12 = 1_000_000): Cliente => ({
    ...clienteVazio(id),
    nome,
    cnpj: `${id}-cnpj`,
    socios,
    rbt12,
  });

  it('normaliza acento, pontuação e caixa antes de comparar', () => {
    expect(chaveDoSocio('José da Silva')).toBe(chaveDoSocio('JOSE  DA SILVA'));
    expect(chaveDoSocio('Maria D`Ávila')).toBe(chaveDoSocio('MARIA D AVILA'));
  });

  it('encontra os clientes que compartilham sócio', () => {
    const a = comSocios('a', 'Alfa', ['José da Silva', 'Ana Souza']);
    const b = comSocios('b', 'Beta', ['JOSE DA SILVA']);
    const c = comSocios('c', 'Gama', ['Carlos Lima']);

    const vinculos = vinculosDoCliente(a, [a, b, c]);
    expect(vinculos).toHaveLength(1);
    expect(vinculos[0].cliente.nome).toBe('Beta');
    expect(vinculos[0].sociosEmComum).toEqual(['José da Silva']);
  });

  it('não vincula o cliente a ele mesmo', () => {
    const a = comSocios('a', 'Alfa', ['José da Silva']);
    expect(vinculosDoCliente(a, [a])).toHaveLength(0);
  });

  it('cliente sem sócios cadastrados não gera vínculo', () => {
    const a = comSocios('a', 'Alfa', []);
    const b = comSocios('b', 'Beta', ['José da Silva']);
    expect(vinculosDoCliente(a, [a, b])).toHaveLength(0);
  });

  it('sincroniza a carteira inteira', () => {
    const carteira = [
      comSocios('a', 'Alfa', ['José da Silva'], 2_000_000),
      comSocios('b', 'Beta', ['José da Silva'], 2_500_000),
      comSocios('c', 'Gama', ['Carlos Lima'], 500_000),
    ];
    const sincronizada = sincronizarGruposEconomicos(carteira);

    expect(sincronizada[0].cnpjsInterligados.map((c) => c.nome)).toEqual(['Beta']);
    expect(sincronizada[1].cnpjsInterligados.map((c) => c.nome)).toEqual(['Alfa']);
    expect(sincronizada[2].cnpjsInterligados).toHaveLength(0);
    // O RBT12 do vinculado vem junto, para somar o faturamento global do grupo.
    expect(sincronizada[0].cnpjsInterligados[0].rbt12).toBe(2_500_000);
  });

  it('preserva vínculos digitados à mão em cliente sem sócios', () => {
    const manual: Cliente = {
      ...clienteVazio('m'),
      nome: 'Manual',
      socios: [],
      cnpjsInterligados: [{ cnpj: '00.000.000/0001-00', nome: 'Coligada', rbt12: 100 }],
    };
    const [resultado] = sincronizarGruposEconomicos([manual]);
    expect(resultado.cnpjsInterligados).toHaveLength(1);
  });

  it('devolve a mesma referência quando nada muda, para não disparar re-render', () => {
    const carteira = [comSocios('a', 'Alfa', ['José da Silva'])];
    const uma = sincronizarGruposEconomicos(carteira);
    const outra = sincronizarGruposEconomicos(uma);
    expect(outra[0]).toBe(uma[0]);
  });
});
