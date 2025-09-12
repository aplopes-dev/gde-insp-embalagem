// Admin > Permissões: visão inicial (somente leitura)
import db from "@/providers/database";
import { requireAdmin } from "@/shared/auth/permissions";
import { toggleRolePermissionAction } from "./actions";

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

  const roles = ["OPERATOR", "SUPERVISOR", "ADMIN"] as const;

  return (
    <div className="p-6 space-y-4">
      <h1 className="text-2xl font-semibold">Permissões</h1>
      <p className="text-sm text-gray-600">Altere as permissões por perfil (RBAC). Alterações são aplicadas imediatamente.</p>

      <table className="min-w-full text-sm">
        <thead>
          <tr className="text-left border-b">
            <th className="py-2 pr-4">Permissão</th>
            <th className="py-2 pr-4">Descrição</th>
            {roles.map(r => (
              <th key={r} className="py-2 pr-4">{r}</th>
            ))}
          </tr>
        </thead>
        <tbody>
          {perms.map((p) => (
            <tr key={p.id} className="border-b">
              <td className="py-1 pr-4">{p.name}</td>
              <td className="py-1 pr-4">{p.description}</td>
              {roles.map((r) => {
                const checked = (roleMap as any)[r].has(p.id);
                return (
                  <td key={r} className="py-1 pr-4">
                    <form action={toggleRolePermissionAction}>
                      <input type="hidden" name="permissionId" value={p.id} />
                      <input type="hidden" name="role" value={r} />
                      <input type="hidden" name="enabled" value={(!checked).toString()} />
                      <button type="submit" className="border px-2 py-0.5 rounded">
                        {checked ? "Desativar" : "Ativar"}
                      </button>
                    </form>
                  </td>
                );
              })}
            </tr>
          ))}
        </tbody>
      </table>

      {/* Próximos passos nesta página:
        - Trocar botões por checkboxes com otimização UX
        - Auditoria das mudanças de permissão (já implementada no servidor)
      */}
    </div>
  );
}

