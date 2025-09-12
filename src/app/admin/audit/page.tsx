// Admin > Auditoria: listagem com UI padrão
import db from "@/providers/database";
import { requireAdmin } from "@/shared/auth/permissions";
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Table, TableHeader, TableRow, TableHead, TableBody, TableCell } from "@/components/ui/table";

export const dynamic = "force-dynamic";

export default async function AdminAuditPage({ searchParams }: { searchParams: Record<string, string | string[] | undefined> }) {
  await requireAdmin();

  const qEntity = (searchParams.entity as string) || "";
  const qAction = (searchParams.action as string) || "";
  const qUserId = Number(searchParams.userId || "");

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
    <div className="p-6 space-y-6">
      <Card>
        <CardHeader>
          <CardTitle>Auditoria</CardTitle>
          <CardDescription>Filtros básicos e detalhes de eventos</CardDescription>
        </CardHeader>
        <CardContent>
          <form method="GET" className="grid gap-2 sm:grid-cols-2 lg:grid-cols-6">
            <Input name="entity" placeholder="Entidade (ex.: Op, User)" defaultValue={qEntity} />
            <Input name="action" placeholder="Ação (ex.: CREATE_OP)" defaultValue={qAction} />
            <Input name="userId" type="number" placeholder="User ID" defaultValue={Number.isNaN(qUserId) ? "" : qUserId} />
            <Input name="page" type="number" placeholder="Página" defaultValue={page} />
            <Input name="perPage" type="number" placeholder="Por página" defaultValue={perPage} />
            <Button type="submit">Filtrar</Button>
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
                  <TableCell>{l.action}</TableCell>
                  <TableCell>{l.entity}</TableCell>
                  <TableCell>{l.entityId}</TableCell>
                  <TableCell>
                    <details>
                      <summary className="cursor-pointer select-none text-primary">ver</summary>
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
              <a className={`border px-2 py-1 rounded ${page <= 1 ? "opacity-50 pointer-events-none" : ""}`} href={`?entity=${qEntity}&action=${qAction}&userId=${Number.isNaN(qUserId) ? "" : qUserId}&page=${page - 1}&perPage=${perPage}`}>Anterior</a>
              <a className={`border px-2 py-1 rounded ${(skip + logs.length) >= total ? "opacity-50 pointer-events-none" : ""}`} href={`?entity=${qEntity}&action=${qAction}&userId=${Number.isNaN(qUserId) ? "" : qUserId}&page=${page + 1}&perPage=${perPage}`}>Próxima</a>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
