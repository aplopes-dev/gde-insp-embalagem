// Admin > Auditoria: listagem inicial (com filtros básicos em práticas futuras)
import db from "@/providers/database";
import { requireAdmin } from "@/shared/auth/permissions";

export const dynamic = "force-dynamic";

export default async function AdminAuditPage() {
  await requireAdmin();

  // Traz os últimos 50 eventos de auditoria, mais novos primeiro
  const logs = await db.auditLog.findMany({
    orderBy: { createdAt: "desc" },
    take: 50,
    include: { user: { select: { id: true, username: true, email: true } } },
  });

  return (
    <div className="p-6 space-y-4">
      <h1 className="text-2xl font-semibold">Auditoria</h1>
      <p className="text-sm text-gray-600">Listagem dos últimos eventos. Em breve: filtros por entidade/usuário/intervalo.</p>

      <table className="min-w-full text-sm">
        <thead>
          <tr className="text-left border-b">
            <th className="py-2 pr-4">Quando</th>
            <th className="py-2 pr-4">Usuário</th>
            <th className="py-2 pr-4">Ação</th>
            <th className="py-2 pr-4">Entidade</th>
            <th className="py-2 pr-4">ID</th>
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
            </tr>
          ))}
        </tbody>
      </table>

      {/* Próximos passos:
        - Filtros por período, entidade, usuário, ação
        - Paginação
        - Link para detalhes (before/after em modal)
      */}
    </div>
  );
}

