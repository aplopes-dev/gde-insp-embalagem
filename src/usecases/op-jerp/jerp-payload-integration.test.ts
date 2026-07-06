jest.mock("@/app/op/[opId]/actions", () => ({
  saveTagId: jest.fn(),
}));

jest.mock("@/libs/logger", () => ({
  info: jest.fn(),
  warn: jest.fn(),
  error: jest.fn(),
}));

const findManyMock = jest.fn();
jest.mock("@/providers/database", () => ({
  __esModule: true,
  default: {
    opBoxBlister: {
      findMany: (...args: unknown[]) => findManyMock(...args),
    },
  },
}));

import axios from "axios";
import { generateBarcode } from "@/shared/services/jerp";
import { getPackedBlistersByBox } from "./get-packed-blisters-by-box";

jest.mock("axios");
const mockedAxios = axios as jest.Mocked<typeof axios>;

const JERP_API = process.env.JERP_API;

describe("Integração do payload de apontamento JERP (banco → build → envio)", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it("envia ao JERP o payload com embalagens no formato { barcode } a partir dos blisters embalados no banco", async () => {
    // Blisters embalados como estão no banco (formato real: 0 + OP + sequencial).
    findManyMock.mockResolvedValueOnce([
      { code: "07285300651", quantity: 6 },
      { code: "07285300652", quantity: 6 },
    ]);

    mockedAxios.post.mockResolvedValueOnce({
      data: {
        message: "OK",
        id: 416436,
        quantidadeApontada: 12,
        idBarras: 500123,
        quantidadePendente: 0,
        descricao: null,
        pdfBase64: null,
      },
    });

    const boxId = "cmpci27kv02ehsuellxc5rl6o";
    const opId = 416436;

    const packed = await getPackedBlistersByBox(boxId);
    const quantity = packed.reduce((acc, b) => acc + b.quantity, 0);

    const result = await generateBarcode(
      opId,
      boxId,
      quantity,
      "joaobarreto@gde.com.br",
      packed
    );

    expect(result.isRight()).toBe(true);

    // Só busca blisters efetivamente embalados (packedAt preenchido), na ordem de embalagem.
    expect(findManyMock).toHaveBeenCalledWith({
      where: { opBoxId: boxId, packedAt: { not: null } },
      select: { code: true, quantity: true },
      orderBy: { packedAt: "asc" },
    });

    // Payload exato enviado ao JERP.
    expect(mockedAxios.post).toHaveBeenCalledWith(
      `${JERP_API}/ordemproducao`,
      {
        id: 416436,
        quantidadeApontada: 12,
        userName: "joaobarreto@gde.com.br",
        embalagens: [
          { barcode: "07285300651" },
          { barcode: "07285300652" },
        ],
        blisters: [
          {
            codigo: "07285300651",
            quantidade: 6,
            fileName: `OP_${opId}_BOX_${boxId}_BL_07285300651`,
          },
          {
            codigo: "07285300652",
            quantidade: 6,
            fileName: `OP_${opId}_BOX_${boxId}_BL_07285300652`,
          },
        ],
      },
      expect.any(Object)
    );
  });

  it("envia um barcode por blister preservando a ordem de embalagem do banco", async () => {
    findManyMock.mockResolvedValueOnce([
      { code: "07274100217", quantity: 12 },
      { code: "07274100169", quantity: 12 },
      { code: "07274100168", quantity: 12 },
      { code: "07274100218", quantity: 13 },
    ]);

    mockedAxios.post.mockResolvedValueOnce({
      data: { idBarras: 777, quantidadeApontada: 49 },
    });

    const packed = await getPackedBlistersByBox("box-72741");
    const quantity = packed.reduce((acc, b) => acc + b.quantity, 0);

    await generateBarcode(404537, "box-72741", quantity, "op@gde.com.br", packed);

    const sentPayload = mockedAxios.post.mock.calls[0][1] as {
      quantidadeApontada: number;
      embalagens: Array<{ barcode: string }>;
      blisters: Array<{ codigo: string }>;
    };

    expect(sentPayload.quantidadeApontada).toBe(49);
    expect(sentPayload.embalagens).toEqual([
      { barcode: "07274100217" },
      { barcode: "07274100169" },
      { barcode: "07274100168" },
      { barcode: "07274100218" },
    ]);
    expect(sentPayload.blisters.map((b) => b.codigo)).toEqual([
      "07274100217",
      "07274100169",
      "07274100168",
      "07274100218",
    ]);
  });

  it("envia embalagens e blisters vazios quando a caixa não tem blisters embalados", async () => {
    findManyMock.mockResolvedValueOnce([]);
    mockedAxios.post.mockResolvedValueOnce({ data: { idBarras: 0 } });

    const packed = await getPackedBlistersByBox("box-empty");

    await generateBarcode(1, "box-empty", 0, "op@gde.com.br", packed);

    expect(mockedAxios.post).toHaveBeenCalledWith(
      `${JERP_API}/ordemproducao`,
      expect.objectContaining({ embalagens: [], blisters: [] }),
      expect.any(Object)
    );
  });
});
