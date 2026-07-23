import { NextResponse } from "next/server";
import { requireRole } from "@/lib/rbac";
import { buildOpReconReport } from "@/usecases/historico/build-op-recon-report";
import { renderOpReconPdf } from "@/usecases/historico/render-op-recon-pdf";
import logger from "@/libs/logger";

export const dynamic = "force-dynamic";
export const maxDuration = 60;

export async function GET(
  req: Request,
  { params }: { params: { opId: string } }
) {
  const gate = await requireRole(["AUDITOR"]);
  if (!gate.ok) return gate.response;

  const opId = Number.parseInt(params.opId, 10);
  if (Number.isNaN(opId)) {
    return NextResponse.json({ error: "OP inválida" }, { status: 400 });
  }

  const url = new URL(req.url);
  const format = (url.searchParams.get("format") ?? "pdf").toLowerCase();

  try {
    const report = await buildOpReconReport(opId);
    if (!report) {
      return NextResponse.json({ error: "OP não encontrada" }, { status: 404 });
    }

    if (format === "json") {
      return NextResponse.json({ data: report });
    }

    const pdf = await renderOpReconPdf(report);
    const filename = `historico-op-${report.op.code}-recon.pdf`;

    return new NextResponse(Buffer.from(pdf), {
      status: 200,
      headers: {
        "Content-Type": "application/pdf",
        "Content-Disposition": `attachment; filename="${filename}"`,
        "Cache-Control": "no-store",
      },
    });
  } catch (error) {
    logger.error({
      message: "Falha ao gerar relatório de histórico da OP",
      opId,
      error,
    });
    return NextResponse.json(
      { error: "Falha ao gerar relatório" },
      { status: 500 }
    );
  }
}
