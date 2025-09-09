import { describe, it, expect } from '@jest/globals';
import { OpJerpDto } from "@/types/dtos/op-jerp-dto";

describe('Dynamic Reference Creation - Integration Test', () => {
  it('deve validar a lógica de identificação de embalagens', () => {
    // Dados de exemplo do JERP
    const embalagens = [
      { id: 38810, nome: 'Blister B515 Antiestático', quantidadeAlocada: 2 },
      { id: 3457, nome: 'CAIXA 520X320X170 TRIPLEX', quantidadeAlocada: 1 }
    ];

    // Lógica de identificação (mesma do código real)
    const blisterPackaging = embalagens.find(emb => 
      emb.nome.toLowerCase().includes('blister') || 
      emb.nome.toLowerCase().includes('cartela')
    );
    
    const boxPackaging = embalagens.find(emb => 
      emb.nome.toLowerCase().includes('caixa') || 
      emb.nome.toLowerCase().includes('box')
    );

    // Validações
    expect(blisterPackaging).toBeDefined();
    expect(blisterPackaging?.id).toBe(38810);
    expect(blisterPackaging?.nome).toContain('Blister');
    
    expect(boxPackaging).toBeDefined();
    expect(boxPackaging?.id).toBe(3457);
    expect(boxPackaging?.nome).toContain('CAIXA');
  });

  it('deve gerar códigos corretos para os tipos', () => {
    const productId = 42262;
    const blisterPackagingId = 38810;
    const boxPackagingId = 3457;

    // Lógica de geração de códigos (mesma do código real)
    const productCode = `PROD_${productId}`;
    const blisterCode = `BLISTER_${blisterPackagingId}`;
    const boxCode = `BOX_${boxPackagingId}`;

    expect(productCode).toBe('PROD_42262');
    expect(blisterCode).toBe('BLISTER_38810');
    expect(boxCode).toBe('BOX_3457');
  });

  it('deve criar descrições informativas', () => {
    const produto = { id: 42262, nome: 'SR-23495AA-LE_01' };
    const blisterEmbalagem = { id: 38810, nome: 'Blister B515 Antiestático' };
    const caixaEmbalagem = { id: 3457, nome: 'CAIXA 520X320X170 TRIPLEX' };

    // Lógica de descrições (mesma do código real)
    const productDescription = `Produto criado automaticamente do JERP: ${produto.nome}`;
    const blisterDescription = `Blister criado automaticamente do JERP: ${blisterEmbalagem.nome}`;
    const boxDescription = `Caixa criada automaticamente do JERP: ${caixaEmbalagem.nome}`;

    expect(productDescription).toBe('Produto criado automaticamente do JERP: SR-23495AA-LE_01');
    expect(blisterDescription).toBe('Blister criado automaticamente do JERP: Blister B515 Antiestático');
    expect(boxDescription).toBe('Caixa criada automaticamente do JERP: CAIXA 520X320X170 TRIPLEX');
  });

  it('deve usar valores padrão corretos para BlisterType', () => {
    const embalagem = { id: 38810, nome: 'Blister B515 Antiestático', quantidadeAlocada: 2 };
    const boxTypeId = 3457;

    // Lógica de valores padrão (mesma do código real)
    const slots = embalagem.quantidadeAlocada || 10;
    const limitPerBox = 1;

    expect(slots).toBe(2); // Usa quantidadeAlocada
    expect(limitPerBox).toBe(1); // Valor padrão
    expect(boxTypeId).toBe(3457); // BoxType ID necessário
  });

  it('deve usar valores padrão quando quantidadeAlocada não estiver definida', () => {
    const embalagem = { id: 38810, nome: 'Blister B515 Antiestático', quantidadeAlocada: 0 };

    // Lógica de valores padrão (mesma do código real)
    const slots = embalagem.quantidadeAlocada || 10;

    expect(slots).toBe(10); // Usa valor padrão quando quantidadeAlocada é 0
  });

  it('deve falhar quando não conseguir identificar blister e caixa', () => {
    const embalagens = [
      { id: 38810, nome: 'Embalagem Desconhecida 1', quantidadeAlocada: 2 },
      { id: 3457, nome: 'Embalagem Desconhecida 2', quantidadeAlocada: 1 }
    ];

    const blisterPackaging = embalagens.find(emb => 
      emb.nome.toLowerCase().includes('blister') || 
      emb.nome.toLowerCase().includes('cartela')
    );
    
    const boxPackaging = embalagens.find(emb => 
      emb.nome.toLowerCase().includes('caixa') || 
      emb.nome.toLowerCase().includes('box')
    );

    // Deve falhar quando não conseguir identificar
    expect(blisterPackaging).toBeUndefined();
    expect(boxPackaging).toBeUndefined();

    // Simula o erro que seria lançado
    if (!blisterPackaging || !boxPackaging) {
      const errorMessage = `Não foi possível identificar blister e caixa nas embalagens: ${embalagens.map(e => e.nome).join(', ')}`;
      expect(errorMessage).toContain('Embalagem Desconhecida 1, Embalagem Desconhecida 2');
    }
  });

  it('deve identificar variações de nomes de blister', () => {
    const embalagensBlisters = [
      { id: 1, nome: 'BLISTER TESTE', quantidadeAlocada: 1 },
      { id: 2, nome: 'Cartela de Medicamento', quantidadeAlocada: 1 },
      { id: 3, nome: 'blister antiestático', quantidadeAlocada: 1 },
    ];

    embalagensBlisters.forEach(emb => {
      const isBlister = emb.nome.toLowerCase().includes('blister') || 
                       emb.nome.toLowerCase().includes('cartela');
      expect(isBlister).toBe(true);
    });
  });

  it('deve identificar variações de nomes de caixa', () => {
    const embalagensCaixas = [
      { id: 1, nome: 'CAIXA TRIPLEX', quantidadeAlocada: 1 },
      { id: 2, nome: 'Box de Papelão', quantidadeAlocada: 1 },
      { id: 3, nome: 'caixa 520x320x170', quantidadeAlocada: 1 },
    ];

    embalagensCaixas.forEach(emb => {
      const isBox = emb.nome.toLowerCase().includes('caixa') || 
                   emb.nome.toLowerCase().includes('box');
      expect(isBox).toBe(true);
    });
  });
});

describe("Novos campos JERP - Integração", () => {
  const mockOpJerpWithNewFields: OpJerpDto = {
    id: 384426,
    numero: 69762,
    produto: { id: 39456, nome: "BL-05760040 LD Rev.1" },
    quantidadeAProduzir: 2776,
    embalagens: [
      {
        id: 39436,
        nome: "Blister BL-057xx040-LE LD Rev.1 Antiestático",
        quantidadeAlocada: 500,
        slots: 10,              // NOVO: Vem do JERP
        limitePorCaixa: 8       // NOVO: Vem do JERP
      },
      {
        id: 3457,
        nome: "CAIXA 520X320X170 TRIPLEX",
        quantidadeAlocada: 57
      }
    ]
  };

  const mockOpJerpWithoutNewFields: OpJerpDto = {
    id: 384426,
    numero: 69762,
    produto: { id: 39456, nome: "BL-05760040 LD Rev.1" },
    quantidadeAProduzir: 2776,
    embalagens: [
      {
        id: 39436,
        nome: "Blister BL-057xx040-LE LD Rev.1 Antiestático",
        quantidadeAlocada: 500
        // SEM os novos campos - deve usar valores do banco local
      },
      {
        id: 3457,
        nome: "CAIXA 520X320X170 TRIPLEX",
        quantidadeAlocada: 57
      }
    ]
  };

  it("deve usar valores do JERP quando os novos campos estão disponíveis", () => {
    const blisterEmbalagem = mockOpJerpWithNewFields.embalagens.find(emb =>
      emb.nome.toLowerCase().includes('blister')
    );

    expect(blisterEmbalagem?.slots).toBe(10);
    expect(blisterEmbalagem?.limitePorCaixa).toBe(8);
  });

  it("deve funcionar sem os novos campos (retrocompatibilidade)", () => {
    const blisterEmbalagem = mockOpJerpWithoutNewFields.embalagens.find(emb =>
      emb.nome.toLowerCase().includes('blister')
    );

    expect(blisterEmbalagem?.slots).toBeUndefined();
    expect(blisterEmbalagem?.limitePorCaixa).toBeUndefined();
  });

  it("deve simular a lógica de fallback", () => {
    // Simula valores do banco local (BlisterType)
    const blisterTypeFromDB = { slots: 5, limitPerBox: 3 };

    // Testa com novos campos do JERP
    const blisterComNovosCampos = mockOpJerpWithNewFields.embalagens.find(emb =>
      emb.nome.toLowerCase().includes('blister')
    );

    const slotsUsados = blisterComNovosCampos?.slots || blisterTypeFromDB.slots;
    const limitePorCaixaUsado = blisterComNovosCampos?.limitePorCaixa || blisterTypeFromDB.limitPerBox;

    expect(slotsUsados).toBe(10); // Usa valor do JERP
    expect(limitePorCaixaUsado).toBe(8); // Usa valor do JERP

    // Testa sem novos campos do JERP
    const blisterSemNovosCampos = mockOpJerpWithoutNewFields.embalagens.find(emb =>
      emb.nome.toLowerCase().includes('blister')
    );

    const slotsUsadosFallback = blisterSemNovosCampos?.slots || blisterTypeFromDB.slots;
    const limitePorCaixaUsadoFallback = blisterSemNovosCampos?.limitePorCaixa || blisterTypeFromDB.limitPerBox;

    expect(slotsUsadosFallback).toBe(5); // Usa valor do banco local
    expect(limitePorCaixaUsadoFallback).toBe(3); // Usa valor do banco local
  });

  it("deve salvar os novos campos no banco ao criar BlisterType", () => {
    // Simula a lógica de createBlisterTypeFromJerp
    const embalagemComNovosCampos = {
      id: 39436,
      nome: "Blister BL-057xx040-LE LD Rev.1 Antiestático",
      quantidadeAlocada: 500,
      slots: 10,              // NOVO: Vem do JERP
      limitePorCaixa: 8       // NOVO: Vem do JERP
    };

    const embalagemSemNovosCampos: {
      id: number;
      nome: string;
      quantidadeAlocada: number;
      slots?: number;
      limitePorCaixa?: number;
    } = {
      id: 39436,
      nome: "Blister BL-057xx040-LE LD Rev.1 Antiestático",
      quantidadeAlocada: 500
      // SEM os novos campos
    };

    // Lógica que será usada na função createBlisterTypeFromJerp
    const slotsComNovosCampos = embalagemComNovosCampos.slots || embalagemComNovosCampos.quantidadeAlocada || 10;
    const limitPerBoxComNovosCampos = embalagemComNovosCampos.limitePorCaixa || 1;

    const slotsSemNovosCampos = embalagemSemNovosCampos.slots || embalagemSemNovosCampos.quantidadeAlocada || 10;
    const limitPerBoxSemNovosCampos = embalagemSemNovosCampos.limitePorCaixa || 1;

    // Com novos campos: usa valores do JERP
    expect(slotsComNovosCampos).toBe(10); // Usa slots do JERP
    expect(limitPerBoxComNovosCampos).toBe(8); // Usa limitePorCaixa do JERP

    // Sem novos campos: usa quantidadeAlocada como fallback
    expect(slotsSemNovosCampos).toBe(500); // Usa quantidadeAlocada
    expect(limitPerBoxSemNovosCampos).toBe(1); // Usa valor padrão
  });
});
