import { getOpFromCode, getOpFromId } from "@/shared/services/jerp";
import { NextRequest, NextResponse } from "next/server";

export async function GET(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  let opDataReq = await getOpFromId(params.id);
  if (opDataReq.isLeft()) {
    opDataReq = await getOpFromCode(params.id);
  }

  if (opDataReq.isRight()) {
    return NextResponse.json(opDataReq.get());
  }

  const data = opDataReq.getLeft();
  return NextResponse.json(data, { status: data.status });
}
