jest.mock('@/app/op/[opId]/actions', () => ({
  saveTagId: jest.fn().mockResolvedValue(true),
  getBoxBarCode: jest.fn().mockResolvedValue(null),
}));

jest.mock('@/usecases/op-jerp/get-generated-barcode-embalagens', () => ({
  getGeneratedBarcodeEmbalagensForBox: jest.fn().mockResolvedValue(null),
}));

import axios from 'axios';
import {
  getOpFromCode,
  getOpFromId,
  getOpFromRef,
  generateBarcode,
  isJerpTimeoutError,
  resolveJerpApontamentoTimeoutMs,
  JERP_TIMEOUT_OPERATOR_MESSAGE,
  JERP_APONTAMENTO_TIMEOUT_MS,
} from '.';
import { saveTagId, getBoxBarCode } from '@/app/op/[opId]/actions';
import { getGeneratedBarcodeEmbalagensForBox } from '@/usecases/op-jerp/get-generated-barcode-embalagens';

const JERP_API = process.env.JERP_API;

jest.mock('axios');
const mockedAxios = axios as jest.Mocked<typeof axios>;

jest.mock('@/libs/logger', () => ({
  info: jest.fn(),
  warn: jest.fn(),
  error: jest.fn(),
}));

describe('getOpFromCode', () => {
  it('deve retornar os dados da OP quando a API responde com sucesso', async () => {
    jest.resetAllMocks();
    const mockCode = 123456;
    const mockData = {
      id: 1,
      numero: 123456,
      produto: { nome: 'Produto A' },
      quantidadeAProduzir: 100,
      embalagens: [
        { nome: 'Blister', slots: 10, limitePorCaixa: 5 },
        { nome: 'Caixa' }
      ]
    };

    mockedAxios.get.mockResolvedValueOnce({ data: mockData });
    const result = await getOpFromCode(`${mockCode}`);
    if (result.isRight()) {
      const data = result.get()
      expect(data).toEqual(mockData);
      expect(data?.numero).toEqual(mockCode);
    }

  });

  it("deve logar erro quando a API falha", async () => {
    const mockCode = "123456";

    const axiosError = {
      message: "Erro na API",
      isAxiosError: true,
      config: {
        method: "get",
        url: `${JERP_API}/ordemproducao/${mockCode}`,
        headers: { Authorization: "Bearer fakeToken" },
        data: JSON.stringify({ example: "data" }),
      },
      response: {
        status: 500,
        statusText: "Internal Server Error",
        data: { error: "Erro no servidor" },
      },
    };

    // Mockando axios para simular erro
    mockedAxios.get.mockRejectedValueOnce(axiosError);

    // Chamando a função e capturando o resultado sem esperar exceção
    await getOpFromCode(mockCode);

    // Verifica se o logger capturou o erro corretamente
    expect(require("@/libs/logger").error).toHaveBeenCalledWith(
      expect.objectContaining({
        message: `Falha ao obter OP para o código: ${mockCode}`,
        error: axiosError.message,
        method: "get",
        url: axiosError.config.url,
        body: { example: "data" },
        headers: axiosError.config.headers,
        status: 500,
        statusText: "Internal Server Error",
        responseData: { error: "Erro no servidor" },
      })
    );

    expect(mockedAxios.get).toHaveBeenCalledWith(
      expect.stringContaining(mockCode), // Apenas verifica a URL
      expect.any(Object) // Permite qualquer configuração de headers
    );
  });


});

describe('getOpFromId', () => {
  it('deve retornar os dados da OP quando a API responde com sucesso', async () => {
    jest.resetAllMocks();
    const mockId = 34;
    const mockData = {
      id: 34,
      numero: mockId,
      produto: { nome: 'Produto A' },
      quantidadeAProduzir: 100,
      embalagens: [
        { nome: 'Blister', slots: 10, limitePorCaixa: 5 },
        { nome: 'Caixa' }
      ]
    };

    mockedAxios.get.mockResolvedValueOnce({ data: mockData });
    const result = await getOpFromId(`${mockId}`);
    if (result.isRight()) {
      const data = result.get()
      expect(data).toEqual(mockData);
      expect(data?.id).toEqual(mockId);
    }

  });

  // it('deve lançar erro quando a API falha', async () => {
  //   const mockId = '123456';
  //   mockedAxios.get.mockRejectedValueOnce(new Error("Erro na API"));
  //   await expect(getOpFromId(mockId)).rejects.toThrow(`Falha ao obter OP para o id: ${mockId}`);
  // });

});

describe('getOpFromRef', () => {
  it('retorna OP por id quando JERP responde na primeira tentativa', async () => {
    jest.resetAllMocks();
    const mockData = {
      id: 432913,
      numero: 77098,
      produto: { id: 1, nome: 'Produto A' },
      quantidadeAProduzir: 100,
      embalagens: [
        { id: 1, nome: 'Blister', quantidadeAlocada: 10, slots: 10, limitePorCaixa: 5 },
        { id: 2, nome: 'Caixa', quantidadeAlocada: 1 },
      ],
    };

    mockedAxios.get.mockResolvedValueOnce({ data: mockData });
    const result = await getOpFromRef('432913');
    expect(result.isRight()).toBe(true);
    expect(result.get()?.id).toBe(432913);
    expect(mockedAxios.get).toHaveBeenCalledTimes(1);
  });

  it('tenta por código quando consulta por id falha', async () => {
    jest.resetAllMocks();
    const axiosError = {
      message: 'Erro na API',
      isAxiosError: true,
      config: { method: 'get', url: `${JERP_API}/ordemproducaoid/78322`, headers: {} },
      response: { status: 400, statusText: 'Bad Request', data: { message: 'Sequence contains no elements' } },
    };
    const mockData = {
      id: 440296,
      numero: 78322,
      produto: { id: 1, nome: 'Produto A' },
      quantidadeAProduzir: 100,
      embalagens: [
        { id: 1, nome: 'Blister', quantidadeAlocada: 10, slots: 10, limitePorCaixa: 5 },
        { id: 2, nome: 'Caixa', quantidadeAlocada: 1 },
      ],
    };

    mockedAxios.get
      .mockRejectedValueOnce(axiosError)
      .mockResolvedValueOnce({ data: mockData });

    const result = await getOpFromRef('78322');
    expect(result.isRight()).toBe(true);
    expect(result.get()?.numero).toBe(78322);
    expect(mockedAxios.get).toHaveBeenCalledTimes(2);
  });
});

describe('generateBarcode', () => {
  it('envia quantidadeApontada e embalagens com barcode ao JERP', async () => {
    jest.resetAllMocks();
    (getBoxBarCode as jest.Mock).mockResolvedValue(null);
    (saveTagId as jest.Mock).mockResolvedValue(true);

    const packedBlisters = [
      { code: '70856001', quantity: 3 },
      { code: '70856002', quantity: 3 },
    ];
    const mockTag = {
      message: 'OK',
      id: 438999,
      quantidadeApontada: 6,
      idBarras: 432424,
      quantidadePendente: 0,
      descricao: null,
      pdfBase64: null,
    };

    mockedAxios.post.mockResolvedValueOnce({ data: mockTag });

    const result = await generateBarcode(
      438999,
      'box-1',
      6,
      'operador@teste.com',
      packedBlisters
    );

    expect(result.isRight()).toBe(true);
    expect(mockedAxios.post).toHaveBeenCalledWith(
      `${JERP_API}/ordemproducao`,
      {
        id: 438999,
        quantidadeApontada: 6,
        userName: 'operador@teste.com',
        embalagens: [
          { barcode: '70856001' },
          { barcode: '70856002' },
        ],
      },
      expect.objectContaining({
        timeout: JERP_APONTAMENTO_TIMEOUT_MS,
      })
    );
    expect(saveTagId).toHaveBeenCalledWith('box-1', '432424');
  });

  it('traduz timeout do JERP para aviso ao operador, sem novo apontamento local', async () => {
    jest.resetAllMocks();
    (getBoxBarCode as jest.Mock).mockResolvedValue(null);

    const axiosError = {
      message: 'Request failed with status code 400',
      isAxiosError: true,
      code: 'ERR_BAD_REQUEST',
      config: { method: 'post', url: `${JERP_API}/ordemproducao` },
      response: {
        status: 400,
        statusText: 'Bad Request',
        data: {
          message:
            'Execution Timeout Expired.  The timeout period elapsed prior to completion of the operation or the server is not responding.',
        },
      },
    };
    mockedAxios.post.mockRejectedValueOnce(axiosError);

    const result = await generateBarcode(
      416442,
      'box-76',
      12,
      'operador@teste.com',
      [
        { code: '07285900145', quantity: 6 },
        { code: '07285900144', quantity: 6 },
      ]
    );

    expect(result.isLeft()).toBe(true);
    expect(saveTagId).not.toHaveBeenCalled();
    if (result.isLeft()) {
      expect(result.getLeft().status).toBe(504);
      expect(result.getLeft().errorData?.code).toBe('JERP_TIMEOUT');
      expect(result.getLeft().errorData?.message).toBe(JERP_TIMEOUT_OPERATOR_MESSAGE);
    }
  });

  it('não chama JERP se a caixa já possui barcode (idempotência)', async () => {
    jest.resetAllMocks();
    (getBoxBarCode as jest.Mock).mockResolvedValue('1850924');
    (getGeneratedBarcodeEmbalagensForBox as jest.Mock).mockResolvedValue([
      '07830900056',
    ]);

    const result = await generateBarcode(
      438999,
      'box-1',
      84,
      'operador@teste.com',
      [{ code: '07830900056', quantity: 12 }]
    );

    expect(result.isRight()).toBe(true);
    expect(mockedAxios.post).not.toHaveBeenCalled();
    expect(saveTagId).not.toHaveBeenCalled();
    if (result.isRight()) {
      expect(result.get().idBarras).toBe(1850924);
      expect(result.get().message).toMatch(/já gerada/i);
    }
  });

  it('bloqueia reuso quando QRs atuais divergem do apontamento original', async () => {
    jest.resetAllMocks();
    (getBoxBarCode as jest.Mock).mockResolvedValue('1851454');
    (getGeneratedBarcodeEmbalagensForBox as jest.Mock).mockResolvedValue([
      '08056900054',
      '08056900046',
    ]);

    const result = await generateBarcode(
      452360,
      'box-7',
      36,
      'elizeu@gde.com.br',
      [
        { code: '08056900136', quantity: 4 },
        { code: '08056900144', quantity: 4 },
      ]
    );

    expect(result.isLeft()).toBe(true);
    expect(mockedAxios.post).not.toHaveBeenCalled();
    if (result.isLeft()) {
      expect(result.getLeft().status).toBe(409);
      expect(result.getLeft().error).toMatch(/divergência/i);
    }
  });

  it('falha com 409 quando saveTagId perde a corrida (apontamento órfão)', async () => {
    jest.resetAllMocks();
    (getBoxBarCode as jest.Mock)
      .mockResolvedValueOnce(null)
      .mockResolvedValueOnce('1851454');
    (saveTagId as jest.Mock).mockResolvedValue(false);
    mockedAxios.post.mockResolvedValueOnce({
      data: {
        message: 'OK',
        id: 452360,
        quantidadeApontada: 36,
        idBarras: 1851499,
        quantidadePendente: 0,
        descricao: null,
        pdfBase64: null,
      },
    });

    const result = await generateBarcode(
      452360,
      'box-7',
      36,
      'operador@teste.com',
      [{ code: '08056900136', quantity: 4 }]
    );

    expect(result.isLeft()).toBe(true);
    if (result.isLeft()) {
      expect(result.getLeft().status).toBe(409);
      expect(result.getLeft().errorData?.orphanedIdBarras).toBe(1851499);
    }
  });
});

describe('timeout do apontamento JERP', () => {
  it('usa 180s por defeito e ignora valores inválidos', () => {
    expect(resolveJerpApontamentoTimeoutMs(undefined)).toBe(180_000);
    expect(resolveJerpApontamentoTimeoutMs('90000')).toBe(90_000);
    expect(resolveJerpApontamentoTimeoutMs('abc')).toBe(180_000);
    expect(resolveJerpApontamentoTimeoutMs('0')).toBe(180_000);
  });

  it('reconhece timeout SQL do JERP e abort do axios', () => {
    expect(
      isJerpTimeoutError({
        response: { data: { message: 'Execution Timeout Expired. The timeout period elapsed.' } },
      })
    ).toBe(true);
    expect(isJerpTimeoutError({ code: 'ECONNABORTED', message: 'timeout of 180000ms exceeded' })).toBe(
      true
    );
    expect(isJerpTimeoutError({ response: { data: { message: 'QR inválido' } } })).toBe(false);
  });
});
