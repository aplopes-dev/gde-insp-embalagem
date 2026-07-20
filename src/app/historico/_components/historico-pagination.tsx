import Link from "next/link";
import { Button } from "@/components/ui/button";
import { ChevronsLeft, ChevronsRight, ChevronLeft, ChevronRight } from "lucide-react";

function buildHref(base: {
  q: string;
  status: string;
  limit: number;
  page: number;
}) {
  const params = new URLSearchParams();
  if (base.q) params.set("q", base.q);
  if (base.status) params.set("status", base.status);
  if (base.limit !== 20) params.set("limit", String(base.limit));
  if (base.page > 1) params.set("page", String(base.page));
  const qs = params.toString();
  return qs ? `/historico?${qs}` : "/historico";
}

export function HistoricoPagination({
  page,
  limit,
  total,
  q,
  status,
}: {
  page: number;
  limit: number;
  total: number;
  q: string;
  status: string;
}) {
  const totalPages = Math.max(1, Math.ceil(total / limit));
  const safePage = Math.min(Math.max(1, page), totalPages);
  const from = total === 0 ? 0 : (safePage - 1) * limit + 1;
  const to = Math.min(safePage * limit, total);

  const common = { q, status, limit };

  return (
    <div className="mt-6 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
      <p className="text-sm text-gray-600 dark:text-gray-400">
        {total === 0
          ? "Nenhuma OP"
          : `Mostrando ${from}–${to} de ${total} OP${total === 1 ? "" : "s"}`}
      </p>

      <div className="flex flex-wrap items-center gap-2">
        <div className="flex items-center gap-1">
          <Button
            asChild
            variant="outline"
            size="sm"
            disabled={safePage <= 1}
            className={safePage <= 1 ? "pointer-events-none opacity-50" : ""}
          >
            <Link
              href={buildHref({ ...common, page: 1 })}
              aria-label="Primeira página"
              title="Primeira página"
            >
              <ChevronsLeft className="h-4 w-4" />
            </Link>
          </Button>
          <Button
            asChild
            variant="outline"
            size="sm"
            disabled={safePage <= 1}
            className={safePage <= 1 ? "pointer-events-none opacity-50" : ""}
          >
            <Link
              href={buildHref({ ...common, page: safePage - 1 })}
              aria-label="Anterior"
              title="Anterior"
            >
              <ChevronLeft className="h-4 w-4" />
            </Link>
          </Button>

          <span className="px-2 text-sm text-gray-800 dark:text-gray-200 tabular-nums">
            {safePage} / {totalPages}
          </span>

          <Button
            asChild
            variant="outline"
            size="sm"
            disabled={safePage >= totalPages}
            className={
              safePage >= totalPages ? "pointer-events-none opacity-50" : ""
            }
          >
            <Link
              href={buildHref({ ...common, page: safePage + 1 })}
              aria-label="Próxima"
              title="Próxima"
            >
              <ChevronRight className="h-4 w-4" />
            </Link>
          </Button>
          <Button
            asChild
            variant="outline"
            size="sm"
            disabled={safePage >= totalPages}
            className={
              safePage >= totalPages ? "pointer-events-none opacity-50" : ""
            }
          >
            <Link
              href={buildHref({ ...common, page: totalPages })}
              aria-label="Última página"
              title="Última página"
            >
              <ChevronsRight className="h-4 w-4" />
            </Link>
          </Button>
        </div>

        <div className="flex items-center gap-1 text-sm">
          <span className="text-gray-500 dark:text-gray-400">Por página</span>
          {[20, 50, 100].map((size) => (
            <Link
              key={size}
              href={buildHref({ ...common, limit: size, page: 1 })}
              className={`px-2 py-1 rounded border text-xs ${
                limit === size
                  ? "bg-slate-700 text-white border-slate-700"
                  : "bg-white dark:bg-gray-800 border-gray-300 dark:border-gray-600 text-gray-800 dark:text-gray-200 hover:bg-gray-50 dark:hover:bg-gray-700"
              }`}
            >
              {size}
            </Link>
          ))}
        </div>
      </div>
    </div>
  );
}
