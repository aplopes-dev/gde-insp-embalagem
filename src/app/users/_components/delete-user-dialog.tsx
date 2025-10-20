"use client";

import { useState } from "react";

interface User {
  id: string;
  name: string;
  email: string;
  role: string;
}

interface DeleteUserDialogProps {
  user: User;
  onConfirm: () => Promise<void>;
  onCancel: () => void;
}

export function DeleteUserDialog({
  user,
  onConfirm,
  onCancel,
}: DeleteUserDialogProps) {
  const [isDeleting, setIsDeleting] = useState(false);

  const handleConfirm = async () => {
    setIsDeleting(true);
    try {
      await onConfirm();
    } finally {
      setIsDeleting(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white dark:bg-gray-800 rounded-lg shadow-lg p-6 max-w-sm mx-4">
        <h2 className="text-lg font-semibold mb-4 text-gray-900 dark:text-gray-100">Confirmar Exclusão</h2>

        <p className="text-gray-700 dark:text-gray-300 mb-6">
          Tem certeza que deseja deletar o usuário <strong>{user.name}</strong> ({user.email})?
        </p>

        <p className="text-sm text-red-600 dark:text-red-400 mb-6">
          ⚠️ Esta ação não pode ser desfeita.
        </p>

        <div className="flex gap-3 justify-end">
          <button
            onClick={onCancel}
            disabled={isDeleting}
            className="px-4 py-2 rounded border border-gray-300 dark:border-gray-600 text-gray-900 dark:text-gray-100 hover:bg-gray-50 dark:hover:bg-gray-700 disabled:opacity-50 transition-colors"
          >
            Cancelar
          </button>
          <button
            onClick={handleConfirm}
            disabled={isDeleting}
            className="px-4 py-2 rounded bg-red-600 text-white hover:bg-red-700 dark:bg-red-700 dark:hover:bg-red-600 disabled:opacity-50 transition-colors"
          >
            {isDeleting ? "Deletando..." : "Deletar"}
          </button>
        </div>
      </div>
    </div>
  );
}

