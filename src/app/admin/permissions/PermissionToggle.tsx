"use client";

// Componente client para checkbox com auto-submit
// Simples: exibe estado atual e envia toggle ao servidor via server action

import { toggleRolePermissionAction } from "./actions";
import { useRef } from "react";

type Props = {
  permissionId: number;
  role: "OPERATOR" | "SUPERVISOR" | "ADMIN";
  checked: boolean;
};

export default function PermissionToggle({ permissionId, role, checked }: Props) {
  const formRef = useRef<HTMLFormElement>(null);
  return (
    <form ref={formRef} action={toggleRolePermissionAction} className="inline-flex items-center gap-2">
      <input type="hidden" name="permissionId" value={permissionId} />
      <input type="hidden" name="role" value={role} />
      {/* enviamos o próximo estado desejado */}
      <input type="hidden" name="enabled" value={(checked ? false : true).toString()} />
      <input
        type="checkbox"
        defaultChecked={checked}
        onChange={() => formRef.current?.requestSubmit()}
        aria-label={`Permissão ${permissionId} para ${role}`}
      />
    </form>
  );
}

