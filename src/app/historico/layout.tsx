import { getServerSession } from "next-auth";
import { redirect } from "next/navigation";
import { authOptions } from "@/libs/auth";
import { canAccessHistorico } from "@/lib/rbac-roles";

export const dynamic = "force-dynamic";

/**
 * Shell do Histórico de Ocorrências — exclusivo AUDITOR.
 * SUPERVISOR e OPERADOR são bloqueados aqui e no middleware.
 */
export default async function HistoricoLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const session = await getServerSession(authOptions);
  const role = (session?.user as { role?: string } | undefined)?.role;

  if (!session?.user || !canAccessHistorico(role)) {
    redirect("/");
  }

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900">
      <div className="max-w-7xl mx-auto p-6">{children}</div>
    </div>
  );
}
