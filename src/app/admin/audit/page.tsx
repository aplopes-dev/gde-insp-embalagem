// Admin > Auditoria: listagem inicial (com filtros básicos em práticas futuras)
import db from "@/providers/database";
import { requireAdmin } from "@/shared/auth/permissions";

export const dynamic = "force-dynamic";

export default async function AdminAuditPage({ searchParams }: { searchParams: Record<string, string | string[] | undefined> }) {
  await requireAdmin();

  const qEntity = (searchParams.entity as string) || "";
  const qAction = (searchParams.action as string) || "";
  const qUserId = Number(searchParams.userId || "");

  // Paginação simples (?page=&perPage=)
  const page = Math.max(1, Number(searchParams.page || 1));
  const perPage = Math.min(200, Math.max(5, Number(searchParams.perPage || 50)));
  const skip = (page - 1) * perPage;

  const where: any = {};
  if (qEntity) where.entity = qEntity;
  if (qAction) where.action = qAction;
  if (!Number.isNaN(qUserId) && qUserId > 0) where.userId = qUserId;

  const [total, logs] = await Promise.all([
    db.auditLog.count({ where }),
    db.auditLog.findMany({
      where,
      orderBy: { createdAt: "desc" },
      skip,
      take: perPage,
      include: { user: { select: { id: true, username: true, email: true } } },
    }),
  ]);

  return (
    <div className="p-6 space-y-4">
      <h1 className="text-2xl font-semibold">Auditoria</h1>
      <p className="text-sm text-gray-600">Filtros básicos por entidade/ação/usuário e paginação.</p>

      <form method="GET" className="flex flex-wrap gap-2">
        <input name="entity" placeholder="Entidade (ex.: Op, User)" defaultValue={qEntity} className="border px-2 py-1" />
        <input name="action" placeholder="Ação (ex.: CREATE_OP)" defaultValue={qAction} className="border px-2 py-1" />
        <input name="userId" type="number" placeholder="User ID" defaultValue={Number.isNaN(qUserId) ? "" : qUserId} className="border px-2 py-1 w-28" />
        <input name="page" type="number" placeholder="Página" defaultValue={page} className="border px-2 py-1 w-24" />
        <input name="perPage" type="number" placeholder="Por página" defaultValue={perPage} className="border px-2 py-1 w-28" />
        <button type="submit" className="bg-gray-800 text-white px-3 py-1 rounded">Filtrar</button>
      </form>

      <table className="min-w-full text-sm">
        <thead>
          <tr className="text-left border-b">
            <th className="py-2 pr-4">Quando</th>
            <th className="py-2 pr-4">Usuário</th>
            <th className="py-2 pr-4">Ação</th>
            <th className="py-2 pr-4">Entidade</th>
            <th className="py-2 pr-4">ID</th>
            <th className="py-2 pr-4">Detalhes</th>
          </tr>
        </thead>
        <tbody>
          {logs.map((l) => (
            <tr key={l.id} className="border-b align-top">
              <td className="py-1 pr-4 whitespace-nowrap">{new Date(l.createdAt).toLocaleString()}</td>
              <td className="py-1 pr-4">{l.user?.username || l.user?.email || l.userId}</td>
              <td className="py-1 pr-4">{l.action}</td>
              <td className="py-1 pr-4">{l.entity}</td>
              <td className="py-1 pr-4">{l.entityId}</td>
              <td className="py-1 pr-4">
                <details>
                  <summary className="cursor-pointer select-none text-blue-700">ver</summary>
                  <div className="mt-1 grid grid-cols-2 gap-4 max-w-3xl">
                    <div>
                      <div className="text-xs text-gray-500">Antes</div>
                      <pre className="text-xs overflow-auto bg-gray-50 p-2 rounded border">{JSON.stringify(l.before, null, 2)}</pre>
                    </div>
                    <div>
                      <div className="text-xs text-gray-500">Depois</div>
                      <pre className="text-xs overflow-auto bg-gray-50 p-2 rounded border">{JSON.stringify(l.after, null, 2)}</pre>
                    </div>
                  </div>
                </details>
              </td>
            </tr>
          ))}
        </tbody>
      </table>

      {/* Pager */}
      <div className="flex items-center justify-between pt-4 text-sm">
        <div>
          Total: {total} • Página {page} de {Math.max(1, Math.ceil(total / perPage))}
        </div>
        <div className="flex gap-2">
          <a className={`border px-2 py-1 rounded ${page <= 1 ? "opacity-50 pointer-events-none" : ""}`} href={`?entity=${qEntity}&action=${qAction}&userId=${Number.isNaN(qUserId) ? "" : qUserId}&page=${page - 1}&perPage=${perPage}`}>Anterior</a>
          <a className={`border px-2 py-1 rounded ${(skip + logs.length) >= total ? "opacity-50 pointer-events-none" : ""}`} href={`?entity=${qEntity}&action=${qAction}&userId=${Number.isNaN(qUserId) ? "" : qUserId}&page=${page + 1}&perPage=${perPage}`}>Próxima</a>
        </div>
      </div>

      {/* Próximos passos:
        - Mais filtros (intervalo de datas)
        - Visualizar detalhes (before/after em modal)
      */}
    </div>
  );
}

