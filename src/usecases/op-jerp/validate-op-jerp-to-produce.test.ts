import { OpJerpDto } from "@/types/dtos/op-jerp-dto";
import { validateOpJerpToProduce } from "./validate-op-jerp-to-produce";

describe("validateOpJerpToProduce", () => {
  let validOp: OpJerpDto;

  beforeEach(() => {
    validOp = {
      id: 1,
      numero: 100,
      produto: { id: 1, nome: "Produto Teste" },
      quantidadeAProduzir: 10,
      embalagens: [
        { id: 1, nome: "Blister", quantidadeAlocada: 1, slots: 10, limitePorCaixa: 5 },
        { id: 2, nome: "Caixa", quantidadeAlocada: 1 }
      ]
    };
  });

  it("deve validar corretamente uma OP válida", () => {
    expect(() => validateOpJerpToProduce(validOp)).not.toThrow();
  });

  it("deve lançar erro se a OP estiver vazia", () => {
    expect(() => validateOpJerpToProduce(null as any)).toThrow("OP está vazia");
  });

  it("deve lançar erro se o ID da OP estiver ausente", () => {
    delete (validOp as any).id;
    expect(() => validateOpJerpToProduce(validOp)).toThrow("O ID da OP é obrigatório");
  });

  it("deve lançar erro se o número da OP estiver ausente", () => {
    delete (validOp as any).numero;
    expect(() => validateOpJerpToProduce(validOp)).toThrow("O numero da OP é obrigatório");
  });

  it("deve lançar erro se o produto não tiver ID", () => {
    validOp.produto.id = undefined as any;
    expect(() => validateOpJerpToProduce(validOp)).toThrow("O ID do produto é obrigatório");
  });

  it("deve lançar erro se a quantidade a produzir for menor ou igual a zero", () => {
    validOp.quantidadeAProduzir = 0;
    expect(() => validateOpJerpToProduce(validOp)).toThrow("Quantidade a produzir deve ser maior que zero");
  });

  it("deve lançar erro se não houver embalagens", () => {
    validOp.embalagens = [];
    expect(() => validateOpJerpToProduce(validOp)).toThrow("Embalagens são obrigatórias");
  });

  it("deve lançar erro se houver menos de 2 embalagens", () => {
    validOp.embalagens.pop();
    expect(() => validateOpJerpToProduce(validOp)).toThrow("Deve haver ao menos 2 embalagens (blister e caixa)");
  });

  it("deve lançar erro se alguma embalagem não tiver ID", () => {
    validOp.embalagens[0].id = undefined as any;
    expect(() => validateOpJerpToProduce(validOp)).toThrow("O ID da embalagem é obrigatório.");
  });

  it("deve lançar erro se alguma embalagem tiver quantidade alocada menor que 1", () => {
    validOp.embalagens[0].quantidadeAlocada = 0;
    expect(() => validateOpJerpToProduce(validOp)).toThrow("Deve haver ao menos 1 unidade alocada");
  });

  it("deve validar corretamente uma OP com novos campos de configuração", () => {
    validOp.embalagens[0].slots = 20;
    validOp.embalagens[0].limitePorCaixa = 8;
    expect(() => validateOpJerpToProduce(validOp)).not.toThrow();
  });

  it("deve validar corretamente uma OP sem os novos campos (retrocompatibilidade)", () => {
    delete validOp.embalagens[0].slots;
    delete validOp.embalagens[0].limitePorCaixa;
    expect(() => validateOpJerpToProduce(validOp)).not.toThrow();
  });
});
