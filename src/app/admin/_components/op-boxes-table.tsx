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
    { key: "status", label: "Status", type: "select", options: [
      { value: "PENDING", label: "Pendente" },
      { value: "PACKAGED", label: "Embalado" },
      { value: "PACKAGED_W_BREAK", label: "Embalado com Quebra" },
    ]},
    { key: "opId", label: "OP ID", type: "number" },
  ];
  const [opBoxes, setOpBoxes] = useState<OpBox[]>([]);
  const [filteredOpBoxes, setFilteredOpBoxes] = useState<OpBox[]>([]);
  const [loading, setLoading] = useState(true);
  const [deleteId, setDeleteId] = useState<string | null>(null);
  const [filters, setFilters] = useState<Record<string, string | number>>({
    search: "",
    code: "",
    status: "",
    opId: "",
  });
  const [editingId, setEditingId] = useState<string | null>(null);
  const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false);
  const [formData, setFormData] = useState({ id: "", opId: 0, code: "", status: "PENDING" });
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

  async function handleDelete(id: string) {
    try {
      const response = await fetch(`/api/admin/op-boxes/${id}`, {
        method: "DELETE",
      });
      if (!response.ok) throw new Error("Erro ao deletar caixa");
      toast({
        title: "Sucesso",
        description: "Caixa deletada com sucesso",
      });
      setDeleteId(null);
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
    if (!formData.code || formData.opId <= 0 || (!editingId && !formData.id)) {
      toast({
        title: "Erro",
        description: editingId ? "Código e ID da OP são obrigatórios" : "ID, código e ID da OP são obrigatórios",
        variant: "destructive",
      });
      return;
    }

    try {
      const method = editingId ? "PUT" : "POST";
      const url = editingId
        ? `/api/admin/op-boxes/${editingId}`
        : "/api/admin/op-boxes";

      const response = await fetch(url, {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(formData),
      });

      if (!response.ok) throw new Error("Erro ao salvar caixa");

      toast({
        title: "Sucesso",
        description: editingId ? "Caixa atualizada com sucesso" : "Caixa criada com sucesso",
      });

      setIsCreateDialogOpen(false);
      setEditingId(null);
      setFormData({ id: "", opId: 0, code: "", status: "PENDING" });
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
      id: opBox.id,
      opId: opBox.opId,
      code: opBox.code,
      status: opBox.status,
    });
    setEditingId(opBox.id);
    setIsCreateDialogOpen(true);
  }

  function handleCreateNew() {
    setFormData({ id: "", opId: 0, code: "", status: "PENDING" });
    setEditingId(null);
    setIsCreateDialogOpen(true);
  }

  function handleCloseDialog() {
    setIsCreateDialogOpen(false);
    setEditingId(null);
    setFormData({ id: "", opId: 0, code: "", status: "PENDING" });
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
                    <TableCell className="font-mono text-xs">{opBox.id}</TableCell>
                    <TableCell>{opBox.opId}</TableCell>
                    <TableCell className="font-mono">{opBox.code}</TableCell>
                    <TableCell>
                      <span className={`px-2 py-1 rounded text-xs font-medium ${
                        opBox.status === "PACKAGED"
                          ? "bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200"
                          : opBox.status === "PACKAGED_W_BREAK"
                          ? "bg-orange-100 text-orange-800 dark:bg-orange-900 dark:text-orange-200"
                          : "bg-gray-100 text-gray-800 dark:bg-gray-700 dark:text-gray-200"
                      }`}>
                        {opBox.status}
                      </span>
                    </TableCell>
                    <TableCell className="font-mono text-xs">{opBox.barCode || "-"}</TableCell>
                    <TableCell className="text-sm">
                      {new Date(opBox.createdAt).toLocaleDateString("pt-BR")}
                    </TableCell>
                    <TableCell className="text-sm">
                      {opBox.packedAt ? new Date(opBox.packedAt).toLocaleDateString("pt-BR") : "-"}
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
                        onClick={() => setDeleteId(opBox.id)}
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
              Tem certeza que deseja deletar esta caixa? Todos os blisters associados também serão deletados. Esta ação não poderá ser desfeita.
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
              {editingId ? "Editar Caixa" : "Criar Nova Caixa"}
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            {!editingId && (
              <div>
                <label className="block text-sm font-medium mb-1">ID *</label>
                <Input
                  value={formData.id}
                  onChange={(e) => setFormData({ ...formData, id: e.target.value })}
                  placeholder="ID único"
                />
              </div>
            )}
            <div>
              <label className="block text-sm font-medium mb-1">OP ID *</label>
              <Input
                type="number"
                value={formData.opId}
                onChange={(e) => setFormData({ ...formData, opId: parseInt(e.target.value) || 0 })}
                placeholder="ID da OP"
              />
            </div>
            <div>
              <label className="block text-sm font-medium mb-1">Código *</label>
              <Input
                value={formData.code}
                onChange={(e) => setFormData({ ...formData, code: e.target.value })}
                placeholder="Código da caixa"
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
                <option value="PACKAGED">Embalado</option>
                <option value="PACKAGED_W_BREAK">Embalado com Quebra</option>
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

