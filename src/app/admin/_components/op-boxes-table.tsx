"use client";

import { useEffect, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
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
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Trash2, Edit2 } from "lucide-react";
import { AdvancedFilter, FilterField } from "./advanced-filter";

interface OpBox {
  id: string;
  opId: number;
  code: string;
  status: string;
  createdAt: string;
  packedAt?: string;
  barCode?: string;
}

export function OpBoxesTable() {
  const filterFields: FilterField[] = [
    { key: "code", label: "Código", type: "text" },
    {
      key: "status",
      label: "Status",
      type: "select",
      options: [
        { value: "PENDING", label: "Pendente" },
        { value: "PACKAGED", label: "Embalado" },
        { value: "PACKAGED_W_BREAK", label: "Embalado com Quebra" },
      ],
    },
    { key: "opId", label: "OP ID", type: "number" },
  ];
  const [opBoxes, setOpBoxes] = useState<OpBox[]>([]);
  const [filteredOpBoxes, setFilteredOpBoxes] = useState<OpBox[]>([]);
  const [loading, setLoading] = useState(true);
  const [deleteTarget, setDeleteTarget] = useState<OpBox | null>(null);
  const [confirmEstorno, setConfirmEstorno] = useState(false);
  const [filters, setFilters] = useState<Record<string, string | number>>({
    search: "",
    code: "",
    status: "",
    opId: "",
  });
  const [editingId, setEditingId] = useState<string | null>(null);
  const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false);
  const [formData, setFormData] = useState({
    opId: 0,
    code: "",
    status: "PENDING",
    pieces: "",
  });
  const { toast } = useToast();

  useEffect(() => {
    fetchOpBoxes();
  }, []);

  useEffect(() => {
    const filtered = opBoxes.filter((opBox) => {
      const searchLower = (filters.search || "").toString().toLowerCase();
      const codeLower = (filters.code || "").toString().toLowerCase();
      const status = (filters.status || "").toString();
      const opId = filters.opId ? parseInt(filters.opId.toString()) : null;

      return (
        (searchLower === "" ||
          opBox.code.toLowerCase().includes(searchLower) ||
          opBox.status.toLowerCase().includes(searchLower)) &&
        (codeLower === "" || opBox.code.toLowerCase().includes(codeLower)) &&
        (status === "" || opBox.status === status) &&
        (opId === null || opBox.opId === opId)
      );
    });
    setFilteredOpBoxes(filtered);
  }, [filters, opBoxes]);

  async function fetchOpBoxes() {
    try {
      setLoading(true);
      const response = await fetch("/api/admin/op-boxes");
      if (!response.ok) throw new Error("Erro ao carregar caixas");
      const data = await response.json();
      setOpBoxes(data);
    } catch (error: any) {
      toast({
        title: "Erro",
        description: error.message,
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  }

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
      const response = await fetch(`/api/admin/op-boxes/${deleteTarget.id}`, {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          confirmJerpReversal: needsEstorno ? confirmEstorno : false,
        }),
      });
      const body = await response.json().catch(() => ({}));
      if (!response.ok) {
        throw new Error(body.error || "Erro ao deletar caixa");
      }
      toast({
        title: "Sucesso",
        description:
          "Caixa excluída. Pendentes recriadas a partir do restante JERP.",
      });
      setDeleteTarget(null);
      setConfirmEstorno(false);
      fetchOpBoxes();
    } catch (error: any) {
      toast({
        title: "Erro",
        description: error.message,
        variant: "destructive",
      });
    }
  }

  async function handleSave() {
    if (formData.opId <= 0) {
      toast({
        title: "Erro",
        description: "ID da OP é obrigatório",
        variant: "destructive",
      });
      return;
    }

    try {
      if (editingId) {
        if (!formData.code) {
          toast({
            title: "Erro",
            description: "Código é obrigatório para editar",
            variant: "destructive",
          });
          return;
        }
        const response = await fetch(`/api/admin/op-boxes/${editingId}`, {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            opId: formData.opId,
            code: formData.code,
            status: formData.status,
          }),
        });
        const body = await response.json().catch(() => ({}));
        if (!response.ok) {
          throw new Error(body.error || "Erro ao atualizar caixa");
        }
        toast({ title: "Sucesso", description: "Caixa atualizada com sucesso" });
      } else {
        const pieces =
          formData.pieces.trim() === ""
            ? undefined
            : Number(formData.pieces);
        if (pieces != null && (Number.isNaN(pieces) || pieces <= 0)) {
          throw new Error("Informe uma quantidade de peças válida");
        }
        const response = await fetch("/api/admin/op-boxes", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ opId: formData.opId, pieces }),
        });
        const body = await response.json().catch(() => ({}));
        if (!response.ok) {
          throw new Error(body.error || "Erro ao criar caixa");
        }
        toast({
          title: "Sucesso",
          description: `Caixa ${body.code} criada com ${body.pieces} peças`,
        });
      }

      setIsCreateDialogOpen(false);
      setEditingId(null);
      setFormData({ opId: 0, code: "", status: "PENDING", pieces: "" });
      fetchOpBoxes();
    } catch (error: any) {
      toast({
        title: "Erro",
        description: error.message,
        variant: "destructive",
      });
    }
  }

  function handleEdit(opBox: OpBox) {
    setFormData({
      opId: opBox.opId,
      code: opBox.code,
      status: opBox.status,
      pieces: "",
    });
    setEditingId(opBox.id);
    setIsCreateDialogOpen(true);
  }

  function handleCreateNew() {
    setFormData({ opId: 0, code: "", status: "PENDING", pieces: "" });
    setEditingId(null);
    setIsCreateDialogOpen(true);
  }

  function handleCloseDialog() {
    setIsCreateDialogOpen(false);
    setEditingId(null);
    setFormData({ opId: 0, code: "", status: "PENDING", pieces: "" });
  }

  function handleFilterChange(key: string, value: string | number) {
    setFilters((prev) => ({ ...prev, [key]: value }));
  }

  function handleClearFilters() {
    setFilters({
      search: "",
      code: "",
      status: "",
      opId: "",
    });
  }

  if (loading) {
    return <div className="text-center py-8">Carregando...</div>;
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Caixas (OpBox)</CardTitle>
      </CardHeader>
      <CardContent>
        <p className="text-sm text-muted-foreground mb-4">
          Criação e exclusão validam o restante da OP no JERP. Caixas apontadas
          só podem ser excluídas após estorno refletido no JERP.
        </p>
        <AdvancedFilter
          fields={filterFields}
          filters={filters}
          onFilterChange={handleFilterChange}
          onClearAll={handleClearFilters}
          placeholder="Pesquisar por código ou status..."
          onCreateClick={handleCreateNew}
        />

        <div className="overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>ID</TableHead>
                <TableHead>OP ID</TableHead>
                <TableHead>Código</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Código de Barras</TableHead>
                <TableHead>Criado em</TableHead>
                <TableHead>Embalado em</TableHead>
                <TableHead className="text-right">Ações</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredOpBoxes.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={8} className="text-center py-8">
                    {Object.values(filters).some((v) => v !== "" && v !== 0)
                      ? "Nenhuma caixa encontrada com esse filtro"
                      : "Nenhuma caixa encontrada"}
                  </TableCell>
                </TableRow>
              ) : (
                filteredOpBoxes.map((opBox) => (
                  <TableRow key={opBox.id}>
                    <TableCell className="font-mono text-xs">
                      {opBox.id}
                    </TableCell>
                    <TableCell>{opBox.opId}</TableCell>
                    <TableCell className="font-mono">{opBox.code}</TableCell>
                    <TableCell>
                      <span
                        className={`px-2 py-1 rounded text-xs font-medium ${
                          opBox.status === "PACKAGED"
                            ? "bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200"
                            : opBox.status === "PACKAGED_W_BREAK"
                              ? "bg-orange-100 text-orange-800 dark:bg-orange-900 dark:text-orange-200"
                              : "bg-gray-100 text-gray-800 dark:bg-gray-700 dark:text-gray-200"
                        }`}
                      >
                        {opBox.status}
                      </span>
                    </TableCell>
                    <TableCell className="font-mono text-xs">
                      {opBox.barCode || "-"}
                    </TableCell>
                    <TableCell className="text-sm">
                      {new Date(opBox.createdAt).toLocaleDateString("pt-BR")}
                    </TableCell>
                    <TableCell className="text-sm">
                      {opBox.packedAt
                        ? new Date(opBox.packedAt).toLocaleDateString("pt-BR")
                        : "-"}
                    </TableCell>
                    <TableCell className="text-right flex gap-2 justify-end">
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => handleEdit(opBox)}
                      >
                        <Edit2 className="w-4 h-4" />
                      </Button>
                      <Button
                        variant="destructive"
                        size="sm"
                        onClick={() => {
                          setConfirmEstorno(false);
                          setDeleteTarget(opBox);
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
      </CardContent>

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
                      Caixa apontada (barcode {deleteTarget.barCode}). Efetue o
                      estorno no JERP antes de confirmar.
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
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction
              onClick={(e) => {
                e.preventDefault();
                handleDelete();
              }}
              disabled={
                Boolean(deleteTarget?.barCode) && !confirmEstorno
              }
              className="bg-red-600 hover:bg-red-700"
            >
              Deletar
            </AlertDialogAction>
          </div>
        </AlertDialogContent>
      </AlertDialog>

      <Dialog open={isCreateDialogOpen} onOpenChange={handleCloseDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>
              {editingId ? "Editar Caixa" : "Criar Nova Caixa"}
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium mb-1">OP ID *</label>
              <Input
                type="number"
                value={formData.opId || ""}
                onChange={(e) =>
                  setFormData({
                    ...formData,
                    opId: parseInt(e.target.value) || 0,
                  })
                }
                placeholder="ID da OP"
                disabled={Boolean(editingId)}
              />
            </div>
            {editingId ? (
              <>
                <div>
                  <label className="block text-sm font-medium mb-1">
                    Código *
                  </label>
                  <Input
                    value={formData.code}
                    onChange={(e) =>
                      setFormData({ ...formData, code: e.target.value })
                    }
                    placeholder="Código da caixa"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium mb-1">
                    Status
                  </label>
                  <select
                    value={formData.status}
                    onChange={(e) =>
                      setFormData({ ...formData, status: e.target.value })
                    }
                    className="w-full px-3 py-2 border border-gray-300 rounded-md dark:bg-gray-800 dark:border-gray-600"
                  >
                    <option value="PENDING">Pendente</option>
                    <option value="PACKAGED">Embalado</option>
                    <option value="PACKAGED_W_BREAK">
                      Embalado com Quebra
                    </option>
                  </select>
                </div>
              </>
            ) : (
              <div>
                <label className="block text-sm font-medium mb-1">
                  Peças (opcional)
                </label>
                <Input
                  type="number"
                  min={1}
                  value={formData.pieces}
                  onChange={(e) =>
                    setFormData({ ...formData, pieces: e.target.value })
                  }
                  placeholder="Vazio = 1 caixa cheia (limitada ao JERP)"
                />
                <p className="text-xs text-muted-foreground mt-1">
                  Código e blisters são gerados automaticamente a partir da
                  configuração da OP e do restante JERP.
                </p>
              </div>
            )}
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={handleCloseDialog}>
              Cancelar
            </Button>
            <Button
              onClick={handleSave}
              className="bg-blue-600 hover:bg-blue-700"
            >
              {editingId ? "Atualizar" : "Criar"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </Card>
  );
}
