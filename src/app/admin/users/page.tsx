// Admin > Usuários: listagem com UI padrão
import db from "@/providers/database";
import { requireAdmin } from "@/shared/auth/permissions";
import { createUserAction, resetUserPasswordAction, updateUserRoleAction } from "./actions";
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Table, TableHeader, TableRow, TableHead, TableBody, TableCell } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import Link from "next/link";

export const dynamic = "force-dynamic"; // garantir SSR sempre

export default async function AdminUsersPage({ searchParams }: { searchParams: Record<string, string | string[] | undefined> }) {
  await requireAdmin();

  const page = Math.max(1, Number(searchParams.page || 1));
  const perPage = Math.min(100, Math.max(5, Number(searchParams.perPage || 20)));
  const skip = (page - 1) * perPage;

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
      {searchParams.ok && (
        <div className="rounded border border-green-400 bg-green-100 text-green-900 px-3 py-2 text-sm inline-block">
          {typeof searchParams.msg === "string" ? searchParams.msg : "Operação realizada com sucesso."}
        </div>
      )}

      <Card>
        <CardHeader>
          <CardTitle>Usuários</CardTitle>
          <CardDescription>Filtros por texto e perfil, com paginação</CardDescription>
        </CardHeader>
        <CardContent>
          <form method="GET" className="grid gap-2 sm:grid-cols-2 lg:grid-cols-6 items-end">
            <div className="space-y-1">
              <div className="text-xs text-muted-foreground">Busca</div>
              <Input name="q" placeholder="username ou e-mail" defaultValue={q} />
            </div>
            <div className="space-y-1">
              <div className="text-xs text-muted-foreground">Perfil</div>
              <select name="role" defaultValue={fRole} className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm">
                <option value="">Todos</option>
                <option value="OPERATOR">OPERATOR</option>
                <option value="SUPERVISOR">SUPERVISOR</option>
                <option value="ADMIN">ADMIN</option>
              </select>
            </div>
            <div className="space-y-1">
              <div className="text-xs text-muted-foreground">Por página</div>
              <Input name="perPage" type="number" min={5} max={100} defaultValue={perPage} />
            </div>
            <input type="hidden" name="page" value={1} />
            <Button type="submit">Filtrar</Button>
          </form>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Criar usuário</CardTitle>
          <CardDescription>Senha segue política definida</CardDescription>
        </CardHeader>
        <CardContent>
          <form action={createUserAction} className="grid gap-2 sm:grid-cols-2 lg:grid-cols-5">
            <Input required name="username" placeholder="username" />
            <Input required name="email" type="email" placeholder="email" />
            <Input required name="password" type="password" placeholder="senha (política)" />
            <select name="role" defaultValue="OPERATOR" className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm">
              <option value="OPERATOR">OPERATOR</option>
              <option value="SUPERVISOR">SUPERVISOR</option>
              <option value="ADMIN">ADMIN</option>
            </select>
            <Button type="submit">Criar</Button>
          </form>
        </CardContent>
      </Card>

      <Card>
        <CardContent className="pt-6">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>ID</TableHead>
                <TableHead>Username</TableHead>
                <TableHead>E-mail</TableHead>
                <TableHead>Perfil</TableHead>
                <TableHead>Criado em</TableHead>
                <TableHead>Ações</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {users.map((u) => (
                <TableRow key={u.id}>
                  <TableCell>{u.id}</TableCell>
                  <TableCell className="font-medium">{u.username}</TableCell>
                  <TableCell>{u.email}</TableCell>
                  <TableCell>
                    <Badge variant="secondary">{u.role}</Badge>
                  </TableCell>
                  <TableCell className="whitespace-nowrap">{new Date(u.createdAt).toLocaleString()}</TableCell>
                  <TableCell>
                    <div className="flex flex-col gap-2">
                      <form action={updateUserRoleAction} className="flex items-center gap-2">
                        <input type="hidden" name="userId" value={u.id} />
                        <select name="role" defaultValue={u.role} className="flex h-10 rounded-md border border-input bg-background px-3 py-2 text-sm">
                          <option value="OPERATOR">OPERATOR</option>
                          <option value="SUPERVISOR">SUPERVISOR</option>
                          <option value="ADMIN">ADMIN</option>
                        </select>
                        <Button type="submit" variant="outline" size="sm">Atualizar</Button>
                      </form>
                      <form action={resetUserPasswordAction} className="flex items-center gap-2">
                        <input type="hidden" name="userId" value={u.id} />
                        <Input required name="password" type="password" placeholder="nova senha" className="max-w-xs" />
                        <Button type="submit" variant="secondary" size="sm">Resetar senha</Button>
                      </form>
                    </div>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>

          <div className="flex items-center justify-between pt-4 text-sm">
            <div>
              Total: {total} • Página {page} de {Math.max(1, Math.ceil(total / perPage))}
            </div>
            <div className="flex gap-2">
              <Button asChild variant="outline" size="sm" className={page <= 1 ? "pointer-events-none opacity-50" : ""}>
                <Link href={`?q=${encodeURIComponent(q)}&role=${fRole}&page=${page - 1}&perPage=${perPage}`}>Anterior</Link>
              </Button>
              <Button asChild variant="outline" size="sm" className={(skip + users.length) >= total ? "pointer-events-none opacity-50" : ""}>
                <Link href={`?q=${encodeURIComponent(q)}&role=${fRole}&page=${page + 1}&perPage=${perPage}`}>Próxima</Link>
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
