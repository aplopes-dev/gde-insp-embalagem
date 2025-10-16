import { getOpFromId } from "@/shared/services/jerp/index";
import { NextRequest, NextResponse } from "next/server";

export async function GET(
  req: NextRequest,
  { params }: { params: { id: string } }
) {

  const opDataReq = await getOpFromId(params.id)
  if (opDataReq.isRight()) {
    return NextResponse.json(opDataReq.get());
  } else {
    const data = opDataReq.getLeft()
    return NextResponse.json(data, { status: data.status });
  }
}
