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

interface Op {
  id: number;
  code: string;
  quantityToProduce: number;
  status: string;
  createdAt: string;
  finishedAt?: string;
}

export function OpsTable() {
  const filterFields: FilterField[] = [
    { key: "code", label: "Código", type: "text" },
    { key: "status", label: "Status", type: "select", options: [
      { value: "PENDING", label: "Pendente" },
      { value: "IN_PROGRESS", label: "Em Progresso" },
      { value: "COMPLETED", label: "Concluído" },
    ]},
    { key: "quantityToProduce", label: "Quantidade", type: "number" },
  ];
  const [ops, setOps] = useState<Op[]>([]);
  const [filteredOps, setFilteredOps] = useState<Op[]>([]);
  const [loading, setLoading] = useState(true);
  const [deleteId, setDeleteId] = useState<number | null>(null);
  const [filters, setFilters] = useState<Record<string, string | number>>({
    search: "",
    code: "",
    status: "",
    quantityToProduce: "",
  });
  const [editingId, setEditingId] = useState<number | null>(null);
  const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false);
  const [formData, setFormData] = useState({ id: 0, code: "", quantityToProduce: 0, status: "PENDING" });
  const { toast } = useToast();

  useEffect(() => {
    fetchOps();
  }, []);

  useEffect(() => {
    const filtered = ops.filter((op) => {
      const searchLower = (filters.search || "").toString().toLowerCase();
      const codeLower = (filters.code || "").toString().toLowerCase();
      const status = (filters.status || "").toString();
      const quantity = filters.quantityToProduce ? parseInt(filters.quantityToProduce.toString()) : null;

      return (
        (searchLower === "" ||
          op.code.toLowerCase().includes(searchLower) ||
          op.status.toLowerCase().includes(searchLower)) &&
        (codeLower === "" || op.code.toLowerCase().includes(codeLower)) &&
        (status === "" || op.status === status) &&
        (quantity === null || op.quantityToProduce === quantity)
      );
    });
    setFilteredOps(filtered);
  }, [filters, ops]);

  async function fetchOps() {
    try {
      setLoading(true);
      const response = await fetch("/api/admin/ops");
      if (!response.ok) throw new Error("Erro ao carregar OPs");
      const data = await response.json();
      setOps(data);
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

  async function handleDelete(id: number) {
    try {
      const response = await fetch(`/api/admin/ops/${id}`, {
        method: "DELETE",
      });
      if (!response.ok) throw new Error("Erro ao deletar OP");
      toast({
        title: "Sucesso",
        description: "OP deletada com sucesso",
      });
      setDeleteId(null);
      fetchOps();
    } catch (error: any) {
      toast({
        title: "Erro",
        description: error.message,
        variant: "destructive",
      });
    }
  }

  async function handleSave() {
    if (!formData.code || formData.quantityToProduce <= 0 || (!editingId && formData.id <= 0)) {
      toast({
        title: "Erro",
        description: editingId ? "Código e quantidade são obrigatórios" : "ID, código e quantidade são obrigatórios",
        variant: "destructive",
      });
      return;
    }

    try {
      const method = editingId ? "PUT" : "POST";
      const url = editingId
        ? `/api/admin/ops/${editingId}`
        : "/api/admin/ops";

      const response = await fetch(url, {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(formData),
      });

      if (!response.ok) throw new Error("Erro ao salvar OP");

      toast({
        title: "Sucesso",
        description: editingId ? "OP atualizada com sucesso" : "OP criada com sucesso",
      });

      setIsCreateDialogOpen(false);
      setEditingId(null);
      setFormData({ id: 0, code: "", quantityToProduce: 0, status: "PENDING" });
      fetchOps();
    } catch (error: any) {
      toast({
        title: "Erro",
        description: error.message,
        variant: "destructive",
      });
    }
  }

  function handleEdit(op: Op) {
    setFormData({
      id: op.id,
      code: op.code,
      quantityToProduce: op.quantityToProduce,
      status: op.status,
    });
    setEditingId(op.id);
    setIsCreateDialogOpen(true);
  }

  function handleCreateNew() {
    setFormData({ id: 0, code: "", quantityToProduce: 0, status: "PENDING" });
    setEditingId(null);
    setIsCreateDialogOpen(true);
  }

  function handleCloseDialog() {
    setIsCreateDialogOpen(false);
    setEditingId(null);
    setFormData({ id: 0, code: "", quantityToProduce: 0, status: "PENDING" });
  }

  function handleFilterChange(key: string, value: string | number) {
    setFilters((prev) => ({ ...prev, [key]: value }));
  }

  function handleClearFilters() {
    setFilters({
      search: "",
      code: "",
      status: "",
      quantityToProduce: "",
    });
  }

  if (loading) {
    return <div className="text-center py-8">Carregando...</div>;
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Ordens de Produção (OPs)</CardTitle>
      </CardHeader>
      <CardContent>
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
                <TableHead>Código</TableHead>
                <TableHead>Quantidade</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Criado em</TableHead>
                <TableHead>Finalizado em</TableHead>
                <TableHead className="text-right">Ações</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredOps.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={7} className="text-center py-8">
                    {Object.values(filters).some((v) => v !== "" && v !== 0)
                      ? "Nenhuma OP encontrada com esse filtro"
                      : "Nenhuma OP encontrada"}
                  </TableCell>
                </TableRow>
              ) : (
                filteredOps.map((op) => (
                  <TableRow key={op.id}>
                    <TableCell>{op.id}</TableCell>
                    <TableCell className="font-mono">{op.code}</TableCell>
                    <TableCell>{op.quantityToProduce}</TableCell>
                    <TableCell>
                      <span className={`px-2 py-1 rounded text-xs font-medium ${
                        op.status === "COMPLETED"
                          ? "bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200"
                          : "bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-200"
                      }`}>
                        {op.status}
                      </span>
                    </TableCell>
                    <TableCell className="text-sm">
                      {new Date(op.createdAt).toLocaleDateString("pt-BR")}
                    </TableCell>
                    <TableCell className="text-sm">
                      {op.finishedAt ? new Date(op.finishedAt).toLocaleDateString("pt-BR") : "-"}
                    </TableCell>
                    <TableCell className="text-right flex gap-2 justify-end">
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => handleEdit(op)}
                      >
                        <Edit2 className="w-4 h-4" />
                      </Button>
                      <Button
                        variant="destructive"
                        size="sm"
                        onClick={() => setDeleteId(op.id)}
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

      <AlertDialog open={deleteId !== null} onOpenChange={() => setDeleteId(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Confirmar exclusão</AlertDialogTitle>
            <AlertDialogDescription>
              Tem certeza que deseja deletar esta OP? Todas as caixas e blisters associados também serão deletados. Esta ação não poderá ser desfeita.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <div className="flex gap-2 justify-end">
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => deleteId && handleDelete(deleteId)}
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
              {editingId ? "Editar OP" : "Criar Nova OP"}
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            {!editingId && (
              <div>
                <label className="block text-sm font-medium mb-1">ID *</label>
                <Input
                  type="number"
                  value={formData.id}
                  onChange={(e) => setFormData({ ...formData, id: parseInt(e.target.value) || 0 })}
                  placeholder="ID único"
                />
              </div>
            )}
            <div>
              <label className="block text-sm font-medium mb-1">Código *</label>
              <Input
                value={formData.code}
                onChange={(e) => setFormData({ ...formData, code: e.target.value })}
                placeholder="Código da OP"
              />
            </div>
            <div>
              <label className="block text-sm font-medium mb-1">Quantidade a Produzir *</label>
              <Input
                type="number"
                value={formData.quantityToProduce}
                onChange={(e) => setFormData({ ...formData, quantityToProduce: parseInt(e.target.value) || 0 })}
                placeholder="Quantidade"
              />
            </div>
            <div>
              <label className="block text-sm font-medium mb-1">Status</label>
              <select
                value={formData.status}
                onChange={(e) => setFormData({ ...formData, status: e.target.value })}
                className="w-full px-3 py-2 border border-gray-300 rounded-md dark:bg-gray-800 dark:border-gray-600"
              >
                <option value="PENDING">Pendente</option>
                <option value="IN_PROGRESS">Em Progresso</option>
                <option value="COMPLETED">Concluído</option>
              </select>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={handleCloseDialog}>
              Cancelar
            </Button>
            <Button onClick={handleSave} className="bg-blue-600 hover:bg-blue-700">
              {editingId ? "Atualizar" : "Criar"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </Card>
  );
}

