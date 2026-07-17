import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft } from "lucide-react";
import db from "@/providers/database";
import { HistoricoOpDetail } from "../_components/historico-op-detail";

export const dynamic = "force-dynamic";

export default async function HistoricoOpPage({
  params,
}: {
  params: { opId: string };
}) {
  const opId = Number.parseInt(params.opId, 10);
  if (Number.isNaN(opId)) notFound();

  const op = await db.op.findUnique({
    where: { id: opId },
    include: {
      product: { select: { id: true, name: true, code: true } },
      box: { select: { name: true, code: true } },
      blister: { select: { name: true, code: true, slots: true } },
      OpBox: {
        orderBy: { createdAt: "asc" },
        include: {
          OpBoxBlister: {
            orderBy: { packedAt: "asc" },
          },
        },
      },
      OpOccurrences: {
        orderBy: { number: "asc" },
        include: {
          responsible: { select: { id: true, name: true, email: true } },
          resolvedBy: { select: { id: true, name: true, email: true } },
        },
      },
      InspectionImages: {
        orderBy: { capturedAt: "desc" },
        take: 100,
      },
    },
  });

  if (!op) notFound();

  const activities = await db.opActivityLog.findMany({
    where: { opId },
    include: {
      user: {
        select: { id: true, name: true, email: true, role: true },
      },
    },
    orderBy: { createdAt: "desc" },
    take: 200,
  });

  return (
    <>
      <div className="mb-6 flex items-center gap-4">
        <Link
          href="/historico"
          className="px-3 py-2 rounded border border-gray-300 dark:border-gray-600 text-gray-900 dark:text-gray-100 hover:bg-gray-50 dark:hover:bg-gray-700 flex items-center gap-2 text-sm"
        >
          <ArrowLeft className="w-4 h-4" />
          Voltar
        </Link>
        <div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-gray-100">
            OP {op.code}
          </h1>
          <p className="text-sm text-gray-600 dark:text-gray-400">
            ID {op.id}
            {op.product?.name ? ` · ${op.product.name}` : ""}
          </p>
        </div>
      </div>

      <HistoricoOpDetail
        op={{
          id: op.id,
          code: op.code,
          status: op.status,
          quantityToProduce: op.quantityToProduce,
          createdAt: op.createdAt.toISOString(),
          finishedAt: op.finishedAt?.toISOString() ?? null,
          product: op.product,
          box: op.box,
          blister: op.blister,
        }}
        boxes={op.OpBox.map((box) => ({
          id: box.id,
          code: box.code,
          status: box.status,
          packedAt: box.packedAt?.toISOString() ?? null,
          barCode: box.barCode,
          blisters: box.OpBoxBlister.map((bl) => ({
            id: bl.id,
            code: bl.code,
            quantity: bl.quantity,
            packedAt: bl.packedAt?.toISOString() ?? null,
          })),
        }))}
        activities={activities.map((a) => ({
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
        occurrences={op.OpOccurrences.map((o) => ({
          id: o.id,
          number: o.number,
          status: o.status,
          title: o.title,
          description: o.description,
          createdAt: o.createdAt.toISOString(),
          resolvedAt: o.resolvedAt?.toISOString() ?? null,
          resolution: o.resolution,
          responsible: o.responsible,
          resolvedBy: o.resolvedBy,
        }))}
        catalogImages={op.InspectionImages.map((img) => ({
          id: img.id,
          filename: img.filename,
          storagePath: img.storagePath,
          detectionStatus: img.detectionStatus,
          detectionStep: img.detectionStep,
          capturedAt: img.capturedAt.toISOString(),
          deviceId: img.deviceId,
          workerId: img.workerId,
          opBoxId: img.opBoxId,
        }))}
      />
    </>
  );
}
