// Painel administrativo: home com links para seções
// Protegido via middleware e por checagem de role (SSR)

import { requireAdmin } from "@/shared/auth/permissions";

export const dynamic = "force-dynamic";

export default async function AdminHome() {
  await requireAdmin();
  return (
    <div className="p-6 space-y-4">
      <h1 className="text-2xl font-semibold">Administração</h1>
      <p className="text-sm text-gray-600">Escolha uma seção abaixo:</p>

      <ul className="list-disc pl-6 space-y-1">
        <li>
          <a className="text-blue-700 underline" href="/admin/users">Usuários</a>
          <span className="ml-2 text-xs text-gray-600">CRUD, filtros e política de senha</span>
        </li>
        <li>
          <a className="text-blue-700 underline" href="/admin/permissions">Permissões</a>
          <span className="ml-2 text-xs text-gray-600">Matriz RBAC por perfil</span>
        </li>
        <li>
          <a className="text-blue-700 underline" href="/admin/audit">Auditoria</a>
          <span className="ml-2 text-xs text-gray-600">Histórico de ações (before/after)</span>
        </li>
      </ul>
    </div>
  );
}

