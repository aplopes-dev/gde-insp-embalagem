"use server";

import { FilterPaginationParams } from "@/types/filter";

export async function submitOpAction(form: FormData) {
  await delay(1000);
  const params: { op: string } = JSON.parse(JSON.stringify(form));
  return {
    id: 327117,
    Numero: 58434,
    Produto: "BL-03832070 LD - NEW",
    QuantidadeAProduzir: 1124,
    Embalagens: [
      "Blister BL-03832070LD Rev.0 Antiest\u00E1tico",
      "CAIXA 520X320X170 TRIPLEX",
      "DIVISORIAS CX 520X320X170",
    ],
  };
}

export async function getPaginatedBoxOp({
  limit,
  skip,
  field = "createdAt",
  order = "desc",
  filters,
}: FilterPaginationParams) {
  await delay(1000);
  return [[], 0];
}

const delay = (ms: number | undefined) =>
  new Promise((res) => setTimeout(res, ms));
