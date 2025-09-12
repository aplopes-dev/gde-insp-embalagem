// Admin > Auditoria: listagem com linguagem natural, selects e filtro por data
import db from "@/providers/database";
import { requireAdmin } from "@/shared/auth/permissions";
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Table, TableHeader, TableRow, TableHead, TableBody, TableCell } from "@/components/ui/table";

export const dynamic = "force-dynamic";

function humanizeAction(a: string): string {
  const map: Record<string, string> = {
    TOGGLE_ROLE_PERMISSION: "Alterar permissão de perfil",
    UPDATE_USER_ROLE: "Alterar perfil do usuário",
    CREATE_USER: "Criar usuário",
    RESET_PASSWORD: "Redefinir senha",
    LOGIN: "Login",
    LOGOUT: "Logout",
  };
  if (map[a]) return map[a];
  // fallback: "CREATE_OP" -> "Criar op"
  const pretty = a
    .toLowerCase()
    .split("_")
    .map((w, i) => (i === 0 ? w.charAt(0).toUpperCase() + w.slice(1) : w))
    .join(" ");
  return pretty;
}

function humanizeEntity(e?: string | null): string {
  const map: Record<string, string> = {
    User: "Usuário",
    Permission: "Permissão",
    RolePermission: "Permissão de Perfil",
    Op: "Ordem de Produção",
  };
  if (!e) return "—";
  return map[e] || e;
}

export default async function AdminAuditPage({ searchParams }: { searchParams: Record<string, string | string[] | undefined> }) {
  await requireAdmin();

  const qEntity = (searchParams.entity as string) || "";
  const qAction = (searchParams.action as string) || "";
  const qUserId = Number(searchParams.userId || "");
  const startDate = (searchParams.startDate as string) || ""; // yyyy-mm-dd
  const endDate = (searchParams.endDate as string) || ""; // yyyy-mm-dd

  const page = Math.max(1, Number(searchParams.page || 1));
  const perPage = Math.min(200, Math.max(5, Number(searchParams.perPage || 50)));
  const skip = (page - 1) * perPage;

  const where: any = {};
  if (qEntity) where.entity = qEntity;
  if (qAction) where.action = qAction;
  if (!Number.isNaN(qUserId) && qUserId > 0) where.userId = qUserId;
  if (startDate || endDate) {
    where.createdAt = {} as any;
    if (startDate) where.createdAt.gte = new Date(`${startDate}T00:00:00.000Z`);
    if (endDate) where.createdAt.lte = new Date(`${endDate}T23:59:59.999Z`);
  }

  // Opções de filtro (select)
  const [entityGroups, actionGroups, userGroups] = await Promise.all([
    db.auditLog.groupBy({ by: ["entity"] }),
    db.auditLog.groupBy({ by: ["action"] }),
    db.auditLog.groupBy({ by: ["userId"], where: { NOT: { userId: null } } }),
  ]);
  const entityOptions = entityGroups.map((g: any) => g.entity).filter(Boolean).sort();
  const actionOptions = actionGroups.map((g: any) => g.action).filter(Boolean).sort();
  const userIds = userGroups.map((g: any) => g.userId as number);
  const usersForSelect = userIds.length
    ? await db.user.findMany({
        where: { id: { in: userIds } },
        select: { id: true, username: true, email: true },
        orderBy: { username: "asc" },
      })
    : [];

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
    <div className="p-6 space-y-6">
      <Card>
        <CardHeader>
          <CardTitle>Auditoria</CardTitle>
          <CardDescription>Use filtros em linguagem simples e selecione intervalos de datas.</CardDescription>
        </CardHeader>
        <CardContent>
          <form method="GET" className="grid gap-2 sm:grid-cols-2 lg:grid-cols-6 items-end">
            <div className="space-y-1">
              <div className="text-xs text-muted-foreground">Entidade</div>
              <select name="entity" defaultValue={qEntity} className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm">
                <option value="">Todas</option>
                {entityOptions.map((e: string) => (
                  <option key={e} value={e}>{humanizeEntity(e)}</option>
                ))}
              </select>
            </div>
            <div className="space-y-1">
              <div className="text-xs text-muted-foreground">Ação</div>
              <select name="action" defaultValue={qAction} className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm">
                <option value="">Todas</option>
                {actionOptions.map((a: string) => (
                  <option key={a} value={a}>{humanizeAction(a)}</option>
                ))}
              </select>
            </div>
            <div className="space-y-1">
              <div className="text-xs text-muted-foreground">Usuário</div>
              <select name="userId" defaultValue={Number.isNaN(qUserId) ? "" : String(qUserId)} className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm">
                <option value="">Todos</option>
                {usersForSelect.map((u) => (
                  <option key={u.id} value={u.id}>{u.username || u.email} ({u.id})</option>
                ))}
              </select>
            </div>
            <div className="space-y-1">
              <div className="text-xs text-muted-foreground">De</div>
              <Input name="startDate" type="date" defaultValue={startDate} />
            </div>
            <div className="space-y-1">
              <div className="text-xs text-muted-foreground">Até</div>
              <Input name="endDate" type="date" defaultValue={endDate} />
            </div>
            <div className="space-y-1">
              <div className="text-xs text-muted-foreground">&nbsp;</div>
              <Button type="submit">Filtrar</Button>
            </div>
          </form>
        </CardContent>
      </Card>

      <Card>
        <CardContent className="pt-6">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Quando</TableHead>
                <TableHead>Usuário</TableHead>
                <TableHead>Ação</TableHead>
                <TableHead>Entidade</TableHead>
                <TableHead>ID</TableHead>
                <TableHead>Detalhes</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {logs.map((l) => (
                <TableRow key={l.id}>
                  <TableCell className="whitespace-nowrap">{new Date(l.createdAt).toLocaleString()}</TableCell>
                  <TableCell>{l.user?.username || l.user?.email || l.userId}</TableCell>
                  <TableCell>{humanizeAction(l.action)}</TableCell>
                  <TableCell>{humanizeEntity(l.entity)}</TableCell>
                  <TableCell>{l.entityId}</TableCell>
                  <TableCell>
                    <details>
                      <summary className="cursor-pointer select-none text-primary">ver detalhes</summary>
                      <div className="mt-2 grid grid-cols-1 md:grid-cols-2 gap-4 max-w-4xl">
                        <div>
                          <div className="text-xs text-muted-foreground">Antes</div>
                          <pre className="text-xs max-h-60 overflow-auto bg-muted p-2 rounded border">{JSON.stringify(l.before, null, 2)}</pre>
                        </div>
                        <div>
                          <div className="text-xs text-muted-foreground">Depois</div>
                          <pre className="text-xs max-h-60 overflow-auto bg-muted p-2 rounded border">{JSON.stringify(l.after, null, 2)}</pre>
                        </div>
                      </div>
                    </details>
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
              <a className={`border px-2 py-1 rounded ${page <= 1 ? "opacity-50 pointer-events-none" : ""}`} href={`?entity=${qEntity}&action=${qAction}&userId=${Number.isNaN(qUserId) ? "" : qUserId}&startDate=${startDate}&endDate=${endDate}&page=${page - 1}&perPage=${perPage}`}>Anterior</a>
              <a className={`border px-2 py-1 rounded ${(skip + logs.length) >= total ? "opacity-50 pointer-events-none" : ""}`} href={`?entity=${qEntity}&action=${qAction}&userId=${Number.isNaN(qUserId) ? "" : qUserId}&startDate=${startDate}&endDate=${endDate}&page=${page + 1}&perPage=${perPage}`}>Próxima</a>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
