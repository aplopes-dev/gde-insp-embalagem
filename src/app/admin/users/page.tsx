// Admin > Usuários: listagem inicial com proteções e comentários em PT-BR
import db from "@/providers/database";
import { requireAdmin } from "@/shared/auth/permissions";

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
    <div className="p-6 space-y-4">
      <h1 className="text-2xl font-semibold">Usuários</h1>
      <p className="text-sm text-gray-600">Listagem simples. Em seguida adicionaremos criação/edição/reset de senha.</p>

      <table className="min-w-full text-sm">
        <thead>
          <tr className="text-left border-b">
            <th className="py-2 pr-4">ID</th>
            <th className="py-2 pr-4">Username</th>
            <th className="py-2 pr-4">E-mail</th>
            <th className="py-2 pr-4">Perfil</th>
            <th className="py-2 pr-4">Criado em</th>
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
            </tr>
          ))}
        </tbody>
      </table>

      {/* Próximos passos nesta página:
        - Formulário para criar usuário (username, email, senha com política, role)
        - Ação de editar role
        - Ação de reset de senha
        - Paginação e filtros
        - Auditoria de cada ação (logAction)
      */}
    </div>
  );
}

