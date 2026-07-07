import { JerpEmbalagemApontamentoDto } from "@/types/dtos/jerp-embalagem-apontamento-dto";
import {
  BlisterApontamentoSource,
  buildJerpEmbalagemApontamento,
} from "./build-jerp-embalagem-apontamento";

/** @deprecated Use `buildJerpEmbalagemApontamento` — o JERP espera o campo `embalagens`. */
export function buildJerpApontamentoPayload(
  blisters: ReadonlyArray<BlisterApontamentoSource>
): JerpEmbalagemApontamentoDto[] {
  return buildJerpEmbalagemApontamento(blisters);
}
