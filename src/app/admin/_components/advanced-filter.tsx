"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { X, ChevronDown, Search } from "lucide-react";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
  DropdownMenuSeparator,
} from "@/components/ui/dropdown-menu";

export interface FilterField {
  key: string;
  label: string;
  type: "text" | "number" | "select";
  options?: { value: string; label: string }[];
}

interface AdvancedFilterProps {
  fields: FilterField[];
  filters: Record<string, string | number>;
  onFilterChange: (key: string, value: string | number) => void;
  onClearAll: () => void;
  onCreateClick?: () => void;
  onApplyClick?: () => void;
  placeholder?: string;
}

/** Evita que o DropdownMenu capture teclas/cliques dos inputs internos. */
function stopMenuKeyboard(e: React.SyntheticEvent) {
  e.stopPropagation();
}

export function AdvancedFilter({
  fields,
  filters,
  onFilterChange,
  onClearAll,
  onCreateClick,
  onApplyClick,
  placeholder = "Pesquisar...",
}: AdvancedFilterProps) {
  const [isOpen, setIsOpen] = useState(false);
  const activeFiltersCount = Object.values(filters).filter(
    (v) => v !== "" && v !== 0
  ).length;

  return (
    <div className="space-y-3 mb-4">
      <div className="flex gap-2 flex-wrap">
        <div className="flex-1 relative min-w-[200px]">
          <Input
            placeholder={placeholder}
            value={filters.search || ""}
            onChange={(e) => onFilterChange("search", e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter" && onApplyClick) {
                e.preventDefault();
                onApplyClick();
              }
            }}
            className="pr-10"
          />
          {filters.search && (
            <button
              type="button"
              onClick={() => onFilterChange("search", "")}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 dark:hover:text-gray-300"
            >
              <X className="w-4 h-4" />
            </button>
          )}
        </div>

        <DropdownMenu open={isOpen} onOpenChange={setIsOpen} modal={false}>
          <DropdownMenuTrigger asChild>
            <Button variant="outline" className="gap-2">
              <ChevronDown className="w-4 h-4" />
              Filtros {activeFiltersCount > 0 && `(${activeFiltersCount})`}
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent
            align="end"
            className="w-64"
            onCloseAutoFocus={(e) => e.preventDefault()}
          >
            {fields.map((field) => (
              <div
                key={field.key}
                className="px-2 py-2"
                onKeyDown={stopMenuKeyboard}
                onPointerDown={stopMenuKeyboard}
              >
                <label className="text-xs font-medium text-gray-600 dark:text-gray-400">
                  {field.label}
                </label>
                {field.type === "text" && (
                  <Input
                    placeholder={`Filtrar por ${field.label.toLowerCase()}`}
                    value={filters[field.key] || ""}
                    onChange={(e) => onFilterChange(field.key, e.target.value)}
                    className="mt-1 h-8 text-sm"
                  />
                )}
                {field.type === "number" && (
                  <Input
                    type="number"
                    placeholder={`Filtrar por ${field.label.toLowerCase()}`}
                    value={filters[field.key] || ""}
                    onChange={(e) =>
                      onFilterChange(
                        field.key,
                        e.target.value ? parseInt(e.target.value) : ""
                      )
                    }
                    className="mt-1 h-8 text-sm"
                  />
                )}
                {field.type === "select" && field.options && (
                  <select
                    value={filters[field.key] || ""}
                    onChange={(e) => onFilterChange(field.key, e.target.value)}
                    className="mt-1 w-full h-8 text-sm border rounded px-2 bg-white dark:bg-gray-800"
                  >
                    <option value="">Todos</option>
                    {field.options.map((opt) => (
                      <option key={opt.value} value={opt.value}>
                        {opt.label}
                      </option>
                    ))}
                  </select>
                )}
              </div>
            ))}
            {activeFiltersCount > 0 && (
              <>
                <DropdownMenuSeparator />
                <DropdownMenuItem onClick={onClearAll} className="text-red-600">
                  Limpar Filtros
                </DropdownMenuItem>
              </>
            )}
          </DropdownMenuContent>
        </DropdownMenu>

        {onApplyClick && (
          <Button
            type="button"
            variant="secondary"
            className="gap-2"
            onClick={onApplyClick}
          >
            <Search className="w-4 h-4" />
            Buscar
          </Button>
        )}

        {onCreateClick && (
          <Button
            onClick={onCreateClick}
            className="bg-blue-600 hover:bg-blue-700"
          >
            + Criar
          </Button>
        )}
      </div>

      {activeFiltersCount > 0 && (
        <div className="flex flex-wrap gap-2">
          {Object.entries(filters).map(([key, value]) => {
            if (!value || value === "" || value === 0) return null;
            const field = fields.find((f) => f.key === key);
            const label =
              key === "search" ? "Busca" : field?.label || key;
            return (
              <div
                key={key}
                className="inline-flex items-center gap-2 px-3 py-1 bg-blue-100 dark:bg-blue-900 text-blue-800 dark:text-blue-200 rounded-full text-sm"
              >
                <span>
                  {label}: <strong>{value}</strong>
                </span>
                <button
                  type="button"
                  onClick={() => onFilterChange(key, "")}
                  className="hover:text-blue-600 dark:hover:text-blue-400"
                >
                  <X className="w-3 h-3" />
                </button>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
