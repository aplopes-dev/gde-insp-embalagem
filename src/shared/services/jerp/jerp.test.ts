import axios from 'axios';
import { getOpFromCode, getOpFromId } from '.';

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
      embalagens: [{ nome: 'Blister' }, { nome: 'Caixa' }]
    };

    mockedAxios.get.mockResolvedValueOnce({ data: mockData });
    const result = await getOpFromCode(`${mockCode}`);
    expect(result).toEqual(mockData);

  });

  it('deve lançar erro quando a API falha', async () => {
    const mockCode = '123456';
    mockedAxios.get.mockRejectedValueOnce(new Error("Erro na API"));
    await expect(getOpFromCode(mockCode)).rejects.toThrow(`Falha ao obter OP para o código: ${mockCode}`);
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
      embalagens: [{ nome: 'Blister' }, { nome: 'Caixa' }]
    };

    mockedAxios.get.mockResolvedValueOnce({ data: mockData });
    const result = await getOpFromId(`${mockId}`);
    expect(result).toEqual(mockData);
    expect(result?.id).toEqual(mockId);

  });

  it('deve lançar erro quando a API falha', async () => {
    const mockId = '123456';
    mockedAxios.get.mockRejectedValueOnce(new Error("Erro na API"));
    await expect(getOpFromId(mockId)).rejects.toThrow(`Falha ao obter OP para o id: ${mockId}`);
  });

});
