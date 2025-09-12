// Layout do Admin: header com logo + sidebar seguindo padrão do app
// Protegido com requireAdmin (SSR) e middleware já existente

import { requireAdmin } from "@/shared/auth/permissions";
import React from "react";
import Header from "@/components/header";
import Link from "next/link";
import { Button } from "@/components/ui/button";

export const dynamic = "force-dynamic";

type Props = { children: React.ReactNode };

export default async function AdminLayout({ children }: Props) {
  await requireAdmin();
  return (
    <div className="min-h-screen flex flex-col">
      <Header />
      <div className="flex-1 md:grid md:grid-cols-[240px_1fr]">
        {/* Sidebar */}
        <aside className="border-r bg-muted/30 p-4 space-y-4">
          <div>
            <div className="text-xs uppercase text-muted-foreground">Painel</div>
            <div className="mt-2 space-y-1 text-sm">
              <Button asChild variant="ghost" className="w-full justify-start">
                <Link href="/admin">Início</Link>
              </Button>
            </div>
          </div>
          <div>
            <div className="text-xs uppercase text-muted-foreground">Gestão</div>
            <div className="mt-2 space-y-1 text-sm">
              <Button asChild variant="ghost" className="w-full justify-start">
                <Link href="/admin/users">Usuários</Link>
              </Button>
              <Button asChild variant="ghost" className="w-full justify-start">
                <Link href="/admin/permissions">Permissões</Link>
              </Button>
              <Button asChild variant="ghost" className="w-full justify-start">
                <Link href="/admin/audit">Auditoria</Link>
              </Button>
            </div>
          </div>
        </aside>

        {/* Conteúdo */}
        <main className="p-6">{children}</main>
      </div>
    </div>
  );
}
