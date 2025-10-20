import { getServerSession } from "next-auth";
import { authOptions } from "@/libs/auth";
import { redirect } from "next/navigation";
import { createUserAction } from "./actions";

export const dynamic = "force-dynamic";

export default async function CreateUserPage({ searchParams }: { searchParams?: { error?: string } }) {
  const session = await getServerSession(authOptions);
  const user = session?.user as any;
  if (!user || user.role !== "ADMINISTRADOR") {
    redirect("/");
  }

  const error = searchParams?.error;

  return (
    <div className="max-w-xl mx-auto p-6">
      <h1 className="text-xl font-semibold mb-4">Cadastrar novo usuário</h1>

      {error && (
        <div className="mb-4 p-3 rounded border border-red-300 text-red-700 bg-red-50 text-sm">
          {error}
        </div>
      )}

      <form action={createUserAction} className="space-y-4">
        <div>
          <label className="block text-sm font-medium mb-1">Nome</label>
          <input
            name="name"
            type="text"
            required
            className="w-full border rounded px-3 py-2"
            placeholder="Nome completo"
          />
        </div>

        <div>
          <label className="block text-sm font-medium mb-1">E-mail</label>
          <input
            name="email"
            type="email"
            required
            className="w-full border rounded px-3 py-2"
            placeholder="email@exemplo.com"
          />
        </div>

        <div>
          <label className="block text-sm font-medium mb-1">Perfil</label>
          <select name="role" required className="w-full border rounded px-3 py-2">
            <option value="">Selecione...</option>
            <option value="ADMINISTRADOR">ADMINISTRADOR</option>
            <option value="SUPERVISOR">SUPERVISOR</option>
            <option value="OPERADOR">OPERADOR</option>
          </select>
        </div>

        <div>
          <label className="block text-sm font-medium mb-1">Senha</label>
          <input
            name="password"
            type="password"
            required
            minLength={6}
            className="w-full border rounded px-3 py-2"
            placeholder="Mínimo de 6 caracteres"
            pattern="(?=.*[A-Z])(?=.*\d)(?=.*[^A-Za-z0-9]).{6,}"
            title="Deve conter pelo menos 1 letra maiúscula, 1 número e 1 caractere especial"
          />
        </div>

        <div>
          <label className="block text-sm font-medium mb-1">Confirmar senha</label>
          <input
            name="confirmPassword"
            type="password"
            required
            minLength={6}
            className="w-full border rounded px-3 py-2"
            placeholder="Repita a senha"
          />
        </div>

        <div className="pt-2 flex gap-2">
          <button type="submit" className="px-4 py-2 rounded bg-blue-600 text-white hover:bg-blue-700">
            Salvar
          </button>
          <a href="/" className="px-4 py-2 rounded border">Cancelar</a>
        </div>
      </form>
    </div>
  );
}

