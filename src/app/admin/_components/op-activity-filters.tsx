"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { X } from "lucide-react";

interface ActivityFilters {
  actionType: string;
  userId: string;
  startDate: string;
  endDate: string;
  status: string;
  searchId: string;
}

interface OpActivityFiltersProps {
  onFilterChange: (filters: ActivityFilters) => void;
  users: Array<{ id: string; name: string; email: string; role: string }>;
}

export function OpActivityFilters({
  onFilterChange,
  users,
}: OpActivityFiltersProps) {
  const [filters, setFilters] = useState<ActivityFilters>({
    actionType: "",
    userId: "",
    startDate: "",
    endDate: "",
    status: "",
    searchId: "",
  });

  const handleFilterChange = (key: keyof ActivityFilters, value: string) => {
    const newFilters = { ...filters, [key]: value };
    setFilters(newFilters);
    onFilterChange(newFilters);
  };

  const handleClearFilters = () => {
    const emptyFilters: ActivityFilters = {
      actionType: "",
      userId: "",
      startDate: "",
      endDate: "",
      status: "",
      searchId: "",
    };
    setFilters(emptyFilters);
    onFilterChange(emptyFilters);
  };

  const activeFiltersCount = Object.values(filters).filter(
    (v) => v !== ""
  ).length;

  return (
    <Card className="p-4 space-y-4">
      <div className="flex items-center justify-between">
        <h3 className="font-semibold">Filtros Avançados</h3>
        {activeFiltersCount > 0 && (
          <Badge variant="secondary">{activeFiltersCount} filtros ativos</Badge>
        )}
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {/* Tipo de Ação */}
        <div>
          <label className="text-sm font-medium mb-2 block">
            Tipo de Ação
          </label>
          <Select
            value={filters.actionType || "all"}
            onValueChange={(value) =>
              handleFilterChange("actionType", value === "all" ? "" : value)
            }
          >
            <SelectTrigger>
              <SelectValue placeholder="Selecione..." />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Todos</SelectItem>
              <SelectItem value="BOX_PACKED">Caixa embalada</SelectItem>
              <SelectItem value="BOX_BREAK_AUTHORIZED">
                Quebra autorizada
              </SelectItem>
              <SelectItem value="PRODUCT_CREATED">Peça Criada</SelectItem>
              <SelectItem value="PRODUCT_AUTHORIZED">
                Peça Autorizada
              </SelectItem>
              <SelectItem value="OP_STARTED">OP Iniciada</SelectItem>
              <SelectItem value="OP_COMPLETED">OP Concluída</SelectItem>
            </SelectContent>
          </Select>
        </div>

        {/* Usuário */}
        <div>
          <label className="text-sm font-medium mb-2 block">Usuário</label>
          <Select
            value={filters.userId || "all"}
            onValueChange={(value) =>
              handleFilterChange("userId", value === "all" ? "" : value)
            }
          >
            <SelectTrigger>
              <SelectValue placeholder="Selecione..." />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Todos</SelectItem>
              {users.map((user) => (
                <SelectItem key={user.id} value={user.id}>
                  {user.name} ({user.role})
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        {/* Data Inicial */}
        <div>
          <label className="text-sm font-medium mb-2 block">
            Data Inicial
          </label>
          <Input
            type="date"
            value={filters.startDate}
            onChange={(e) =>
              handleFilterChange("startDate", e.target.value)
            }
          />
        </div>

        {/* Data Final */}
        <div>
          <label className="text-sm font-medium mb-2 block">Data Final</label>
          <Input
            type="date"
            value={filters.endDate}
            onChange={(e) => handleFilterChange("endDate", e.target.value)}
          />
        </div>

        {/* Buscar por ID */}
        <div>
          <label className="text-sm font-medium mb-2 block">
            Buscar por ID (Caixa/Peça)
          </label>
          <Input
            placeholder="Digite o ID..."
            value={filters.searchId}
            onChange={(e) => handleFilterChange("searchId", e.target.value)}
          />
        </div>
      </div>

      {/* Filtros Ativos */}
      {activeFiltersCount > 0 && (
        <div className="flex flex-wrap gap-2 pt-2 border-t">
          {filters.actionType && (
            <Badge
              variant="outline"
              className="flex items-center gap-1 cursor-pointer"
              onClick={() => handleFilterChange("actionType", "")}
            >
              Ação: {filters.actionType}
              <X className="w-3 h-3" />
            </Badge>
          )}
          {filters.userId && (
            <Badge
              variant="outline"
              className="flex items-center gap-1 cursor-pointer"
              onClick={() => handleFilterChange("userId", "")}
            >
              Usuário
              <X className="w-3 h-3" />
            </Badge>
          )}
          {filters.startDate && (
            <Badge
              variant="outline"
              className="flex items-center gap-1 cursor-pointer"
              onClick={() => handleFilterChange("startDate", "")}
            >
              De: {filters.startDate}
              <X className="w-3 h-3" />
            </Badge>
          )}
          {filters.endDate && (
            <Badge
              variant="outline"
              className="flex items-center gap-1 cursor-pointer"
              onClick={() => handleFilterChange("endDate", "")}
            >
              Até: {filters.endDate}
              <X className="w-3 h-3" />
            </Badge>
          )}
          {filters.searchId && (
            <Badge
              variant="outline"
              className="flex items-center gap-1 cursor-pointer"
              onClick={() => handleFilterChange("searchId", "")}
            >
              ID: {filters.searchId}
              <X className="w-3 h-3" />
            </Badge>
          )}

          <Button
            variant="ghost"
            size="sm"
            onClick={handleClearFilters}
            className="ml-auto"
          >
            Limpar Tudo
          </Button>
        </div>
      )}
    </Card>
  );
}

