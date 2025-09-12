// Painel administrativo: home com cartões e navegação
// Protegido via middleware e por checagem de role (SSR)

import { requireAdmin } from "@/shared/auth/permissions";
import Link from "next/link";
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";

export const dynamic = "force-dynamic";

export default async function AdminHome() {
  await requireAdmin();
  return (
    <div className="p-6 space-y-6">
      <div>
        <h1 className="text-2xl font-semibold">Administração</h1>
        <p className="text-sm text-muted-foreground">Acesse as seções abaixo.</p>
      </div>
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
        <Card>
          <CardHeader>
            <CardTitle>Usuários</CardTitle>
            <CardDescription>CRUD, filtros, perfis e senha</CardDescription>
          </CardHeader>
          <CardContent>
            <Button asChild>
              <Link href="/admin/users">Abrir usuários</Link>
            </Button>
          </CardContent>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle>Permissões</CardTitle>
            <CardDescription>Matriz RBAC por perfil</CardDescription>
          </CardHeader>
          <CardContent>
            <Button asChild>
              <Link href="/admin/permissions">Abrir permissões</Link>
            </Button>
          </CardContent>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle>Auditoria</CardTitle>
            <CardDescription>Histórico de ações e detalhes</CardDescription>
          </CardHeader>
          <CardContent>
            <Button asChild>
              <Link href="/admin/audit">Abrir auditoria</Link>
            </Button>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

