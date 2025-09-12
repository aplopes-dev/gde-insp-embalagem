// Layout do Admin: menu lateral simples + conteúdo
// Protegido com requireAdmin (SSR) e middleware já existente

import { requireAdmin } from "@/shared/auth/permissions";
import Link from "next/link";
import React from "react";

export const dynamic = "force-dynamic";

type Props = { children: React.ReactNode };

export default async function AdminLayout({ children }: Props) {
  await requireAdmin();
  return (
    <div className="min-h-screen md:grid md:grid-cols-[220px_1fr]">
      {/* Sidebar simples */}
      <aside className="border-r bg-gray-50 p-4 space-y-4">
        <div>
          <div className="text-xs uppercase text-gray-500">Painel</div>
          <ul className="mt-2 space-y-1 text-sm">
            <li>
              <Link className="text-blue-700 hover:underline" href="/admin">Início</Link>
            </li>
          </ul>
        </div>
        <div>
          <div className="text-xs uppercase text-gray-500">Gestão</div>
          <ul className="mt-2 space-y-1 text-sm">
            <li>
              <Link className="text-blue-700 hover:underline" href="/admin/users">Usuários</Link>
            </li>
            <li>
              <Link className="text-blue-700 hover:underline" href="/admin/permissions">Permissões</Link>
            </li>
            <li>
              <Link className="text-blue-700 hover:underline" href="/admin/audit">Auditoria</Link>
            </li>
          </ul>
        </div>
      </aside>

      {/* Conteúdo */}
      <main className="p-6">{children}</main>
    </div>
  );
}

