import Link from "next/link";
import { updateUserAction } from "./actions";

interface FormWrapperProps {
  userId: string;
  userName: string;
  userEmail: string;
  userRole: string;
}

export async function FormWrapper({
  userId,
  userName,
  userEmail,
  userRole,
}: FormWrapperProps) {
  async function handleSubmit(formData: FormData) {
    "use server";
    await updateUserAction(userId, formData);
  }

  return (
    <form action={handleSubmit} className="space-y-4">
      <div>
        <label className="block text-sm font-medium mb-1 text-gray-900 dark:text-gray-100">Nome</label>
        <input
          name="name"
          type="text"
          required
          defaultValue={userName}
          className="w-full border rounded px-3 py-2 bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 border-gray-300 dark:border-gray-600 focus:outline-none focus:ring-2 focus:ring-blue-500"
          placeholder="Nome completo"
        />
      </div>

      <div>
        <label className="block text-sm font-medium mb-1 text-gray-900 dark:text-gray-100">E-mail</label>
        <input
          name="email"
          type="email"
          required
          defaultValue={userEmail}
          className="w-full border rounded px-3 py-2 bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 border-gray-300 dark:border-gray-600 focus:outline-none focus:ring-2 focus:ring-blue-500"
          placeholder="email@exemplo.com"
        />
      </div>

      <div>
        <label className="block text-sm font-medium mb-1 text-gray-900 dark:text-gray-100">Perfil</label>
        <select
          name="role"
          required
          defaultValue={userRole}
          className="w-full border rounded px-3 py-2 bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 border-gray-300 dark:border-gray-600 focus:outline-none focus:ring-2 focus:ring-blue-500"
        >
          <option value="">Selecione...</option>
          <option value="ADMINISTRADOR">ADMINISTRADOR</option>
          <option value="SUPERVISOR">SUPERVISOR</option>
          <option value="OPERADOR">OPERADOR</option>
        </select>
      </div>

      <div>
        <label className="block text-sm font-medium mb-1 text-gray-900 dark:text-gray-100">Nova Senha (opcional)</label>
        <input
          name="password"
          type="password"
          minLength={6}
          className="w-full border rounded px-3 py-2 bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 border-gray-300 dark:border-gray-600 focus:outline-none focus:ring-2 focus:ring-blue-500"
          placeholder="Deixe em branco para manter a senha atual"
          pattern="(?=.*[A-Z])(?=.*\d)(?=.*[^A-Za-z0-9]).{6,}"
          title="Deve conter pelo menos 1 letra maiúscula, 1 número e 1 caractere especial"
        />
      </div>

      <div>
        <label className="block text-sm font-medium mb-1 text-gray-900 dark:text-gray-100">Confirmar Nova Senha</label>
        <input
          name="confirmPassword"
          type="password"
          minLength={6}
          className="w-full border rounded px-3 py-2 bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 border-gray-300 dark:border-gray-600 focus:outline-none focus:ring-2 focus:ring-blue-500"
          placeholder="Repita a nova senha"
        />
      </div>

      <div className="pt-2 flex gap-2">
        <button
          type="submit"
          className="px-4 py-2 rounded bg-blue-600 text-white hover:bg-blue-700 dark:bg-blue-700 dark:hover:bg-blue-600"
        >
          Salvar
        </button>
        <Link
          href="/users"
          className="px-4 py-2 rounded border border-gray-300 dark:border-gray-600 text-gray-900 dark:text-gray-100 hover:bg-gray-50 dark:hover:bg-gray-700"
        >
          Cancelar
        </Link>
      </div>
    </form>
  );
}

