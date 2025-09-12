// Admin > Permissões: matriz RBAC com UI padrão
import db from "@/providers/database";
import { requireAdmin } from "@/shared/auth/permissions";
import PermissionToggle from "./PermissionToggle";
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from "@/components/ui/card";
import { Table, TableHeader, TableRow, TableHead, TableBody, TableCell } from "@/components/ui/table";

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
    <div className="p-6 space-y-6">
      <Card>
        <CardHeader>
          <CardTitle>Permissões</CardTitle>
          <CardDescription>Altere as permissões por perfil. Aplicação imediata.</CardDescription>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Permissão</TableHead>
                <TableHead>Descrição</TableHead>
                {roles.map((r) => (
                  <TableHead key={r} className="text-center">{r}</TableHead>
                ))}
              </TableRow>
            </TableHeader>
            <TableBody>
              {perms.map((p) => (
                <TableRow key={p.id}>
                  <TableCell className="font-medium">{p.name}</TableCell>
                  <TableCell className="text-muted-foreground">{p.description}</TableCell>
                  {roles.map((r) => (
                    <TableCell key={r} className="text-center">
                      <PermissionToggle permissionId={p.id} role={r} checked={(roleMap as any)[r].has(p.id)} />
                    </TableCell>
                  ))}
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
}
