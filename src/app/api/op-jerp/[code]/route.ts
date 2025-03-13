import { getOpFromCode } from "@/shared/services/jerp";
import { NextRequest, NextResponse } from "next/server";

export async function GET(
  req: NextRequest,
  { params }: { params: { code: string } }
) {

  const opDataReq = await getOpFromCode(params.code)
  if (opDataReq.isRight()) {
    return NextResponse.json(opDataReq.get());
  } else {
    const data = opDataReq.getLeft()
    return NextResponse.json(data, { status: data.status });
  }
}
