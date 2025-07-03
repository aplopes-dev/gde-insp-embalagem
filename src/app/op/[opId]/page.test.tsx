import { render, act } from '@testing-library/react';
import { useRouter } from 'next/navigation';
import { OpStatus } from '@prisma/client';
import '@testing-library/jest-dom';

// Mock dos hooks e dependências
jest.mock('next/navigation', () => ({
  useRouter: jest.fn(),
}));

jest.mock('@/hooks/use-socket-detection', () => ({
  useSocketDetection: jest.fn(() => ({ socket: true })),
}));

jest.mock('@/hooks/use-socket-emmiter', () => ({
  useSocketEmmiter: jest.fn(() => ({ sendSocketEvent: jest.fn() })),
}));

jest.mock('@/shared/services/rabbitmq', () => ({
  sendMessageToRabbitMq: jest.fn(),
  sendMessageToRabbitMqMobile: jest.fn(),
}));

jest.mock('./actions', () => ({
  syncAndGetOpToProduceById: jest.fn().mockResolvedValue({
    id: 123,
    opCode: 'OP-123',
    status: 'PENDING',
    finishedAt: null,
    nextBox: {
      id: '1',
      OpBoxBlister: [
        { id: 1, quantity: 10, packedAt: null }
      ]
    },
    blisterCodes: ['BL001'],
    totalBoxes: 5,
    pendingBoxes: 3,
    quantityToProduce: 100,
    itemsPacked: 50,
    productType: { name: 'Product A', code: 'PA', description: 'Product A' },
    boxType: { name: 'Box A', description: 'Box A' },
    blisterType: { name: 'Blister A' },
    createdAt: new Date(),
  }),
  persistBoxStatusWithBlisters: jest.fn().mockResolvedValue({}),
  persistWithOpBreak: jest.fn().mockResolvedValue({}),
  opCompletionNowHandler: jest.fn().mockResolvedValue(true),
}));

// Importar o componente após os mocks
import PackagingInspection from './page';

// Funções utilitárias extraídas para teste
export function getStatusVariant(status?: OpStatus) {
  switch (status) {
    case OpStatus.COMPLETED:
      return "success";
    default:
      return "default";
  }
}

export function getStatusName(status?: OpStatus) {
  switch (status) {
    case OpStatus.COMPLETED:
      return "Concluído";
    case OpStatus.PENDING:
      return "Pendente";
    default:
      return "Indefinidos";
  }
}

export function configLastBlisterQuantity(
  quantity: number,
  managerId: string,
  context: {
    targetBlister: number;
    blisters: Array<{ quantity: number }>;
    data: { productType: { name: string }; opId: string };
    box: { id: string };
    blisterCodes: string[];
    setQuantityInBox: (value: number) => void;
    setCheckedQuantity: (value: number) => void;
    setBlisters: (value: any[]) => void;
    setOpBrakeManagerId: (value: string) => void;
    setVisorMessage: (message: string, color: string) => void;
    sendValidation: (validation: any) => void;
  }
) {
  const index = context.targetBlister || 0;

  if (quantity <= context.blisters[index].quantity) {
    const itemId = context.data?.productType.name;
    let fileName: string = `OP_${context.data?.opId}_BOX_${context.box?.id}_BL_${
      context.blisterCodes[context.targetBlister!]
    }`;
    const newBlisters = [...context.blisters.slice(0, index + 1)];
    newBlisters[index].quantity = quantity;

    const itemQuantity = newBlisters.reduce(
      (total, blister) => total + blister.quantity,
      0
    );
    const checkQuantity =
      newBlisters
        ?.filter((bl: any) => bl.packedAt)
        .reduce((total, blister) => total + blister.quantity, 0) || 0;

    context.setQuantityInBox(itemQuantity);
    context.setCheckedQuantity(checkQuantity);
    context.setBlisters(newBlisters);
    context.setOpBrakeManagerId(managerId);
    context.sendValidation({ itemId, quantity, fileName });
  } else {
    context.setVisorMessage("QUANTIDADE DEVE SER MENOR OU IGUAL À ATUAL!", "red");
  }
}

export function handleOpBoxBreak(context: {
  step: number;
  blisters: Array<{ packedAt: Date | null }>;
  data: { finishedAt: Date | null };
  setVisorMessage: (message: string, color: string) => void;
  setOpenForceFinalizationDialog: (value: boolean) => void;
}) {
  const issetPendingBlister = context.blisters.find(bl => !bl.packedAt);
  
  if (context.step != 2) {
    context.setVisorMessage("Deve estar na validação de quantidade!", "red");
  } else if (context.blisters?.length <= 0) {
    context.setVisorMessage("Não existem blisters disponíveis!", "red");
  } else if (!issetPendingBlister) {
    context.setVisorMessage("Todos os itens já foram embalados!", "red");
  } else if (context.data?.finishedAt) {
    context.setVisorMessage("OP já foi finalizada!", "red");
  } else {
    context.setOpenForceFinalizationDialog(true);
  }
}

describe('PackagingInspection - Utility Functions', () => {
  describe('getStatusVariant', () => {
    it('deve retornar "success" para status COMPLETED', () => {
      expect(getStatusVariant(OpStatus.COMPLETED)).toBe('success');
    });

    it('deve retornar "default" para status PENDING', () => {
      expect(getStatusVariant(OpStatus.PENDING)).toBe('default');
    });

    it('deve retornar "default" para status undefined', () => {
      expect(getStatusVariant(undefined)).toBe('default');
    });
  });

  describe('getStatusName', () => {
    it('deve retornar "Concluído" para status COMPLETED', () => {
      expect(getStatusName(OpStatus.COMPLETED)).toBe('Concluído');
    });

    it('deve retornar "Pendente" para status PENDING', () => {
      expect(getStatusName(OpStatus.PENDING)).toBe('Pendente');
    });

    it('deve retornar "Indefinidos" para status undefined', () => {
      expect(getStatusName(undefined)).toBe('Indefinidos');
    });
  });

  describe('configLastBlisterQuantity', () => {
    let mockContext: any;

    beforeEach(() => {
      mockContext = {
        targetBlister: 0,
        blisters: [{ quantity: 10 }, { quantity: 8 }],
        data: { productType: { name: 'Product A' }, opId: '123' },
        box: { id: 'box1' },
        blisterCodes: ['BL001', 'BL002'],
        setQuantityInBox: jest.fn(),
        setCheckedQuantity: jest.fn(),
        setBlisters: jest.fn(),
        setOpBrakeManagerId: jest.fn(),
        setVisorMessage: jest.fn(),
        sendValidation: jest.fn(),
      };
    });

    it('deve aceitar quantidade igual à atual', () => {
      configLastBlisterQuantity(10, 'manager123', mockContext);

      expect(mockContext.setOpBrakeManagerId).toHaveBeenCalledWith('manager123');
      expect(mockContext.sendValidation).toHaveBeenCalledWith({
        itemId: 'Product A',
        quantity: 10,
        fileName: 'OP_123_BOX_box1_BL_BL001'
      });
      expect(mockContext.setVisorMessage).not.toHaveBeenCalled();
    });

    it('deve aceitar quantidade menor que a atual', () => {
      configLastBlisterQuantity(8, 'manager123', mockContext);

      expect(mockContext.setOpBrakeManagerId).toHaveBeenCalledWith('manager123');
      expect(mockContext.sendValidation).toHaveBeenCalledWith({
        itemId: 'Product A',
        quantity: 8,
        fileName: 'OP_123_BOX_box1_BL_BL001'
      });
      expect(mockContext.setVisorMessage).not.toHaveBeenCalled();
    });

    it('deve rejeitar quantidade maior que a atual', () => {
      configLastBlisterQuantity(15, 'manager123', mockContext);

      expect(mockContext.setVisorMessage).toHaveBeenCalledWith(
        "QUANTIDADE DEVE SER MENOR OU IGUAL À ATUAL!",
        "red"
      );
      expect(mockContext.setOpBrakeManagerId).not.toHaveBeenCalled();
      expect(mockContext.sendValidation).not.toHaveBeenCalled();
    });

    it('deve calcular corretamente a quantidade total', () => {
      configLastBlisterQuantity(5, 'manager123', mockContext);

      expect(mockContext.setQuantityInBox).toHaveBeenCalledWith(5);
      expect(mockContext.setBlisters).toHaveBeenCalledWith([{ quantity: 5 }]);
    });
  });

  describe('handleOpBoxBreak', () => {
    let mockContext: any;

    beforeEach(() => {
      mockContext = {
        step: 2,
        blisters: [{ packedAt: null }, { packedAt: new Date() }],
        data: { finishedAt: null },
        setVisorMessage: jest.fn(),
        setOpenForceFinalizationDialog: jest.fn(),
      };
    });

    it('deve abrir dialog quando todas as condições são válidas', () => {
      handleOpBoxBreak(mockContext);

      expect(mockContext.setOpenForceFinalizationDialog).toHaveBeenCalledWith(true);
      expect(mockContext.setVisorMessage).not.toHaveBeenCalled();
    });

    it('deve rejeitar quando não está no step correto', () => {
      mockContext.step = 1;
      
      handleOpBoxBreak(mockContext);

      expect(mockContext.setVisorMessage).toHaveBeenCalledWith(
        "Deve estar na validação de quantidade!",
        "red"
      );
      expect(mockContext.setOpenForceFinalizationDialog).not.toHaveBeenCalled();
    });

    it('deve rejeitar quando não há blisters', () => {
      mockContext.blisters = [];
      
      handleOpBoxBreak(mockContext);

      expect(mockContext.setVisorMessage).toHaveBeenCalledWith(
        "Não existem blisters disponíveis!",
        "red"
      );
    });

    it('deve rejeitar quando todos os blisters já foram embalados', () => {
      mockContext.blisters = [{ packedAt: new Date() }, { packedAt: new Date() }];
      
      handleOpBoxBreak(mockContext);

      expect(mockContext.setVisorMessage).toHaveBeenCalledWith(
        "Todos os itens já foram embalados!",
        "red"
      );
    });

    it('deve rejeitar quando OP já foi finalizada', () => {
      mockContext.data.finishedAt = new Date();
      
      handleOpBoxBreak(mockContext);

      expect(mockContext.setVisorMessage).toHaveBeenCalledWith(
        "OP já foi finalizada!",
        "red"
      );
    });
  });
});

export function mountInspecionState(
  boxData: any,
  blisterCodesInUse: string[],
  context: {
    setBlisterCodes: (codes: string[]) => void;
    setBlisters: (blisters: any[]) => void;
    setQuantityInBox: (quantity: number) => void;
    setCheckedQuantity: (quantity: number) => void;
    setActiveObjectType: (type: string) => void;
    setBox: (box: any) => void;
  }
) {
  if (!boxData) throw Error("Falha ao carregar caixa");
  if (!boxData.OpBoxBlister) throw Error("Falha ao carregar blisters");
  if (!blisterCodesInUse) throw Error("Falha ao carregar blisters em uso");

  const itemQuantity = boxData.OpBoxBlister.reduce((total: number, blister: any) => {
    return total + blister.quantity;
  }, 0);

  const checkQuantity = boxData.OpBoxBlister?.filter(
    (bl: any) => bl.packedAt
  ).reduce((total: number, blister: any) => {
    return total + blister.quantity;
  }, 0);

  context.setBlisterCodes(blisterCodesInUse);
  context.setBlisters(boxData.OpBoxBlister);
  context.setQuantityInBox(itemQuantity);
  context.setCheckedQuantity(checkQuantity);
  context.setActiveObjectType("box");
  context.setBox({
    ...boxData,
    status: 'PENDING',
  });
}

export function verifyNextBlisterOrFinalize(
  inspection: { count: number },
  context: {
    targetBlister: number;
    blisters: Array<{ quantity: number; packedAt?: Date }>;
    checkedQuantity: number;
    opBrakeManagerId?: string;
    setTargetBlister: (index: number | undefined) => void;
    setActiveObjectType: (type: string | undefined) => void;
    setStep: (step: number) => void;
    setCheckedQuantity: (quantity: number) => void;
    setBlisters: (blisters: any[]) => void;
    setVisorMessage: (message: string, color: string) => void;
    sendValidation: (validation: any) => void;
    forceOpFinalization: (managerId: string, blisters: any[]) => void;
    persistBoxInspection: (blisters: any[]) => void;
    data?: { blisterType: { name: string } };
  }
) {
  const index = context.targetBlister || 0;
  const updatedBlisters = context.blisters.map((bl, i) =>
    i == index
      ? {
          ...bl,
          isValidQuantity: true,
          status: 1,
          packedAt: new Date(),
        }
      : bl
  );

  context.setCheckedQuantity(context.checkedQuantity + inspection.count);
  context.setBlisters(updatedBlisters);

  if (context.blisters[index + 1]) {
    context.setTargetBlister(index + 1);
    context.setActiveObjectType("blister");
    context.setStep(1);
    context.setVisorMessage("POSICIONE UM NOVO BLISTER", "blue");
    context.sendValidation({
      quantity: 1,
      itemId: context.data?.blisterType.name,
    });
  } else {
    context.setTargetBlister(undefined);
    context.setActiveObjectType(undefined);
    context.setStep(3);

    if (context.opBrakeManagerId) {
      context.forceOpFinalization(context.opBrakeManagerId, updatedBlisters);
    } else {
      context.persistBoxInspection(updatedBlisters);
    }
  }
}

describe('PackagingInspection - Additional Functions', () => {
  describe('mountInspecionState', () => {
    let mockContext: any;

    beforeEach(() => {
      mockContext = {
        setBlisterCodes: jest.fn(),
        setBlisters: jest.fn(),
        setQuantityInBox: jest.fn(),
        setCheckedQuantity: jest.fn(),
        setActiveObjectType: jest.fn(),
        setBox: jest.fn(),
      };
    });

    it('deve configurar estado de inspeção corretamente', () => {
      const boxData = {
        id: 'box1',
        OpBoxBlister: [
          { quantity: 10, packedAt: null },
          { quantity: 8, packedAt: new Date() }
        ]
      };
      const blisterCodes = ['BL001', 'BL002'];

      mountInspecionState(boxData, blisterCodes, mockContext);

      expect(mockContext.setBlisterCodes).toHaveBeenCalledWith(blisterCodes);
      expect(mockContext.setBlisters).toHaveBeenCalledWith(boxData.OpBoxBlister);
      expect(mockContext.setQuantityInBox).toHaveBeenCalledWith(18); // 10 + 8
      expect(mockContext.setCheckedQuantity).toHaveBeenCalledWith(8); // apenas o empacotado
      expect(mockContext.setActiveObjectType).toHaveBeenCalledWith("box");
    });

    it('deve lançar erro quando boxData é null', () => {
      expect(() => {
        mountInspecionState(null, ['BL001'], mockContext);
      }).toThrow("Falha ao carregar caixa");
    });

    it('deve lançar erro quando OpBoxBlister é null', () => {
      const boxData = { id: 'box1', OpBoxBlister: null };

      expect(() => {
        mountInspecionState(boxData, ['BL001'], mockContext);
      }).toThrow("Falha ao carregar blisters");
    });

    it('deve lançar erro quando blisterCodesInUse é null', () => {
      const boxData = { id: 'box1', OpBoxBlister: [] };

      expect(() => {
        mountInspecionState(boxData, null as any, mockContext);
      }).toThrow("Falha ao carregar blisters em uso");
    });
  });

  describe('verifyNextBlisterOrFinalize', () => {
    let mockContext: any;

    beforeEach(() => {
      mockContext = {
        targetBlister: 0,
        blisters: [{ quantity: 10 }, { quantity: 8 }],
        checkedQuantity: 5,
        setTargetBlister: jest.fn(),
        setActiveObjectType: jest.fn(),
        setStep: jest.fn(),
        setCheckedQuantity: jest.fn(),
        setBlisters: jest.fn(),
        setVisorMessage: jest.fn(),
        sendValidation: jest.fn(),
        forceOpFinalization: jest.fn(),
        persistBoxInspection: jest.fn(),
        data: { blisterType: { name: 'Blister A' } },
      };
    });

    it('deve avançar para próximo blister quando disponível', () => {
      const inspection = { count: 10 };

      verifyNextBlisterOrFinalize(inspection, mockContext);

      expect(mockContext.setTargetBlister).toHaveBeenCalledWith(1);
      expect(mockContext.setActiveObjectType).toHaveBeenCalledWith("blister");
      expect(mockContext.setStep).toHaveBeenCalledWith(1);
      expect(mockContext.setCheckedQuantity).toHaveBeenCalledWith(15); // 5 + 10
      expect(mockContext.setVisorMessage).toHaveBeenCalledWith("POSICIONE UM NOVO BLISTER", "blue");
    });

    it('deve finalizar quando não há mais blisters', () => {
      mockContext.blisters = [{ quantity: 10 }]; // apenas 1 blister
      const inspection = { count: 10 };

      verifyNextBlisterOrFinalize(inspection, mockContext);

      expect(mockContext.setTargetBlister).toHaveBeenCalledWith(undefined);
      expect(mockContext.setActiveObjectType).toHaveBeenCalledWith(undefined);
      expect(mockContext.setStep).toHaveBeenCalledWith(3);
      expect(mockContext.persistBoxInspection).toHaveBeenCalled();
    });

    it('deve usar forceOpFinalization quando há opBrakeManagerId', () => {
      mockContext.blisters = [{ quantity: 10 }];
      mockContext.opBrakeManagerId = 'manager123';
      const inspection = { count: 10 };

      verifyNextBlisterOrFinalize(inspection, mockContext);

      expect(mockContext.forceOpFinalization).toHaveBeenCalledWith(
        'manager123',
        expect.any(Array)
      );
      expect(mockContext.persistBoxInspection).not.toHaveBeenCalled();
    });
  });
});

describe('PackagingInspection - Component', () => {
  const mockPush = jest.fn();

  beforeEach(() => {
    (useRouter as jest.Mock).mockReturnValue({
      push: mockPush,
    });
  });

  it('deve renderizar componente sem erros', async () => {
    let container: HTMLElement;

    await act(async () => {
      const result = render(<PackagingInspection params={{ opId: '123' }} />);
      container = result.container;
    });

    expect(container!).toBeTruthy();
  });
});
