"use client";

import { useCallback, useEffect, useState } from "react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useToast } from "@/components/ui/use-toast";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Loader2, Plus, Trash2 } from "lucide-react";

interface OpBoxRow {
  id: string;
  opId: number;
  code: string;
  status: string;
  createdAt: string;
  packedAt?: string | null;
  barCode?: string | null;
  pieces: number;
  blisterCount: number;
}

interface BoxesPayload {
  opId: number;
  opCode: string;
  jerpRemaining: number | null;
  jerpError: string | null;
  internalPending: number;
  fullBoxPieces: number | null;
  boxes: OpBoxRow[];
}

interface OpBoxesManagerProps {
  opId: string;
  onChanged?: () => void;
}

export function OpBoxesManager({ opId, onChanged }: OpBoxesManagerProps) {
  const { toast } = useToast();
  const [data, setData] = useState<BoxesPayload | null>(null);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [deleteTarget, setDeleteTarget] = useState<OpBoxRow | null>(null);
  const [confirmEstorno, setConfirmEstorno] = useState(false);
  const [createOpen, setCreateOpen] = useState(false);
  const [piecesInput, setPiecesInput] = useState("");

  const fetchBoxes = useCallback(async () => {
    try {
      setLoading(true);
      const res = await fetch(`/api/admin/ops/${opId}/boxes`);
      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error(err.error || "Erro ao carregar caixas");
      }
      setData(await res.json());
    } catch (error: unknown) {
      toast({
        title: "Erro",
        description:
          error instanceof Error ? error.message : "Erro ao carregar caixas",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  }, [opId, toast]);

  useEffect(() => {
    fetchBoxes();
  }, [fetchBoxes]);

  async function handleDelete() {
    if (!deleteTarget) return;
    const needsEstorno = Boolean(deleteTarget.barCode);
    if (needsEstorno && !confirmEstorno) {
      toast({
        title: "Confirmação necessária",
        description:
          "Marque que o estorno já foi efetuado no JERP antes de excluir.",
        variant: "destructive",
      });
      return;
    }

    try {
      setBusy(true);
      const res = await fetch(
        `/api/admin/ops/${opId}/boxes/${deleteTarget.id}`,
        {
          method: "DELETE",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            confirmJerpReversal: needsEstorno ? confirmEstorno : false,
          }),
        }
      );
      const body = await res.json().catch(() => ({}));
      if (!res.ok) {
        throw new Error(body.error || "Erro ao excluir caixa");
      }
      toast({
        title: "Caixa excluída",
        description: `Caixa ${deleteTarget.code} removida. Pendentes recriadas a partir do JERP.`,
      });
      setDeleteTarget(null);
      setConfirmEstorno(false);
      await fetchBoxes();
      onChanged?.();
    } catch (error: unknown) {
      toast({
        title: "Erro",
        description:
          error instanceof Error ? error.message : "Erro ao excluir caixa",
        variant: "destructive",
      });
    } finally {
      setBusy(false);
    }
  }

  async function handleCreate() {
    try {
      setBusy(true);
      const pieces =
        piecesInput.trim() === "" ? undefined : Number(piecesInput);
      if (pieces != null && (Number.isNaN(pieces) || pieces <= 0)) {
        throw new Error("Informe uma quantidade de peças válida");
      }
      const res = await fetch(`/api/admin/ops/${opId}/boxes`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ pieces }),
      });
      const body = await res.json().catch(() => ({}));
      if (!res.ok) {
        throw new Error(body.error || "Erro ao criar caixa");
      }
      toast({
        title: "Caixa criada",
        description: `Caixa ${body.code} criada com ${body.pieces} peças.`,
      });
      setCreateOpen(false);
      setPiecesInput("");
      await fetchBoxes();
      onChanged?.();
    } catch (error: unknown) {
      toast({
        title: "Erro",
        description:
          error instanceof Error ? error.message : "Erro ao criar caixa",
        variant: "destructive",
      });
    } finally {
      setBusy(false);
    }
  }

  if (loading && !data) {
    return (
      <Card className="p-6 flex items-center justify-center gap-2">
        <Loader2 className="w-5 h-5 animate-spin" />
        <span>Carregando caixas...</span>
      </Card>
    );
  }

  if (!data) return null;

  const available =
    data.jerpRemaining != null
      ? Math.max(0, data.jerpRemaining - data.internalPending)
      : null;

  return (
    <>
      <Card className="p-4 space-y-4">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div className="space-y-1 text-sm">
            <p>
              <span className="font-medium">Restante JERP:</span>{" "}
              {data.jerpRemaining ?? "—"}
              {data.jerpError ? (
                <span className="text-red-600 ml-2">({data.jerpError})</span>
              ) : null}
            </p>
            <p>
              <span className="font-medium">Pendente interno:</span>{" "}
              {data.internalPending}
            </p>
            <p>
              <span className="font-medium">Disponível para criar:</span>{" "}
              {available ?? "—"}
              {data.fullBoxPieces != null
                ? ` (caixa cheia = ${data.fullBoxPieces} peças)`
                : ""}
            </p>
          </div>
          <Button onClick={() => setCreateOpen(true)} disabled={busy}>
            <Plus className="w-4 h-4 mr-1" />
            Criar caixa
          </Button>
        </div>

        <div className="overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Código</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Peças</TableHead>
                <TableHead>Blisters</TableHead>
                <TableHead>Barcode</TableHead>
                <TableHead>Embalada</TableHead>
                <TableHead className="text-right">Ações</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {data.boxes.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={7} className="text-center py-6">
                    Nenhuma caixa nesta OP
                  </TableCell>
                </TableRow>
              ) : (
                data.boxes.map((box) => (
                  <TableRow key={box.id}>
                    <TableCell className="font-mono">{box.code}</TableCell>
                    <TableCell>
                      <span
                        className={`px-2 py-1 rounded text-xs font-medium ${
                          box.status === "PACKAGED"
                            ? "bg-green-100 text-green-800"
                            : box.status === "PACKAGED_W_BREAK"
                              ? "bg-orange-100 text-orange-800"
                              : "bg-gray-100 text-gray-800"
                        }`}
                      >
                        {box.status}
                      </span>
                    </TableCell>
                    <TableCell>{box.pieces}</TableCell>
                    <TableCell>{box.blisterCount}</TableCell>
                    <TableCell className="font-mono text-xs">
                      {box.barCode || "—"}
                    </TableCell>
                    <TableCell className="text-sm">
                      {box.packedAt
                        ? new Date(box.packedAt).toLocaleString("pt-BR")
                        : "—"}
                    </TableCell>
                    <TableCell className="text-right">
                      <Button
                        variant="destructive"
                        size="sm"
                        disabled={busy}
                        onClick={() => {
                          setConfirmEstorno(false);
                          setDeleteTarget(box);
                        }}
                      >
                        <Trash2 className="w-4 h-4" />
                      </Button>
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </div>
      </Card>

      <AlertDialog
        open={deleteTarget !== null}
        onOpenChange={(open) => {
          if (!open) {
            setDeleteTarget(null);
            setConfirmEstorno(false);
          }
        }}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>
              Excluir caixa {deleteTarget?.code}?
            </AlertDialogTitle>
            <AlertDialogDescription asChild>
              <div className="space-y-3 text-sm text-muted-foreground">
                <p>
                  A caixa e os blisters serão removidos. As caixas pendentes
                  serão recriadas automaticamente a partir do restante do JERP.
                </p>
                {deleteTarget?.barCode ? (
                  <div className="rounded border border-amber-300 bg-amber-50 p-3 text-amber-900 space-y-2">
                    <p className="font-medium">
                      Esta caixa possui apontamento no JERP (barcode{" "}
                      {deleteTarget.barCode}).
                    </p>
                    <p>
                      Efetue o estorno no JERP antes de confirmar. O sistema
                      só exclui se o restante JERP já refletir as peças desta
                      caixa.
                    </p>
                    <label className="flex items-start gap-2 cursor-pointer">
                      <input
                        type="checkbox"
                        className="mt-1"
                        checked={confirmEstorno}
                        onChange={(e) => setConfirmEstorno(e.target.checked)}
                      />
                      <span>
                        Confirmo que o estorno desta caixa já foi efetuado no
                        JERP.
                      </span>
                    </label>
                  </div>
                ) : null}
              </div>
            </AlertDialogDescription>
          </AlertDialogHeader>
          <div className="flex gap-2 justify-end">
            <AlertDialogCancel disabled={busy}>Cancelar</AlertDialogCancel>
            <AlertDialogAction
              onClick={(e) => {
                e.preventDefault();
                handleDelete();
              }}
              disabled={
                busy || (Boolean(deleteTarget?.barCode) && !confirmEstorno)
              }
              className="bg-red-600 hover:bg-red-700"
            >
              {busy ? "Excluindo..." : "Excluir"}
            </AlertDialogAction>
          </div>
        </AlertDialogContent>
      </AlertDialog>

      <Dialog
        open={createOpen}
        onOpenChange={(open) => {
          if (!open) {
            setCreateOpen(false);
            setPiecesInput("");
          }
        }}
      >
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Criar caixa na OP #{opId}</DialogTitle>
          </DialogHeader>
          <div className="space-y-3 text-sm">
            <p>
              Disponível vs JERP:{" "}
              <strong>{available ?? "—"}</strong> peças
              {data.fullBoxPieces != null
                ? ` (padrão: 1 caixa cheia = ${data.fullBoxPieces})`
                : ""}
            </p>
            <div>
              <label className="block text-sm font-medium mb-1">
                Peças (opcional)
              </label>
              <Input
                type="number"
                min={1}
                value={piecesInput}
                onChange={(e) => setPiecesInput(e.target.value)}
                placeholder={
                  data.fullBoxPieces
                    ? `Vazio = até ${data.fullBoxPieces}`
                    : "Quantidade de peças"
                }
              />
            </div>
          </div>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setCreateOpen(false)}
              disabled={busy}
            >
              Cancelar
            </Button>
            <Button onClick={handleCreate} disabled={busy}>
              {busy ? "Criando..." : "Criar"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
