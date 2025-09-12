"use client";

import { useEffect } from "react";
import { useToast } from "@/components/ui/use-toast";

type Props = { total: number; hasFilters: boolean };

export default function NoResultsToast({ total, hasFilters }: Props) {
  const { toast } = useToast();
  useEffect(() => {
    if (hasFilters && total === 0) {
      toast({ title: "Nenhum registro encontrado", description: "Ajuste os filtros e tente novamente.", variant: "warning" as any });
    }
  }, [hasFilters, total, toast]);
  return null;
}

