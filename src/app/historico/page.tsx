import Link from "next/link";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { History } from "lucide-react";
import db from "@/providers/database";
import { HistoricoSearchForm } from "./_components/historico-search-form";
import { HistoricoPagination } from "./_components/historico-pagination";
import type { Prisma } from "@prisma/client";

export const dynamic = "force-dynamic";

const DEFAULT_LIMIT = 20;
const MAX_LIMIT = 100;

function buildOpWhere(
  q: string,
  status: string
): Prisma.OpWhereInput {
  const where: Prisma.OpWhereInput = {};

  if (status === "PENDING" || status === "COMPLETED") {
    where.status = status;
  }

  if (q) {
    // Filtro principal: ID interno da OP. Código (número) fica como fallback.
    if (/^\d+$/.test(q)) {
      const id = Number.parseInt(q, 10);
      if (Number.isFinite(id)) {
        where.OR = [
          { id },
          { code: { equals: q, mode: "insensitive" } },
        ];
      }
    } else {
      where.OR = [
        { code: { equals: q, mode: "insensitive" } },
        { code: { contains: q, mode: "insensitive" } },
      ];
    }
  }

  return where;
}

export default async function HistoricoPage({
  searchParams,
}: {
  searchParams?: { q?: string; status?: string; page?: string; limit?: string };
}) {
  const q = searchParams?.q?.trim() || "";
  const status = searchParams?.status?.trim() || "";
  const limit = Math.min(
    MAX_LIMIT,
    Math.max(1, Number.parseInt(searchParams?.limit || "", 10) || DEFAULT_LIMIT)
  );
  const pageRaw = Math.max(
    1,
    Number.parseInt(searchParams?.page || "", 10) || 1
  );

  const where = buildOpWhere(q, status);
  const total = await db.op.count({ where });
  const totalPages = Math.max(1, Math.ceil(total / limit));
  const page = Math.min(pageRaw, totalPages);

  const ops = await db.op.findMany({
    where,
    orderBy: { createdAt: "desc" },
    skip: (page - 1) * limit,
    take: limit,
    include: {
      product: { select: { name: true, code: true } },
      _count: {
        select: {
          OpOccurrences: true,
          InspectionImages: true,
        },
      },
    },
  });

  const activityCounts =
    ops.length === 0
      ? []
      : await db.opActivityLog.groupBy({
          by: ["opId"],
          _count: { _all: true },
          where: {
            opId: { in: ops.map((op) => op.id) },
          },
        });

  const activityByOp = new Map(
    activityCounts.map((row) => [row.opId, row._count._all])
  );

  return (
    <>
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-gray-900 dark:text-gray-100">
          Histórico de Ocorrências
        </h1>
        <p className="mt-2 text-sm text-gray-600 dark:text-gray-400">
          Consulta somente leitura do fluxo de embalagem por OP. Imagens vêm do
          MinIO central (workers remotos sincronizam para o mesmo bucket).
        </p>
      </div>

      <div className="mb-6">
        <HistoricoSearchForm initialQ={q} initialStatus={status} />
      </div>

      {ops.length === 0 ? (
        <Card>
          <CardContent className="py-12 text-center text-gray-600 dark:text-gray-400">
            Nenhuma OP encontrada
            {q || status ? " para os filtros informados" : ""}.
          </CardContent>
        </Card>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {ops.map((op) => (
            <Card key={op.id} className="hover:shadow-lg transition-shadow">
              <CardHeader>
                <CardTitle className="text-lg">OP ID {op.id}</CardTitle>
                <CardDescription>
                  Código: {op.code}
                  {op.product?.name ? ` · ${op.product.name}` : ""}
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-2 text-sm">
                  <div className="flex justify-between">
                    <span className="text-gray-600 dark:text-gray-400">Status</span>
                    <span
                      className={`font-semibold px-2 py-1 rounded text-xs ${
                        op.status === "PENDING"
                          ? "bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-200"
                          : "bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-200"
                      }`}
                    >
                      {op.status === "PENDING" ? "Pendente" : "Concluída"}
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-600 dark:text-gray-400">
                      Eventos
                    </span>
                    <span className="font-semibold">
                      {activityByOp.get(op.id) ?? 0}
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-600 dark:text-gray-400">
                      Ocorrências
                    </span>
                    <span className="font-semibold">
                      {op._count.OpOccurrences}
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-600 dark:text-gray-400">
                      Imagens (catálogo)
                    </span>
                    <span className="font-semibold">
                      {op._count.InspectionImages}
                    </span>
                  </div>
                </div>

                <Link href={`/historico/${op.id}`} className="block w-full">
                  <Button className="w-full gap-2 bg-slate-700 hover:bg-slate-800">
                    <History className="w-4 h-4" />
                    Abrir histórico
                  </Button>
                </Link>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      <HistoricoPagination
        page={page}
        limit={limit}
        total={total}
        q={q}
        status={status}
      />
    </>
  );
}
