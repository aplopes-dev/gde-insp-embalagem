import {
  BlisterApontamentoSource,
  buildJerpEmbalagemApontamento,
} from "./build-jerp-embalagem-apontamento";

export type JerpBlisterApontamentoDto = {
  codigo: string;
  quantidade: number;
  fileName: string;
};

/** Monta os arrays enviados ao JERP no apontamento de etiqueta. */
export function buildJerpApontamentoPayload(
  opId: number,
  boxId: string,
  blisters: ReadonlyArray<BlisterApontamentoSource>
): {
  embalagens: ReturnType<typeof buildJerpEmbalagemApontamento>;
  blisters: JerpBlisterApontamentoDto[];
} {
  return {
    embalagens: buildJerpEmbalagemApontamento(blisters),
    blisters: blisters.map((blister) => ({
      codigo: blister.code,
      quantidade: blister.quantity,
      fileName: `OP_${opId}_BOX_${boxId}_BL_${blister.code}`,
    })),
  };
}
