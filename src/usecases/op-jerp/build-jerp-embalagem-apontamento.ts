import { JerpEmbalagemApontamentoDto } from "@/types/dtos/jerp-embalagem-apontamento-dto";

export type BlisterApontamentoSource = {
  code: string;
  quantity: number;
};

/**
 * Monta o array `embalagens` no formato exigido pelo JERP: cada blister embalado
 * vira uma embalagem com o seu código de barras (`barcode`).
 */
export function buildJerpEmbalagemApontamento(
  blisters: ReadonlyArray<BlisterApontamentoSource>
): JerpEmbalagemApontamentoDto[] {
  return blisters.map((blister) => ({
    barcode: blister.code,
  }));
}
