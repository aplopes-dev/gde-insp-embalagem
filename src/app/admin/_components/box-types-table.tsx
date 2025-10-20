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

interface BoxType {
  id: number;
  name: string;
  code: string;
  description?: string;
  createdAt: string;
}

export function BoxTypesTable() {
  const filterFields: FilterField[] = [
    { key: "name", label: "Nome", type: "text" },
    { key: "code", label: "Código", type: "text" },
    { key: "description", label: "Descrição", type: "text" },
  ];
  const [boxTypes, setBoxTypes] = useState<BoxType[]>([]);
  const [filteredBoxTypes, setFilteredBoxTypes] = useState<BoxType[]>([]);
  const [loading, setLoading] = useState(true);
  const [deleteId, setDeleteId] = useState<number | null>(null);
  const [filters, setFilters] = useState<Record<string, string | number>>({
    search: "",
    name: "",
    code: "",
    description: "",
  });
  const [editingId, setEditingId] = useState<number | null>(null);
  const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false);
  const [formData, setFormData] = useState({ id: 0, name: "", code: "", description: "" });
  const { toast } = useToast();

  useEffect(() => {
    fetchBoxTypes();
  }, []);

  useEffect(() => {
    const filtered = boxTypes.filter((boxType) => {
      const searchLower = (filters.search || "").toString().toLowerCase();
      const nameLower = (filters.name || "").toString().toLowerCase();
      const codeLower = (filters.code || "").toString().toLowerCase();
      const descLower = (filters.description || "").toString().toLowerCase();

      return (
        (searchLower === "" ||
          boxType.name.toLowerCase().includes(searchLower) ||
          boxType.code.toLowerCase().includes(searchLower)) &&
        (nameLower === "" || boxType.name.toLowerCase().includes(nameLower)) &&
        (codeLower === "" || boxType.code.toLowerCase().includes(codeLower)) &&
        (descLower === "" || (boxType.description?.toLowerCase().includes(descLower) ?? false))
      );
    });
    setFilteredBoxTypes(filtered);
  }, [filters, boxTypes]);

  async function fetchBoxTypes() {
    try {
      setLoading(true);
      const response = await fetch("/api/admin/box-types");
      if (!response.ok) throw new Error("Erro ao carregar tipos de caixa");
      const data = await response.json();
      setBoxTypes(data);
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
      const response = await fetch(`/api/admin/box-types/${id}`, {
        method: "DELETE",
      });
      if (!response.ok) throw new Error("Erro ao deletar tipo de caixa");
      toast({
        title: "Sucesso",
        description: "Tipo de caixa deletado com sucesso",
      });
      setDeleteId(null);
      fetchBoxTypes();
    } catch (error: any) {
      toast({
        title: "Erro",
        description: error.message,
        variant: "destructive",
      });
    }
  }

  async function handleSave() {
    if (!formData.name || !formData.code || (!editingId && formData.id <= 0)) {
      toast({
        title: "Erro",
        description: editingId ? "Nome e código são obrigatórios" : "ID, nome e código são obrigatórios",
        variant: "destructive",
      });
      return;
    }

    try {
      const method = editingId ? "PUT" : "POST";
      const url = editingId
        ? `/api/admin/box-types/${editingId}`
        : "/api/admin/box-types";

      const response = await fetch(url, {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(formData),
      });

      if (!response.ok) throw new Error("Erro ao salvar tipo de caixa");

      toast({
        title: "Sucesso",
        description: editingId ? "Tipo de caixa atualizado com sucesso" : "Tipo de caixa criado com sucesso",
      });

      setIsCreateDialogOpen(false);
      setEditingId(null);
      setFormData({ id: 0, name: "", code: "", description: "" });
      fetchBoxTypes();
    } catch (error: any) {
      toast({
        title: "Erro",
        description: error.message,
        variant: "destructive",
      });
    }
  }

  function handleEdit(boxType: BoxType) {
    setFormData({
      id: boxType.id,
      name: boxType.name,
      code: boxType.code,
      description: boxType.description || "",
    });
    setEditingId(boxType.id);
    setIsCreateDialogOpen(true);
  }

  function handleCreateNew() {
    setFormData({ id: 0, name: "", code: "", description: "" });
    setEditingId(null);
    setIsCreateDialogOpen(true);
  }

  function handleCloseDialog() {
    setIsCreateDialogOpen(false);
    setEditingId(null);
    setFormData({ id: 0, name: "", code: "", description: "" });
  }

  function handleFilterChange(key: string, value: string | number) {
    setFilters((prev) => ({ ...prev, [key]: value }));
  }

  function handleClearFilters() {
    setFilters({
      search: "",
      name: "",
      code: "",
      description: "",
    });
  }

  if (loading) {
    return <div className="text-center py-8">Carregando...</div>;
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Tipos de Caixa</CardTitle>
      </CardHeader>
      <CardContent>
        <AdvancedFilter
          fields={filterFields}
          filters={filters}
          onFilterChange={handleFilterChange}
          onClearAll={handleClearFilters}
          placeholder="Pesquisar por nome ou código..."
          onCreateClick={handleCreateNew}
        />

        <div className="overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>ID</TableHead>
                <TableHead>Código</TableHead>
                <TableHead>Nome</TableHead>
                <TableHead>Descrição</TableHead>
                <TableHead>Criado em</TableHead>
                <TableHead className="text-right">Ações</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredBoxTypes.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={6} className="text-center py-8">
                    {Object.values(filters).some((v) => v !== "" && v !== 0)
                      ? "Nenhum tipo de caixa encontrado com esse filtro"
                      : "Nenhum tipo de caixa encontrado"}
                  </TableCell>
                </TableRow>
              ) : (
                filteredBoxTypes.map((boxType) => (
                  <TableRow key={boxType.id}>
                    <TableCell>{boxType.id}</TableCell>
                    <TableCell className="font-mono">{boxType.code}</TableCell>
                    <TableCell>{boxType.name}</TableCell>
                    <TableCell className="text-sm text-gray-600 dark:text-gray-400">
                      {boxType.description || "-"}
                    </TableCell>
                    <TableCell className="text-sm">
                      {new Date(boxType.createdAt).toLocaleDateString("pt-BR")}
                    </TableCell>
                    <TableCell className="text-right flex gap-2 justify-end">
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => handleEdit(boxType)}
                      >
                        <Edit2 className="w-4 h-4" />
                      </Button>
                      <Button
                        variant="destructive"
                        size="sm"
                        onClick={() => setDeleteId(boxType.id)}
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
              Tem certeza que deseja deletar este tipo de caixa? Esta ação não poderá ser desfeita.
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
              {editingId ? "Editar Tipo de Caixa" : "Criar Novo Tipo de Caixa"}
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
              <label className="block text-sm font-medium mb-1">Nome *</label>
              <Input
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                placeholder="Nome do tipo de caixa"
              />
            </div>
            <div>
              <label className="block text-sm font-medium mb-1">Código *</label>
              <Input
                value={formData.code}
                onChange={(e) => setFormData({ ...formData, code: e.target.value })}
                placeholder="Código único"
              />
            </div>
            <div>
              <label className="block text-sm font-medium mb-1">Descrição</label>
              <Input
                value={formData.description}
                onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                placeholder="Descrição (opcional)"
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

