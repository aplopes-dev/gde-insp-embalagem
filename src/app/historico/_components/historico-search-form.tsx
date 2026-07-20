"use client";

import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
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

  useEffect(() => {
    setQ(initialQ);
    setStatus(initialStatus);
  }, [initialQ, initialStatus]);

  function submit(e: React.FormEvent) {
    e.preventDefault();
    const params = new URLSearchParams();
    const query = q.trim();
    if (query) params.set("q", query);
    if (status) params.set("status", status);
    // Nova busca sempre volta à página 1 (consulta no banco via searchParams).
    params.set("page", "1");
    const qs = params.toString();
    router.push(qs ? `/historico?${qs}` : "/historico");
  }

  function clearFilters() {
    setQ("");
    setStatus("");
    router.push("/historico");
  }

  return (
    <form onSubmit={submit} className="flex flex-wrap gap-2 items-end">
      <div className="flex-1 min-w-[180px]">
        <label className="text-xs text-gray-500 dark:text-gray-400 block mb-1">
          Buscar OP
        </label>
        <Input
          placeholder="Código (ex.: 80257) ou ID interno"
          value={q}
          onChange={(e) => setQ(e.target.value)}
        />
      </div>
      <div>
        <label className="text-xs text-gray-500 dark:text-gray-400 block mb-1">
          Status
        </label>
        <select
          className="border rounded px-3 py-2 text-sm bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 min-w-[140px]"
          value={status}
          onChange={(e) => setStatus(e.target.value)}
        >
          <option value="">Todos</option>
          <option value="PENDING">Pendente</option>
          <option value="COMPLETED">Concluída</option>
        </select>
      </div>
      <Button type="submit">Filtrar</Button>
      {(initialQ || initialStatus) && (
        <Button type="button" variant="outline" onClick={clearFilters}>
          Limpar
        </Button>
      )}
    </form>
  );
}
