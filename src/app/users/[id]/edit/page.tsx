import { getServerSession } from "next-auth";
import { authOptions } from "@/libs/auth";
import { redirect } from "next/navigation";
import Link from "next/link";
import db from "@/providers/database";
import { FormWrapper } from "./form-wrapper";

export const dynamic = "force-dynamic";

export default async function EditUserPage({
  params,
  searchParams,
}: {
  params: { id: string };
  searchParams?: { error?: string };
}) {
  const session = await getServerSession(authOptions);
  const user = session?.user as any;
  if (!user || user.role !== "ADMINISTRADOR") {
    redirect("/");
  }

  // Buscar usuário a ser editado
  const userToEdit = await db.user.findUnique({
    where: { id: params.id },
  });

  if (!userToEdit) {
    redirect("/users");
  }

  const error = searchParams?.error;

  return (
    <div className="max-w-xl mx-auto p-6">
      <div className="flex items-center gap-3 mb-6">
        <Link
          href="/users"
          className="px-3 py-2 rounded border border-gray-300 dark:border-gray-600 text-gray-900 dark:text-gray-100 hover:bg-gray-50 dark:hover:bg-gray-700"
          title="Voltar"
        >
          Voltar
        </Link>
        <h1 className="text-xl font-semibold text-gray-900 dark:text-gray-100">Editar usuário</h1>
      </div>

      {error && (
        <div className="mb-4 p-3 rounded border border-red-300 dark:border-red-700 text-red-700 dark:text-red-400 bg-red-50 dark:bg-red-900/20 text-sm">
          {error}
        </div>
      )}

      <FormWrapper
        userId={params.id}
        userName={userToEdit.name}
        userEmail={userToEdit.email}
        userRole={userToEdit.role}
      />
    </div>
  );
}

