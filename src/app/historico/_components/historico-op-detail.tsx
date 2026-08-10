"use client";

import Link from "next/link";
import Image from "next/image";
import { useMemo, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { OpActivityTimeline } from "@/components/op-activity-timeline";
import { Download, FileText, Loader2 } from "lucide-react";
import { formatLogImageDatePath } from "@/lib/log-image-date";

type OpHeader = {
  id: number;
  code: string;
  status: string;
  quantityToProduce: number;
  createdAt: string;
  finishedAt: string | null;
  product: { id: number; name: string; code: string } | null;
  box: { name: string; code: string } | null;
  blister: { name: string; code: string; slots: number } | null;
};

type BoxRow = {
  id: string;
  code: string;
  status: string;
  packedAt: string | null;
  barCode: string | null;
  blisters: {
    id: string;
    code: string;
    quantity: number;
    packedAt: string | null;
  }[];
};

type ActivityRow = {
  id: string;
  actionType: string;
  description: string;
  details?: unknown;
  createdAt: string;
  boxId?: string | null;
  productId?: number | null;
  detectionStatus?: string | null;
  imageFilename?: string | null;
  storagePath?: string | null;
  user: { id: string; name: string; email: string; role: string };
};

type OccurrenceRow = {
  id: string;
  number: number;
  status: string;
  title: string;
  description: string;
  createdAt: string;
  resolvedAt: string | null;
  resolution: string | null;
  responsible: { id: string; name: string; email: string } | null;
  resolvedBy: { id: string; name: string; email: string } | null;
};

type CatalogImage = {
  id: string;
  filename: string;
  storagePath: string;
  detectionStatus: string;
  detectionStep: string;
  capturedAt: string;
  deviceId: string | null;
  workerId: string | null;
  opBoxId: string | null;
};

function formatDateISO(value: string | Date): string {
  return formatLogImageDatePath(value);
}

function statusBadgeClass(status: string): string {
  if (status === "OPEN") return "bg-amber-100 text-amber-900";
  if (status === "IN_PROGRESS") return "bg-blue-100 text-blue-900";
  if (status === "CLOSED") return "bg-green-100 text-green-900";
  if (status === "INVALID" || status === "ERROR") return "bg-red-100 text-red-900";
  if (status === "TIMEOUT") return "bg-orange-100 text-orange-900";
  return "bg-gray-100 text-gray-800";
}

export function HistoricoOpDetail({
  op,
  boxes,
  activities,
  occurrences,
  catalogImages,
}: {
  op: OpHeader;
  boxes: BoxRow[];
  activities: ActivityRow[];
  occurrences: OccurrenceRow[];
  catalogImages: CatalogImage[];
}) {
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [actionFilter, setActionFilter] = useState("");
  const [detectionFilter, setDetectionFilter] = useState("");
  const [boxFilter, setBoxFilter] = useState("");
  const [pdfLoading, setPdfLoading] = useState(false);
  const [pdfError, setPdfError] = useState<string | null>(null);

  const packedImages = useMemo(() => {
    const items: {
      key: string;
      url: string;
      label: string;
      packedAt: string;
    }[] = [];
    for (const box of boxes) {
      for (const bl of box.blisters) {
        if (!bl.packedAt) continue;
        const path = formatDateISO(bl.packedAt);
        const filename = `OP_${op.id}_BOX_${box.id}_BL_${bl.code}.jpg`;
        items.push({
          key: bl.id,
          url: `/api/images/${filename}?path=${path}`,
          label: `Caixa ${box.code} · Blister ${bl.code}`,
          packedAt: bl.packedAt,
        });
      }
    }
    return items;
  }, [boxes, op.id]);

  const detectionCount = activities.filter(
    (a) =>
      a.actionType === "DETECTION_INVALID" ||
      a.actionType === "DETECTION_TIMEOUT" ||
      a.detectionStatus === "INVALID" ||
      a.detectionStatus === "TIMEOUT"
  ).length;

  const filteredActivities = useMemo(() => {
    return activities.filter((a) => {
      if (actionFilter && a.actionType !== actionFilter) return false;
      if (detectionFilter && a.detectionStatus !== detectionFilter) return false;
      if (boxFilter && !(a.boxId || "").includes(boxFilter.trim())) return false;
      return true;
    });
  }, [activities, actionFilter, detectionFilter, boxFilter]);

  function exportCsv() {
    const header = [
      "createdAt",
      "actionType",
      "detectionStatus",
      "user",
      "boxId",
      "description",
      "imageFilename",
      "storagePath",
    ];
    const rows = filteredActivities.map((a) =>
      [
        a.createdAt,
        a.actionType,
        a.detectionStatus ?? "",
        a.user?.email ?? "",
        a.boxId ?? "",
        JSON.stringify(a.description),
        a.imageFilename ?? "",
        a.storagePath ?? "",
      ].join(",")
    );
    const blob = new Blob([[header.join(","), ...rows].join("\n")], {
      type: "text/csv;charset=utf-8",
    });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = `historico-op-${op.id}.csv`;
    link.click();
    URL.revokeObjectURL(url);
  }

  async function exportPdf() {
    setPdfError(null);
    setPdfLoading(true);
    try {
      const res = await fetch(`/api/historico/ops/${op.id}/report?format=pdf`);
      if (!res.ok) {
        let message = `Falha ao gerar PDF (${res.status})`;
        try {
          const body = await res.json();
          if (body?.error) message = String(body.error);
        } catch {
          /* ignore */
        }
        throw new Error(message);
      }
      const blob = await res.blob();
      const url = URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.href = url;
      link.download = `historico-op-${op.code}-recon.pdf`;
      link.click();
      URL.revokeObjectURL(url);
    } catch (err) {
      setPdfError(
        err instanceof Error ? err.message : "Falha ao gerar PDF do relatório"
      );
    } finally {
      setPdfLoading(false);
    }
  }

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm text-gray-500">Status</CardTitle>
          </CardHeader>
          <CardContent className="text-xl font-semibold">
            {op.status === "COMPLETED" ? "Concluída" : "Pendente"}
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm text-gray-500">Qtd. produzir</CardTitle>
          </CardHeader>
          <CardContent className="text-xl font-semibold">
            {op.quantityToProduce}
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm text-gray-500">Alertas (log)</CardTitle>
          </CardHeader>
          <CardContent className="text-xl font-semibold">{detectionCount}</CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm text-gray-500">Ocorrências</CardTitle>
          </CardHeader>
          <CardContent className="text-xl font-semibold">
            {occurrences.length}
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Cabeçalho</CardTitle>
        </CardHeader>
        <CardContent className="grid grid-cols-1 md:grid-cols-3 gap-3 text-sm">
          <div>
            <span className="text-gray-500">Produto:</span>{" "}
            {op.product?.name ?? "—"} ({op.product?.code ?? "—"})
          </div>
          <div>
            <span className="text-gray-500">Caixa tipo:</span>{" "}
            {op.box?.name ?? "—"}
          </div>
          <div>
            <span className="text-gray-500">Blister tipo:</span>{" "}
            {op.blister?.name ?? "—"}
          </div>
          <div>
            <span className="text-gray-500">Criada em:</span>{" "}
            {new Date(op.createdAt).toLocaleString("pt-BR")}
          </div>
          <div>
            <span className="text-gray-500">Finalizada em:</span>{" "}
            {op.finishedAt
              ? new Date(op.finishedAt).toLocaleString("pt-BR")
              : "—"}
          </div>
        </CardContent>
      </Card>

      <Tabs defaultValue="timeline">
        <div className="flex flex-wrap items-center justify-between gap-3 mb-2">
          <TabsList>
            <TabsTrigger value="timeline">Timeline</TabsTrigger>
            <TabsTrigger value="imagens">Imagens</TabsTrigger>
            <TabsTrigger value="ocorrencias">Ocorrências</TabsTrigger>
            <TabsTrigger value="caixas">Caixas</TabsTrigger>
          </TabsList>
          <div className="flex flex-wrap items-center gap-2">
            <Button
              type="button"
              variant="outline"
              size="sm"
              className="gap-1"
              onClick={exportPdf}
              disabled={pdfLoading}
            >
              {pdfLoading ? (
                <Loader2 className="w-4 h-4 animate-spin" />
              ) : (
                <FileText className="w-4 h-4" />
              )}
              {pdfLoading ? "A gerar PDF…" : "Gerar PDF"}
            </Button>
            <Button
              type="button"
              variant="outline"
              size="sm"
              className="gap-1"
              onClick={exportCsv}
            >
              <Download className="w-4 h-4" />
              Exportar CSV
            </Button>
          </div>
        </div>
        {pdfError ? (
          <p className="text-sm text-red-600 dark:text-red-400 mb-2">{pdfError}</p>
        ) : null}

        <TabsContent value="timeline" className="mt-4 space-y-3">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-2">
            <select
              className="border rounded px-2 py-2 text-sm bg-white dark:bg-gray-800"
              value={actionFilter}
              onChange={(e) => setActionFilter(e.target.value)}
            >
              <option value="">Todos os tipos</option>
              <option value="DETECTION_INVALID">DETECTION_INVALID</option>
              <option value="DETECTION_TIMEOUT">DETECTION_TIMEOUT</option>
              <option value="OCCURRENCE_OPENED">OCCURRENCE_OPENED</option>
              <option value="OCCURRENCE_CLOSED">OCCURRENCE_CLOSED</option>
              <option value="STATUS_CHANGED">STATUS_CHANGED</option>
              <option value="OP_STARTED">OP_STARTED</option>
              <option value="OP_COMPLETED">OP_COMPLETED</option>
            </select>
            <select
              className="border rounded px-2 py-2 text-sm bg-white dark:bg-gray-800"
              value={detectionFilter}
              onChange={(e) => setDetectionFilter(e.target.value)}
            >
              <option value="">Qualquer severidade</option>
              <option value="INVALID">INVALID</option>
              <option value="TIMEOUT">TIMEOUT</option>
              <option value="ERROR">ERROR</option>
              <option value="VALID">VALID</option>
            </select>
            <Input
              placeholder="Filtrar por boxId"
              value={boxFilter}
              onChange={(e) => setBoxFilter(e.target.value)}
            />
          </div>
          <p className="text-xs text-gray-500">
            Exibindo {filteredActivities.length} de {activities.length} eventos
          </p>
          <OpActivityTimeline activities={filteredActivities} />
        </TabsContent>

        <TabsContent value="imagens" className="mt-4 space-y-6">
          <div>
            <h3 className="font-semibold mb-2">Blisters embalados (MinIO / disco)</h3>
            <p className="text-xs text-gray-500 mb-3">
              URLs montadas por convenção de nome; a API busca disco e depois o
              MinIO central (imagens de qualquer worker sincronizado).
            </p>
            {packedImages.length === 0 ? (
              <p className="text-sm text-gray-500">Nenhuma imagem de blister embalado.</p>
            ) : (
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                {packedImages.map((img) => (
                  <button
                    key={img.key}
                    type="button"
                    className="text-left border rounded p-2 hover:bg-gray-50 dark:hover:bg-gray-800"
                    onClick={() => setPreviewUrl(img.url)}
                  >
                    <Image
                      src={img.url}
                      alt={img.label}
                      width={160}
                      height={100}
                      className="w-full h-24 object-cover rounded bg-gray-100"
                      unoptimized
                    />
                    <p className="mt-1 text-xs truncate">{img.label}</p>
                  </button>
                ))}
              </div>
            )}
          </div>

          <div>
            <h3 className="font-semibold mb-2">Catálogo InspectionImage</h3>
            {catalogImages.length === 0 ? (
              <p className="text-sm text-gray-500">
                Ainda sem registros no catálogo (preenchido a partir da Fase 2).
              </p>
            ) : (
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                {catalogImages.map((img) => {
                  const url = `/api/images/${img.filename}?path=${img.storagePath}`;
                  return (
                    <button
                      key={img.id}
                      type="button"
                      className="text-left border rounded p-2 hover:bg-gray-50 dark:hover:bg-gray-800"
                      onClick={() => setPreviewUrl(url)}
                    >
                      <Image
                        src={url}
                        alt={img.filename}
                        width={160}
                        height={100}
                        className="w-full h-24 object-cover rounded bg-gray-100"
                        unoptimized
                      />
                      <div className="mt-1 flex items-center gap-1">
                        <Badge className={`text-[10px] ${statusBadgeClass(img.detectionStatus)}`}>
                          {img.detectionStatus}
                        </Badge>
                      </div>
                      <p className="text-xs truncate">{img.detectionStep}</p>
                      {(img.deviceId || img.workerId) && (
                        <p className="text-[10px] text-gray-500 truncate">
                          {img.deviceId || img.workerId}
                        </p>
                      )}
                    </button>
                  );
                })}
              </div>
            )}
          </div>
        </TabsContent>

        <TabsContent value="ocorrencias" className="mt-4 space-y-3">
          {occurrences.length === 0 ? (
            <Card className="p-6 text-center text-gray-500">
              Nenhuma ocorrência formal registrada ainda.
            </Card>
          ) : (
            occurrences.map((o) => (
              <Card key={o.id} className="p-4">
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <div className="flex items-center gap-2">
                      <span className="font-semibold">
                        #{o.number} — {o.title}
                      </span>
                      <Badge className={statusBadgeClass(o.status)}>{o.status}</Badge>
                    </div>
                    <p className="mt-1 text-sm text-gray-700">{o.description}</p>
                    <p className="mt-2 text-xs text-gray-500">
                      Aberta em {new Date(o.createdAt).toLocaleString("pt-BR")}
                      {o.responsible
                        ? ` · Responsável: ${o.responsible.name}`
                        : ""}
                    </p>
                  </div>
                  <Link
                    href={`/historico/${op.id}/ocorrencias/${o.id}`}
                    className="text-sm text-blue-700 hover:underline whitespace-nowrap"
                  >
                    Detalhe
                  </Link>
                </div>
              </Card>
            ))
          )}
        </TabsContent>

        <TabsContent value="caixas" className="mt-4 space-y-3">
          {boxes.map((box) => (
            <Card key={box.id} className="p-4">
              <div className="flex justify-between text-sm font-medium">
                <span>
                  Caixa {box.code} · {box.status}
                </span>
                <span className="text-gray-500">
                  {box.blisters.filter((b) => b.packedAt).length}/
                  {box.blisters.length} blisters
                </span>
              </div>
              {box.barCode && (
                <p className="text-xs text-gray-500 mt-1">Etiqueta: {box.barCode}</p>
              )}
            </Card>
          ))}
        </TabsContent>
      </Tabs>

      {previewUrl && (
        <div
          className="fixed inset-0 z-50 bg-black/70 flex items-center justify-center p-4"
          onClick={() => setPreviewUrl(null)}
          onKeyDown={(e) => e.key === "Escape" && setPreviewUrl(null)}
          role="button"
          tabIndex={0}
        >
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={previewUrl}
            alt="Preview"
            className="max-h-[90vh] max-w-[90vw] rounded shadow-lg"
          />
        </div>
      )}
    </div>
  );
}
