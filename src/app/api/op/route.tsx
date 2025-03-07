import { getPaginatedOp } from "@/features/daily-op-list/actions";
import { NextResponse } from "next/server";

export async function GET(req: Request) {
  try {
    const url = new URL(req.url);
    const limit = parseInt(url.searchParams.get("limit") || "10", 10);
    const skip = parseInt(url.searchParams.get("skip") || "0", 10);
    const field = url.searchParams.get("field") || "createdAt";
    const order = url.searchParams.get("order") || "desc";

    const filters = url.searchParams.get("filters")
      ? JSON.parse(url.searchParams.get("filters")!)
      : {};

    const [data, count] = await getPaginatedOp({
      limit,
      skip,
      field,
      order,
      filters,
    });

    return NextResponse.json({ data, count });
  } catch (error) {
    console.error("Erro ao carregar operações paginadas:", error);
    return NextResponse.json(
      { error: "Erro ao carregar operações" },
      { status: 500 }
    );
  }
}
