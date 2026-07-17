import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { OpActivityTimeline } from "@/components/op-activity-timeline";
import db from "@/providers/database";

export const dynamic = "force-dynamic";

export default async function HistoricoOcorrenciaPage({
  params,
}: {
  params: { opId: string; id: string };
}) {
  const opId = Number.parseInt(params.opId, 10);
  if (Number.isNaN(opId)) notFound();

  const occurrence = await db.opOccurrence.findFirst({
    where: { id: params.id, opId },
    include: {
      op: { select: { id: true, code: true } },
      responsible: { select: { id: true, name: true, email: true } },
      resolvedBy: { select: { id: true, name: true, email: true } },
      activities: {
        include: {
          user: { select: { id: true, name: true, email: true, role: true } },
        },
        orderBy: { createdAt: "desc" },
        take: 200,
      },
      images: {
        orderBy: { capturedAt: "desc" },
      },
    },
  });

  if (!occurrence) notFound();

  return (
    <>
      <div className="mb-6 flex items-center gap-4">
        <Link
          href={`/historico/${opId}`}
          className="px-3 py-2 rounded border border-gray-300 dark:border-gray-600 text-sm flex items-center gap-2"
        >
          <ArrowLeft className="w-4 h-4" />
          Voltar à OP
        </Link>
        <div>
          <h1 className="text-2xl font-bold">
            Ocorrência #{occurrence.number} — {occurrence.title}
          </h1>
          <p className="text-sm text-gray-600">
            OP {occurrence.op.code} (ID {occurrence.op.id})
          </p>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 mb-6">
        <Card className="lg:col-span-2">
          <CardHeader>
            <CardTitle className="text-base flex items-center gap-2">
              Detalhes
              <Badge>{occurrence.status}</Badge>
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3 text-sm">
            <p>{occurrence.description}</p>
            {occurrence.resolution && (
              <div>
                <p className="font-semibold">Resolução</p>
                <p>{occurrence.resolution}</p>
              </div>
            )}
            <p className="text-xs text-gray-500">
              Aberta em{" "}
              {new Date(occurrence.createdAt).toLocaleString("pt-BR")}
              {occurrence.responsible
                ? ` · Responsável: ${occurrence.responsible.name}`
                : ""}
              {occurrence.resolvedAt
                ? ` · Fechada em ${new Date(occurrence.resolvedAt).toLocaleString("pt-BR")}`
                : ""}
              {occurrence.resolvedBy
                ? ` por ${occurrence.resolvedBy.name}`
                : ""}
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-base">Imagens vinculadas</CardTitle>
          </CardHeader>
          <CardContent className="space-y-2 text-sm">
            {occurrence.images.length === 0 ? (
              <p className="text-gray-500">Nenhuma imagem no catálogo.</p>
            ) : (
              occurrence.images.map((img) => (
                <a
                  key={img.id}
                  href={`/api/images/${img.filename}?path=${img.storagePath}`}
                  target="_blank"
                  rel="noreferrer"
                  className="block text-blue-700 hover:underline truncate"
                >
                  {img.storagePath}/{img.filename}
                </a>
              ))
            )}
          </CardContent>
        </Card>
      </div>

      <h2 className="text-lg font-semibold mb-3">Eventos vinculados</h2>
      <OpActivityTimeline
        activities={occurrence.activities.map((a) => ({
          id: a.id,
          actionType: a.actionType,
          description: a.description,
          details: a.details,
          createdAt: a.createdAt.toISOString(),
          boxId: a.boxId,
          productId: a.productId,
          detectionStatus: a.detectionStatus,
          imageFilename: a.imageFilename,
          storagePath: a.storagePath,
          user: a.user,
        }))}
      />
    </>
  );
}
