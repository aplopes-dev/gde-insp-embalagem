import { JerpBlisterApontamentoDto } from "@/types/dtos/jerp-blister-apontamento-dto";

export type BlisterApontamentoSource = {
  code: string;
  quantity: number;
};

/** Monta o array de blisters no mesmo formato usado na inspeção (`OP_{op}_BOX_{box}_BL_{code}`). */
export function buildJerpBlisterApontamento(
  opId: number,
  boxId: string,
  blisters: ReadonlyArray<BlisterApontamentoSource>
): JerpBlisterApontamentoDto[] {
  return blisters.map((blister) => ({
    codigo: blister.code,
    quantidade: blister.quantity,
    fileName: `OP_${opId}_BOX_${boxId}_BL_${blister.code}`,
  }));
}
