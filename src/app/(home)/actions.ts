"use server";

import { FilterPaginationParams } from "@/types/filter";
import { redirect } from "next/navigation";

export async function submitOpAction(form: FormData) {
  await delay(1000);
  const params: { op: string } = JSON.parse(JSON.stringify(form));
  redirect(`/op/${params.op}`);
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
