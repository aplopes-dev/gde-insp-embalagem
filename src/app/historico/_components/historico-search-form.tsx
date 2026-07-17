"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

export function HistoricoSearchForm({
  initialQ,
  initialStatus,
}: {
  initialQ: string;
  initialStatus: string;
}) {
  const router = useRouter();
  const [q, setQ] = useState(initialQ);
  const [status, setStatus] = useState(initialStatus);

  function submit(e: React.FormEvent) {
    e.preventDefault();
    const params = new URLSearchParams();
    if (q.trim()) params.set("q", q.trim());
    if (status) params.set("status", status);
    const qs = params.toString();
    router.push(qs ? `/historico?${qs}` : "/historico");
  }

  return (
    <form onSubmit={submit} className="flex flex-wrap gap-2 items-end">
      <div className="flex-1 min-w-[180px]">
        <label className="text-xs text-gray-500 block mb-1">Buscar OP</label>
        <Input
          placeholder="Código ou ID"
          value={q}
          onChange={(e) => setQ(e.target.value)}
        />
      </div>
      <div>
        <label className="text-xs text-gray-500 block mb-1">Status</label>
        <select
          className="border rounded px-3 py-2 text-sm bg-white dark:bg-gray-800 min-w-[140px]"
          value={status}
          onChange={(e) => setStatus(e.target.value)}
        >
          <option value="">Todos</option>
          <option value="PENDING">Pendente</option>
          <option value="COMPLETED">Concluída</option>
        </select>
      </div>
      <Button type="submit">Filtrar</Button>
    </form>
  );
}
