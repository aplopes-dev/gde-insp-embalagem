jest.mock('@/app/op/[opId]/actions', () => ({
  saveTagId: jest.fn(),
}));

import axios from 'axios';
import { getOpFromCode, getOpFromId, getOpFromRef } from '.';

const JERP_API = process.env.JERP_API;

jest.mock('axios');
const mockedAxios = axios as jest.Mocked<typeof axios>;

jest.mock('@/libs/logger', () => ({
  info: jest.fn(),
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
