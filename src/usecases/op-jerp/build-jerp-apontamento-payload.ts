import { JerpBlisterApontamentoDto } from "@/types/dtos/jerp-blister-apontamento-dto";
import { BlisterApontamentoSource } from "./build-jerp-embalagem-apontamento";

/** Monta o array `blisters` no formato exigido pelo JERP: [{ barcode }]. */
export function buildJerpApontamentoPayload(
  blisters: ReadonlyArray<BlisterApontamentoSource>
): JerpBlisterApontamentoDto[] {
  return blisters.map((blister) => ({
    barcode: blister.code,
  }));
}
