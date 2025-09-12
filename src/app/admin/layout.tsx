// Layout do Admin: header com logo + sidebar seguindo padrão do app
// Protegido com requireAdmin (SSR) e middleware já existente

import { requireAdmin } from "@/shared/auth/permissions";
import React from "react";
import Header from "@/components/header";
import SidebarNav from "./SidebarNav";

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
          <div className="text-xs uppercase text-muted-foreground">Administração</div>
          <SidebarNav />
        </aside>

        {/* Conteúdo */}
        <main className="p-6">{children}</main>
      </div>
    </div>
  );
}
