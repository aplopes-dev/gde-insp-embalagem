// Admin > Usuários: listagem inicial com proteções e comentários em PT-BR
import db from "@/providers/database";
import { requireAdmin } from "@/shared/auth/permissions";
import { createUserAction, resetUserPasswordAction, updateUserRoleAction } from "./actions";

export const dynamic = "force-dynamic"; // garantir SSR sempre

export default async function AdminUsersPage() {
  // Garante acesso apenas para ADMIN (política inicial)
  await requireAdmin();

  // Busca lista simples de usuários (sem paginação por enquanto)
  const users = await db.user.findMany({
    select: { id: true, username: true, email: true, role: true, createdAt: true },
    orderBy: { createdAt: "desc" },
  });

  return (
    <div className="p-6 space-y-6">
      <h1 className="text-2xl font-semibold">Usuários</h1>
      <p className="text-sm text-gray-600">Listagem com formulários simples para criar usuário, alterar perfil e resetar senha.</p>

      {/* Criar usuário */}
      <section className="space-y-2">
        <h2 className="text-lg font-medium">Criar usuário</h2>
        <form action={createUserAction} className="flex flex-wrap gap-2">
          <input required name="username" placeholder="username" className="border px-2 py-1" />
          <input required name="email" type="email" placeholder="email" className="border px-2 py-1" />
          <input required name="password" type="password" placeholder="senha (política)" className="border px-2 py-1" />
          <select name="role" defaultValue="OPERATOR" className="border px-2 py-1">
            <option value="OPERATOR">OPERATOR</option>
            <option value="SUPERVISOR">SUPERVISOR</option>
            <option value="ADMIN">ADMIN</option>
          </select>
          <button type="submit" className="bg-blue-600 text-white px-3 py-1 rounded">Criar</button>
        </form>
      </section>

      <table className="min-w-full text-sm">
        <thead>
          <tr className="text-left border-b">
            <th className="py-2 pr-4">ID</th>
            <th className="py-2 pr-4">Username</th>
            <th className="py-2 pr-4">E-mail</th>
            <th className="py-2 pr-4">Perfil</th>
            <th className="py-2 pr-4">Criado em</th>
            <th className="py-2 pr-4">Ações</th>
          </tr>
        </thead>
        <tbody>
          {users.map((u) => (
            <tr key={u.id} className="border-b">
              <td className="py-1 pr-4">{u.id}</td>
              <td className="py-1 pr-4">{u.username}</td>
              <td className="py-1 pr-4">{u.email}</td>
              <td className="py-1 pr-4">{u.role}</td>
              <td className="py-1 pr-4">{new Date(u.createdAt).toLocaleString()}</td>
              <td className="py-1 pr-4">
                {/* Alterar perfil */}
                <form action={updateUserRoleAction} className="flex items-center gap-2">
                  <input type="hidden" name="userId" value={u.id} />
                  <select name="role" defaultValue={u.role} className="border px-2 py-1">
                    <option value="OPERATOR">OPERATOR</option>
                    <option value="SUPERVISOR">SUPERVISOR</option>
                    <option value="ADMIN">ADMIN</option>
                  </select>
                  <button type="submit" className="border px-2 py-1 rounded">Atualizar</button>
                </form>
                {/* Reset senha */}
                <form action={resetUserPasswordAction} className="mt-2 flex items-center gap-2">
                  <input type="hidden" name="userId" value={u.id} />
                  <input required name="password" type="password" placeholder="nova senha" className="border px-2 py-1" />
                  <button type="submit" className="border px-2 py-1 rounded">Resetar senha</button>
                </form>
              </td>
            </tr>
          ))}
        </tbody>
      </table>

      {/* Próximos passos nesta página:
        - Paginação e filtros
        - Feedback de sucesso/erro (toasts)
        - Auditoria mostrando autor (quando evoluirmos requireAdmin para informar o userId do autor)
      */}
    </div>
  );
}

