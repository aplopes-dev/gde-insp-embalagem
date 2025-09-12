// Admin > Usuários: listagem inicial com proteções e comentários em PT-BR
import db from "@/providers/database";
import { requireAdmin } from "@/shared/auth/permissions";
import { createUserAction, resetUserPasswordAction, updateUserRoleAction } from "./actions";

export const dynamic = "force-dynamic"; // garantir SSR sempre

export default async function AdminUsersPage({ searchParams }: { searchParams: Record<string, string | string[] | undefined> }) {
  // Garante acesso apenas para ADMIN (política inicial)
  await requireAdmin();

  // Paginação simples via querystring (?page=&perPage=)
  const page = Math.max(1, Number(searchParams.page || 1));
  const perPage = Math.min(100, Math.max(5, Number(searchParams.perPage || 20)));
  const skip = (page - 1) * perPage;

  // Filtros (?q=texto&role=ROLE)
  const q = ((searchParams.q as string) || "").trim();
  const fRole = (searchParams.role as string) || "";
  const where: any = {};
  if (q) {
    where.OR = [
      { username: { contains: q, mode: "insensitive" } },
      { email: { contains: q, mode: "insensitive" } },
    ];
  }
  if (fRole) where.role = fRole as any;

  // Busca lista paginada de usuários com filtros
  const [total, users] = await Promise.all([
    db.user.count({ where }),
    db.user.findMany({
      where,
      select: { id: true, username: true, email: true, role: true, createdAt: true },
      orderBy: { createdAt: "desc" },
      skip,
      take: perPage,
    }),
  ]);

  return (
    <div className="p-6 space-y-6">
      <h1 className="text-2xl font-semibold">Usuários</h1>
      <p className="text-sm text-gray-600">Listagem com formulários simples para criar usuário, alterar perfil e resetar senha.</p>

      {/* Feedback simples por querystring (?ok=1&msg=...) */}
      {searchParams.ok && (
        <div className="rounded border border-green-600 bg-green-50 text-green-800 px-3 py-2 text-sm inline-block">
          {typeof searchParams.msg === "string" ? searchParams.msg : "Operação realizada com sucesso."}
        </div>
      )}

      {/* Filtros */}
      <form method="GET" className="flex flex-wrap gap-2 items-end">
        <div className="flex flex-col">
          <label className="text-xs text-gray-600">Busca</label>
          <input name="q" placeholder="username ou e-mail" defaultValue={q} className="border px-2 py-1" />
        </div>
        <div className="flex flex-col">
          <label className="text-xs text-gray-600">Perfil</label>
          <select name="role" defaultValue={fRole} className="border px-2 py-1">
            <option value="">Todos</option>
            <option value="OPERATOR">OPERATOR</option>
            <option value="SUPERVISOR">SUPERVISOR</option>
            <option value="ADMIN">ADMIN</option>
          </select>
        </div>
        <div className="flex flex-col">
          <label className="text-xs text-gray-600">Por página</label>
          <input name="perPage" type="number" min={5} max={100} defaultValue={perPage} className="border px-2 py-1 w-24" />
        </div>
        <input type="hidden" name="page" value={1} />
        <button type="submit" className="bg-gray-800 text-white px-3 py-1 rounded">Filtrar</button>
      </form>

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

      {/* Pager simples */}
      <div className="flex items-center justify-between pt-4 text-sm">
        <div>
          Total: {total} • Página {page} de {Math.max(1, Math.ceil(total / perPage))}
        </div>
        <div className="flex gap-2">
          <a className={`border px-2 py-1 rounded ${page <= 1 ? "opacity-50 pointer-events-none" : ""}`} href={`?q=${encodeURIComponent(q)}&role=${fRole}&page=${page - 1}&perPage=${perPage}`}>Anterior</a>
          <a className={`border px-2 py-1 rounded ${(skip + users.length) >= total ? "opacity-50 pointer-events-none" : ""}`} href={`?q=${encodeURIComponent(q)}&role=${fRole}&page=${page + 1}&perPage=${perPage}`}>Próxima</a>
        </div>
      </div>

      {/* Próximos passos nesta página:
        - Filtros por texto/role
        - Feedback de sucesso/erro (toasts)
        - Auditoria mostrando autor (já registrando actorUserId nas actions)
      */}
    </div>
  );
}

