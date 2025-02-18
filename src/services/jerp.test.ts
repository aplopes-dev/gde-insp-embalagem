import { getOpFromCode } from './jerp';
import axios from 'axios';

const JERP_API = process.env.JERP_API;

jest.mock('axios');
const mockedAxios = axios as jest.Mocked<typeof axios>;

jest.mock('@/utils/logger', () => ({
  info: jest.fn(),
  error: jest.fn(),
}));

describe('getOpFromCode', () => {
  
  it('deve retornar os dados da OP quando a API responde com sucesso', async () => {
    const mockCode = '123456';
    const mockData = {
      id: 1,
      numero: mockCode,
      produto: { nome: 'Produto A' },
      quantidadeAProduzir: 100,
      embalagens: [{ nome: 'Blister' }, { nome: 'Caixa' }]
    };

    mockedAxios.get.mockResolvedValueOnce({ data: mockData });
    const result = await getOpFromCode(mockCode);
    expect(result).toEqual(mockData);

    expect(require('@/utils/logger').info).toHaveBeenCalledWith(
      expect.objectContaining({
        message: 'OP recuperada com sucesso',
        code: mockCode,
      })
    );
  });

  it('deve lançar erro quando a API falha', async () => {
    const mockCode = '123456';
    mockedAxios.get.mockRejectedValueOnce(new Error("Erro na API"));
    await expect(getOpFromCode(mockCode)).rejects.toThrow(`Falha ao obter OP para o código: ${mockCode}`);
  });

});
