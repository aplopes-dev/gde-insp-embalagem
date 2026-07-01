import { getServerSession } from "next-auth";
import { authOptions } from "@/libs/auth";
import { redirect } from "next/navigation";
import Link from "next/link";
import { UsersTable } from "./_components/users-table";

export const dynamic = "force-dynamic";

export default async function UsersPage() {
  const session = await getServerSession(authOptions);
  const user = session?.user as any;
  if (!user || user.role !== "SUPERVISOR") {
    redirect("/");
  }

  return (
    <div className="max-w-6xl mx-auto p-6">
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-3">
          <Link
            href="/admin"
            className="px-3 py-2 rounded border border-gray-300 dark:border-gray-600 text-gray-900 dark:text-gray-100 hover:bg-gray-50 dark:hover:bg-gray-700"
            title="Voltar para o painel de administração"
          >
            Voltar
          </Link>
          <h1 className="text-2xl font-semibold text-gray-900 dark:text-gray-100">Gerenciar Usuários</h1>
        </div>
        <Link
          href="/users/create"
          className="px-4 py-2 rounded bg-blue-600 text-white hover:bg-blue-700 dark:bg-blue-700 dark:hover:bg-blue-600"
        >
          + Novo Usuário
        </Link>
      </div>

      <UsersTable currentUserEmail={user.email} />
    </div>
  );
}

