import { generateBarcode } from "@/shared/services/jerp/index";
import { NextRequest, NextResponse } from "next/server";


type GenerateBarcodeBody = {
  opId: number
  boxId: number
  quantity: number
}

export async function POST(req: NextRequest) {
  const { opId, boxId, quantity } = await req.json() as GenerateBarcodeBody;
  const tagDataReq = await generateBarcode(opId, `${boxId}`, quantity);

  if (tagDataReq.isRight()) {
    return NextResponse.json(tagDataReq.get());
  } else {
    const data = tagDataReq.getLeft()
    return NextResponse.json(data, { status: data.status });
  }
}
