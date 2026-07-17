"use client";

import { useCallback, useEffect, useState } from "react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Loader2, Plus, CheckCircle2 } from "lucide-react";

type Occurrence = {
  id: string;
  number: number;
  status: string;
  title: string;
  description: string;
  resolution?: string | null;
  createdAt: string;
  resolvedAt?: string | null;
  responsible?: { id: string; name: string; email: string } | null;
  resolvedBy?: { id: string; name: string; email: string } | null;
};

export function OpOccurrencesManager({
  opId,
  onChanged,
}: {
  opId: string;
  onChanged?: () => void | Promise<void>;
}) {
  const [items, setItems] = useState<Occurrence[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [creating, setCreating] = useState(false);
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [closingId, setClosingId] = useState<string | null>(null);
  const [resolution, setResolution] = useState("");
  const [busy, setBusy] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch(`/api/admin/ops/${opId}/ocorrencias`);
      if (!res.ok) {
        throw new Error("Falha ao carregar ocorrências");
      }
      const json = await res.json();
      setItems(json.data || []);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Erro");
    } finally {
      setLoading(false);
    }
  }, [opId]);

  useEffect(() => {
    void load();
  }, [load]);

  async function handleCreate() {
    if (!title.trim() || !description.trim()) {
      setError("Título e descrição são obrigatórios");
      return;
    }
    setBusy(true);
    setError(null);
    try {
      const res = await fetch(`/api/admin/ops/${opId}/ocorrencias`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ title, description }),
      });
      if (!res.ok) {
        const body = await res.json().catch(() => ({}));
        throw new Error(body.error || "Falha ao criar");
      }
      setTitle("");
      setDescription("");
      setCreating(false);
      await load();
      await onChanged?.();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Erro ao criar");
    } finally {
      setBusy(false);
    }
  }

  async function handleClose(id: string) {
    if (!resolution.trim()) {
      setError("Informe a resolução para fechar");
      return;
    }
    setBusy(true);
    setError(null);
    try {
      const res = await fetch(`/api/admin/ops/${opId}/ocorrencias/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "close", resolution }),
      });
      if (!res.ok) {
        const body = await res.json().catch(() => ({}));
        throw new Error(body.error || "Falha ao fechar");
      }
      setClosingId(null);
      setResolution("");
      await load();
      await onChanged?.();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Erro ao fechar");
    } finally {
      setBusy(false);
    }
  }

  async function handleSetInProgress(id: string) {
    setBusy(true);
    setError(null);
    try {
      const res = await fetch(`/api/admin/ops/${opId}/ocorrencias/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "update", status: "IN_PROGRESS" }),
      });
      if (!res.ok) {
        const body = await res.json().catch(() => ({}));
        throw new Error(body.error || "Falha ao atualizar");
      }
      await load();
      await onChanged?.();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Erro ao atualizar");
    } finally {
      setBusy(false);
    }
  }

  function statusClass(status: string) {
    if (status === "OPEN") return "bg-amber-100 text-amber-900";
    if (status === "IN_PROGRESS") return "bg-blue-100 text-blue-900";
    if (status === "CLOSED") return "bg-green-100 text-green-900";
    return "bg-gray-100 text-gray-800";
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between gap-3">
        <p className="text-sm text-gray-600">
          Ocorrências formais (criação e fechamento exclusivos do supervisor).
        </p>
        <Button
          type="button"
          size="sm"
          onClick={() => setCreating((v) => !v)}
          className="gap-1"
        >
          <Plus className="w-4 h-4" />
          Nova
        </Button>
      </div>

      {error && (
        <div className="text-sm text-red-700 bg-red-50 border border-red-200 rounded p-2">
          {error}
        </div>
      )}

      {creating && (
        <Card className="p-4 space-y-3">
          <Input
            placeholder="Título"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
          />
          <textarea
            className="w-full border rounded px-3 py-2 text-sm min-h-[80px] bg-white dark:bg-gray-800"
            placeholder="Descrição"
            value={description}
            onChange={(e) => setDescription(e.target.value)}
          />
          <div className="flex gap-2">
            <Button type="button" disabled={busy} onClick={() => void handleCreate()}>
              {busy ? <Loader2 className="w-4 h-4 animate-spin" /> : "Criar"}
            </Button>
            <Button
              type="button"
              variant="outline"
              onClick={() => setCreating(false)}
            >
              Cancelar
            </Button>
          </div>
        </Card>
      )}

      {loading ? (
        <div className="flex items-center gap-2 text-sm text-gray-500">
          <Loader2 className="w-4 h-4 animate-spin" /> Carregando...
        </div>
      ) : items.length === 0 ? (
        <Card className="p-6 text-center text-gray-500 text-sm">
          Nenhuma ocorrência registrada nesta OP.
        </Card>
      ) : (
        <div className="space-y-3">
          {items.map((item) => (
            <Card key={item.id} className="p-4 space-y-2">
              <div className="flex items-start justify-between gap-3">
                <div>
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="font-semibold">
                      #{item.number} — {item.title}
                    </span>
                    <Badge className={statusClass(item.status)}>{item.status}</Badge>
                  </div>
                  <p className="text-sm text-gray-700 mt-1">{item.description}</p>
                  {item.resolution && (
                    <p className="text-xs text-gray-600 mt-1">
                      Resolução: {item.resolution}
                    </p>
                  )}
                  <p className="text-xs text-gray-500 mt-1">
                    Aberta em {new Date(item.createdAt).toLocaleString("pt-BR")}
                    {item.resolvedAt
                      ? ` · Fechada em ${new Date(item.resolvedAt).toLocaleString("pt-BR")}`
                      : ""}
                  </p>
                </div>
                {item.status !== "CLOSED" && (
                  <div className="flex flex-col gap-2">
                    {item.status === "OPEN" && (
                      <Button
                        type="button"
                        size="sm"
                        variant="outline"
                        disabled={busy}
                        onClick={() => void handleSetInProgress(item.id)}
                      >
                        Em andamento
                      </Button>
                    )}
                    <Button
                      type="button"
                      size="sm"
                      variant="outline"
                      disabled={busy}
                      onClick={() => {
                        setClosingId(item.id);
                        setResolution("");
                      }}
                      className="gap-1"
                    >
                      <CheckCircle2 className="w-4 h-4" />
                      Fechar
                    </Button>
                  </div>
                )}
              </div>

              {closingId === item.id && (
                <div className="border-t pt-3 space-y-2">
                  <textarea
                    className="w-full border rounded px-3 py-2 text-sm min-h-[70px] bg-white dark:bg-gray-800"
                    placeholder="Descreva a resolução..."
                    value={resolution}
                    onChange={(e) => setResolution(e.target.value)}
                  />
                  <div className="flex gap-2">
                    <Button
                      type="button"
                      size="sm"
                      disabled={busy}
                      onClick={() => void handleClose(item.id)}
                    >
                      Confirmar fechamento
                    </Button>
                    <Button
                      type="button"
                      size="sm"
                      variant="outline"
                      onClick={() => setClosingId(null)}
                    >
                      Cancelar
                    </Button>
                  </div>
                </div>
              )}
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
