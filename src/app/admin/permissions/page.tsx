// Admin > Permissões: visão inicial (somente leitura)
import db from "@/providers/database";
import { requireAdmin } from "@/shared/auth/permissions";

export const dynamic = "force-dynamic";

export default async function AdminPermissionsPage() {
  await requireAdmin();

  // Carrega permissões e mapeamento por role
  const perms = await db.permission.findMany({ orderBy: { name: "asc" } });
  const roleMap = {
    OPERATOR: new Set<number>(),
    SUPERVISOR: new Set<number>(),
    ADMIN: new Set<number>(),
  } as const;

  const rolePerms = await db.rolePermission.findMany();
  for (const rp of rolePerms) {
    if ((roleMap as any)[rp.role]) (roleMap as any)[rp.role].add(rp.permissionId);
  }

  return (
    <div className="p-6 space-y-4">
      <h1 className="text-2xl font-semibold">Permissões</h1>
      <p className="text-sm text-gray-600">Somente leitura por enquanto. Em breve: alternar permissões por role.</p>

      <table className="min-w-full text-sm">
        <thead>
          <tr className="text-left border-b">
            <th className="py-2 pr-4">Permissão</th>
            <th className="py-2 pr-4">Descrição</th>
            <th className="py-2 pr-4">Operator</th>
            <th className="py-2 pr-4">Supervisor</th>
            <th className="py-2 pr-4">Admin</th>
          </tr>
        </thead>
        <tbody>
          {perms.map((p) => (
            <tr key={p.id} className="border-b">
              <td className="py-1 pr-4">{p.name}</td>
              <td className="py-1 pr-4">{p.description}</td>
              <td className="py-1 pr-4">{roleMap.OPERATOR.has(p.id) ? "✅" : "—"}</td>
              <td className="py-1 pr-4">{roleMap.SUPERVISOR.has(p.id) ? "✅" : "—"}</td>
              <td className="py-1 pr-4">{roleMap.ADMIN.has(p.id) ? "✅" : "—"}</td>
            </tr>
          ))}
        </tbody>
      </table>

      {/* Próximos passos nesta página:
        - Ação de alternar (toggle) permissões por role (create/delete RolePermission)
        - Auditoria das mudanças de permissão (logAction)
      */}
    </div>
  );
}

