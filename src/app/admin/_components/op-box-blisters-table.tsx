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

interface OpBoxBlister {
  id: string;
  opBoxId: string;
  code: string;
  quantity: number;
  packedAt?: string;
}

export function OpBoxBlistersTable() {
  const filterFields: FilterField[] = [
    { key: "code", label: "Código", type: "text" },
    { key: "opBoxId", label: "OpBox ID", type: "text" },
    { key: "quantity", label: "Quantidade", type: "number" },
  ];
  const [blisters, setBlisters] = useState<OpBoxBlister[]>([]);
  const [filteredBlisters, setFilteredBlisters] = useState<OpBoxBlister[]>([]);
  const [loading, setLoading] = useState(true);
  const [deleteId, setDeleteId] = useState<string | null>(null);
  const [filters, setFilters] = useState<Record<string, string | number>>({
    search: "",
    code: "",
    opBoxId: "",
    quantity: "",
  });
  const [editingId, setEditingId] = useState<string | null>(null);
  const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false);
  const [formData, setFormData] = useState({ id: "", opBoxId: "", code: "", quantity: 0 });
  const { toast } = useToast();

  useEffect(() => {
    fetchBlisters();
  }, []);

  useEffect(() => {
    const filtered = blisters.filter((blister) => {
      const searchLower = (filters.search || "").toString().toLowerCase();
      const codeLower = (filters.code || "").toString().toLowerCase();
      const opBoxIdLower = (filters.opBoxId || "").toString().toLowerCase();
      const quantity = filters.quantity ? parseInt(filters.quantity.toString()) : null;

      return (
        (searchLower === "" ||
          blister.code.toLowerCase().includes(searchLower) ||
          blister.opBoxId.toLowerCase().includes(searchLower)) &&
        (codeLower === "" || blister.code.toLowerCase().includes(codeLower)) &&
        (opBoxIdLower === "" || blister.opBoxId.toLowerCase().includes(opBoxIdLower)) &&
        (quantity === null || blister.quantity === quantity)
      );
    });
    setFilteredBlisters(filtered);
  }, [filters, blisters]);

  async function fetchBlisters() {
    try {
      setLoading(true);
      const response = await fetch("/api/admin/op-box-blisters");
      if (!response.ok) throw new Error("Erro ao carregar blisters");
      const data = await response.json();
      setBlisters(data);
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
      const response = await fetch(`/api/admin/op-box-blisters/${id}`, {
        method: "DELETE",
      });
      if (!response.ok) throw new Error("Erro ao deletar blister");
      toast({
        title: "Sucesso",
        description: "Blister deletado com sucesso",
      });
      setDeleteId(null);
      fetchBlisters();
    } catch (error: any) {
      toast({
        title: "Erro",
        description: error.message,
        variant: "destructive",
      });
    }
  }

  async function handleSave() {
    if (!formData.code || !formData.opBoxId || formData.quantity <= 0 || (!editingId && !formData.id)) {
      toast({
        title: "Erro",
        description: editingId ? "Código, OpBox ID e quantidade são obrigatórios" : "ID, código, OpBox ID e quantidade são obrigatórios",
        variant: "destructive",
      });
      return;
    }

    try {
      const method = editingId ? "PUT" : "POST";
      const url = editingId
        ? `/api/admin/op-box-blisters/${editingId}`
        : "/api/admin/op-box-blisters";

      const response = await fetch(url, {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(formData),
      });

      if (!response.ok) throw new Error("Erro ao salvar blister");

      toast({
        title: "Sucesso",
        description: editingId ? "Blister atualizado com sucesso" : "Blister criado com sucesso",
      });

      handleCloseDialogAfterSave();
      fetchBlisters();
    } catch (error: any) {
      toast({
        title: "Erro",
        description: error.message,
        variant: "destructive",
      });
    }
  }

  function handleEdit(blister: OpBoxBlister) {
    setFormData({
      id: blister.id,
      opBoxId: blister.opBoxId,
      code: blister.code,
      quantity: blister.quantity,
    });
    setEditingId(blister.id);
    setIsCreateDialogOpen(true);
  }

  function handleCreateNew() {
    setFormData({ id: "", opBoxId: "", code: "", quantity: 0 });
    setEditingId(null);
    setIsCreateDialogOpen(true);
  }

  function handleCloseDialog() {
    setIsCreateDialogOpen(false);
    setEditingId(null);
    setFormData({ id: "", opBoxId: "", code: "", quantity: 0 });
  }

  function handleCloseDialogAfterSave() {
    setIsCreateDialogOpen(false);
    setEditingId(null);
    setFormData({ id: "", opBoxId: "", code: "", quantity: 0 });
  }

  function handleFilterChange(key: string, value: string | number) {
    setFilters((prev) => ({ ...prev, [key]: value }));
  }

  function handleClearFilters() {
    setFilters({
      search: "",
      code: "",
      opBoxId: "",
      quantity: "",
    });
  }

  if (loading) {
    return <div className="text-center py-8">Carregando...</div>;
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Blisters (OpBoxBlister)</CardTitle>
      </CardHeader>
      <CardContent>
        <AdvancedFilter
          fields={filterFields}
          filters={filters}
          onFilterChange={handleFilterChange}
          onClearAll={handleClearFilters}
          placeholder="Pesquisar por código ou OpBox ID..."
          onCreateClick={handleCreateNew}
        />

        <div className="overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>ID</TableHead>
                <TableHead>OpBox ID</TableHead>
                <TableHead>Código</TableHead>
                <TableHead>Quantidade</TableHead>
                <TableHead>Embalado em</TableHead>
                <TableHead className="text-right">Ações</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredBlisters.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={6} className="text-center py-8">
                    {Object.values(filters).some((v) => v !== "" && v !== 0)
                      ? "Nenhum blister encontrado com esse filtro"
                      : "Nenhum blister encontrado"}
                  </TableCell>
                </TableRow>
              ) : (
                filteredBlisters.map((blister) => (
                  <TableRow key={blister.id}>
                    <TableCell className="font-mono text-xs">{blister.id}</TableCell>
                    <TableCell className="font-mono text-xs">{blister.opBoxId}</TableCell>
                    <TableCell className="font-mono">{blister.code}</TableCell>
                    <TableCell>{blister.quantity}</TableCell>
                    <TableCell className="text-sm">
                      {blister.packedAt ? new Date(blister.packedAt).toLocaleDateString("pt-BR") : "-"}
                    </TableCell>
                    <TableCell className="text-right flex gap-2 justify-end">
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => handleEdit(blister)}
                      >
                        <Edit2 className="w-4 h-4" />
                      </Button>
                      <Button
                        variant="destructive"
                        size="sm"
                        onClick={() => setDeleteId(blister.id)}
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
              Tem certeza que deseja deletar este blister? Esta ação não poderá ser desfeita.
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
              {editingId ? "Editar Blister" : "Criar Novo Blister"}
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
              <label className="block text-sm font-medium mb-1">OpBox ID *</label>
              <Input
                value={formData.opBoxId}
                onChange={(e) => setFormData({ ...formData, opBoxId: e.target.value })}
                placeholder="ID da caixa"
              />
            </div>
            <div>
              <label className="block text-sm font-medium mb-1">Código *</label>
              <Input
                value={formData.code}
                onChange={(e) => setFormData({ ...formData, code: e.target.value })}
                placeholder="Código do blister"
              />
            </div>
            <div>
              <label className="block text-sm font-medium mb-1">Quantidade *</label>
              <Input
                type="number"
                value={formData.quantity}
                onChange={(e) => setFormData({ ...formData, quantity: parseInt(e.target.value) || 0 })}
                placeholder="Quantidade"
              />
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

