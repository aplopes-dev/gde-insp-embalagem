"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { DeleteUserDialog } from "./delete-user-dialog";

interface User {
  id: string;
  name: string;
  email: string;
  role: string;
  createdAt: string;
}

interface UsersTableProps {
  currentUserEmail: string;
}

export function UsersTable({ currentUserEmail }: UsersTableProps) {
  const [users, setUsers] = useState<User[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [selectedUser, setSelectedUser] = useState<User | null>(null);
  const [showDeleteDialog, setShowDeleteDialog] = useState(false);

  useEffect(() => {
    fetchUsers();
  }, []);

  const fetchUsers = async () => {
    try {
      setLoading(true);
      const response = await fetch("/api/users");
      if (!response.ok) {
        throw new Error("Falha ao carregar usuários");
      }
      const data = await response.json();
      setUsers(data);
      setError(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Erro desconhecido");
    } finally {
      setLoading(false);
    }
  };

  const handleDeleteClick = (user: User) => {
    setSelectedUser(user);
    setShowDeleteDialog(true);
  };

  const handleDeleteConfirm = async () => {
    if (!selectedUser) return;

    try {
      const response = await fetch(`/api/users/${selectedUser.id}`, {
        method: "DELETE",
      });

      if (!response.ok) {
        throw new Error("Falha ao deletar usuário");
      }

      setUsers(users.filter((u) => u.id !== selectedUser.id));
      setShowDeleteDialog(false);
      setSelectedUser(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Erro ao deletar usuário");
    }
  };

  if (loading) {
    return <div className="text-center py-8">Carregando usuários...</div>;
  }

  if (error) {
    return (
      <div className="p-4 rounded border border-red-300 text-red-700 bg-red-50">
        {error}
      </div>
    );
  }

  if (users.length === 0) {
    return (
      <div className="text-center py-8 text-gray-500">
        Nenhum usuário cadastrado
      </div>
    );
  }

  return (
    <>
      <div className="overflow-x-auto border rounded dark:border-gray-700">
        <table className="w-full">
          <thead className="bg-gray-100 dark:bg-gray-800 border-b dark:border-gray-700">
            <tr>
              <th className="px-4 py-3 text-left text-sm font-semibold text-gray-900 dark:text-gray-100">Nome</th>
              <th className="px-4 py-3 text-left text-sm font-semibold text-gray-900 dark:text-gray-100">E-mail</th>
              <th className="px-4 py-3 text-left text-sm font-semibold text-gray-900 dark:text-gray-100">Perfil</th>
              <th className="px-4 py-3 text-left text-sm font-semibold text-gray-900 dark:text-gray-100">Data de Criação</th>
              <th className="px-4 py-3 text-left text-sm font-semibold text-gray-900 dark:text-gray-100">Ações</th>
            </tr>
          </thead>
          <tbody>
            {users.map((user) => (
              <tr key={user.id} className="border-b dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-700">
                <td className="px-4 py-3 text-gray-900 dark:text-gray-100">{user.name}</td>
                <td className="px-4 py-3 text-gray-900 dark:text-gray-100">{user.email}</td>
                <td className="px-4 py-3">
                  <span className="px-2 py-1 rounded text-sm bg-blue-100 dark:bg-blue-900 text-blue-800 dark:text-blue-200">
                    {user.role}
                  </span>
                </td>
                <td className="px-4 py-3 text-sm text-gray-600 dark:text-gray-400">
                  {new Date(user.createdAt).toLocaleDateString("pt-BR")}
                </td>
                <td className="px-4 py-3 flex gap-2">
                  <Link
                    href={`/users/${user.id}/edit`}
                    className="px-3 py-1 rounded text-sm bg-blue-600 text-white hover:bg-blue-700 dark:bg-blue-700 dark:hover:bg-blue-600"
                  >
                    Editar
                  </Link>
                  <button
                    onClick={() => handleDeleteClick(user)}
                    disabled={user.email === currentUserEmail}
                    title={user.email === currentUserEmail ? "Você não pode deletar sua própria conta" : "Deletar usuário"}
                    className={`px-3 py-1 rounded text-sm transition-colors ${
                      user.email === currentUserEmail
                        ? "bg-gray-400 text-gray-600 cursor-not-allowed opacity-50 dark:bg-gray-600 dark:text-gray-400"
                        : "bg-red-600 text-white hover:bg-red-700 dark:bg-red-700 dark:hover:bg-red-600"
                    }`}
                  >
                    Deletar
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {showDeleteDialog && selectedUser && (
        <DeleteUserDialog
          user={selectedUser}
          onConfirm={handleDeleteConfirm}
          onCancel={() => {
            setShowDeleteDialog(false);
            setSelectedUser(null);
          }}
        />
      )}
    </>
  );
}

