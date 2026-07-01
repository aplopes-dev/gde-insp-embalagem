import { describe, expect, it } from "@jest/globals";
import { PackagingJerpDto } from "@/types/dtos/op-jerp-dto";
import { resolvePieceRegistration } from "./resolve-piece-registration";

const blisterPackaging: PackagingJerpDto = {
  id: 45469,
  nome: "BLISTER-DM-02-0-0001_06",
  quantidadeAlocada: 218,
};

describe("resolvePieceRegistration", () => {
  it("cadastra automaticamente quando o blister principal já existe no banco local", () => {
    const resolution = resolvePieceRegistration({
      blisterPackaging,
      existingBlisterType: { id: 45469, slots: 12, limitPerBox: 10 },
    });

    expect(resolution).toEqual({
      mode: "auto",
      slots: 12,
      limitPerBox: 10,
      blisterPackagingId: 45469,
      source: "local_db",
    });
  });

  it("cadastra automaticamente quando o JERP informa slots e limitePorCaixa", () => {
    const resolution = resolvePieceRegistration({
      blisterPackaging: {
        ...blisterPackaging,
        slots: 6,
        limitePorCaixa: 13,
      },
    });

    expect(resolution).toEqual({
      mode: "auto",
      slots: 6,
      limitPerBox: 13,
      blisterPackagingId: 45469,
      source: "jerp_op",
    });
  });

  it("cadastra automaticamente usando histórico do mesmo produto", () => {
    const resolution = resolvePieceRegistration({
      blisterPackaging,
      historyBlisterConfig: { slots: 8, limitPerBox: 12 },
    });

    expect(resolution).toEqual({
      mode: "auto",
      slots: 8,
      limitPerBox: 12,
      blisterPackagingId: 45469,
      source: "history",
    });
  });

  it("prioriza blister local sobre histórico e JERP", () => {
    const resolution = resolvePieceRegistration({
      blisterPackaging: {
        ...blisterPackaging,
        slots: 6,
        limitePorCaixa: 13,
      },
      existingBlisterType: { id: 45469, slots: 12, limitPerBox: 10 },
      historyBlisterConfig: { slots: 8, limitPerBox: 12 },
    });

    expect(resolution).toMatchObject({ mode: "auto", source: "local_db" });
  });

  it("prioriza JERP sobre histórico quando blister local não existe", () => {
    const resolution = resolvePieceRegistration({
      blisterPackaging: {
        ...blisterPackaging,
        slots: 6,
        limitePorCaixa: 13,
      },
      historyBlisterConfig: { slots: 8, limitPerBox: 12 },
    });

    expect(resolution).toMatchObject({ mode: "auto", source: "jerp_op" });
  });

  it("abre modal do supervisor quando nenhuma fonte resolve os dados", () => {
    const resolution = resolvePieceRegistration({
      blisterPackaging,
    });

    expect(resolution).toEqual({
      mode: "supervisor",
      reason:
        "O JERP não informou peças por blister e blisters por caixa.",
      partialData: undefined,
    });
  });

  it("pré-preenche slots parciais quando o JERP informa apenas um campo", () => {
    const resolution = resolvePieceRegistration({
      blisterPackaging: {
        ...blisterPackaging,
        slots: 6,
      },
    });

    expect(resolution).toEqual({
      mode: "supervisor",
      reason: "O JERP não informou blisters por caixa.",
      partialData: { slots: 6 },
    });
  });

  it("exige supervisor quando não há blister principal identificado", () => {
    const resolution = resolvePieceRegistration({
      blisterPackaging: undefined,
    });

    expect(resolution).toEqual({
      mode: "supervisor",
      reason: "Não foi possível identificar o blister principal da OP.",
    });
  });
});
