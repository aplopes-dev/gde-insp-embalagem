"use client";

import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { X } from "lucide-react";

interface GenericFilterProps {
  searchTerm: string;
  onSearchChange: (value: string) => void;
  onClear: () => void;
  placeholder?: string;
  onCreateClick?: () => void;
}

export function GenericFilter({
  searchTerm,
  onSearchChange,
  onClear,
  placeholder = "Pesquisar...",
  onCreateClick,
}: GenericFilterProps) {
  return (
    <div className="flex gap-2 mb-4">
      <div className="flex-1 relative">
        <Input
          placeholder={placeholder}
          value={searchTerm}
          onChange={(e) => onSearchChange(e.target.value)}
          className="pr-10"
        />
        {searchTerm && (
          <button
            onClick={onClear}
            className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 dark:hover:text-gray-300"
          >
            <X className="w-4 h-4" />
          </button>
        )}
      </div>
      {onCreateClick && (
        <Button onClick={onCreateClick} className="bg-blue-600 hover:bg-blue-700">
          + Criar
        </Button>
      )}
    </div>
  );
}

