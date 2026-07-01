import { getOpFromRef } from "@/shared/services/jerp";
import { findLocalOpByRef } from "@/usecases/op/find-local-op-by-ref";
import { NextRequest, NextResponse } from "next/server";

export async function GET(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  const ref = params.id.trim();
  const opDataReq = await getOpFromRef(ref);

  if (opDataReq.isRight()) {
    return NextResponse.json(opDataReq.get());
  }

  const localOp = await findLocalOpByRef(ref);
  if (localOp) {
    return NextResponse.json({
      id: localOp.id,
      numero: Number(localOp.code),
      _fromLocal: true,
    });
  }

  const data = opDataReq.getLeft();
  return NextResponse.json(data, { status: data.status });
}
