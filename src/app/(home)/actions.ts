"use server";

import { redirect } from "next/navigation";

export async function submitOpAction(form: FormData) {
  await delay(1000);
  const params: { op: string } = JSON.parse(JSON.stringify(form));
  redirect(`/op/${params.op}`);
}

const delay = (ms: number | undefined) =>
  new Promise((res) => setTimeout(res, ms));
