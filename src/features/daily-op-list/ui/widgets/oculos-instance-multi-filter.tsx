"use client";

import { Column } from "@tanstack/react-table";
import { useEffect, useMemo, useState } from "react";
import { FilterType } from "@/types/filter";
import { Button } from "@/components/ui/button";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
  CommandSeparator,
} from "@/components/ui/command";
import NotificationCount from "@/components/ui/notification-count";
import { CheckIcon, PlusCircleIcon } from "lucide-react";
import { cn } from "@/shared/utils/tw-merge";

export function OculosInstanceMultiFilter<TData, TValue>({
  column,
}: {
  column?: Column<TData, TValue>;
}) {
  const selected: any = column?.getFilterValue();
  const [options, setOptions] = useState<{ label: string; value: string }[]>([]);
  const selectedValues = useMemo(() => {
    const set = new Set<string>(selected?.value || []);
    return set;
  }, [selected]);

  useEffect(() => {
    const load = async () => {
      try {
        const res = await fetch("/api/oculos-instances?status=ATIVO");
        const json = await res.json();
        const list = (json?.data || []).map((i: any) => ({
          value: String(i.id),
          label: i.nome,
        }));
        setOptions(list);
      } catch (e) {
        setOptions([]);
      }
    };
    load();
  }, []);

  function apply(values: string[]) {
    const filter: FilterType = {
      operator: "in",
      value: values,
    };
    column?.setFilterValue(filter);
  }

  return (
    <Popover>
      <PopoverTrigger asChild>
        <Button variant="outline" size="sm" className="h-8 border-dashed relative">
          <PlusCircleIcon className="mr-2 h-4 w-4" />
          Óculos
          {selectedValues.size > 0 && (
            <NotificationCount count={selectedValues.size} />
          )}
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-[220px] p-0" align="start">
        <Command>
          <CommandInput placeholder="Filtrar óculos" />
          <CommandList>
            <CommandEmpty>Nenhum óculos encontrado</CommandEmpty>
            <CommandGroup>
              {options.map((opt) => {
                const isSelected = selectedValues.has(opt.value);
                return (
                  <CommandItem
                    key={opt.value}
                    onSelect={() => {
                      if (isSelected) {
                        selectedValues.delete(opt.value);
                      } else {
                        selectedValues.add(opt.value);
                      }
                      apply(Array.from(selectedValues));
                    }}
                  >
                    <div
                      className={cn(
                        "mr-2 flex h-4 w-4 items-center justify-center rounded-sm border border-primary",
                        isSelected
                          ? "bg-primary text-primary-foreground"
                          : "opacity-50 [&_svg]:invisible"
                      )}
                    >
                      <CheckIcon className={cn("h-4 w-4")} />
                    </div>
                    <span>{opt.label}</span>
                  </CommandItem>
                );
              })}
            </CommandGroup>
            {selectedValues.size > 0 && (
              <>
                <CommandSeparator />
                <CommandGroup>
                  <CommandItem
                    onSelect={() => column?.setFilterValue(undefined)}
                    className="justify-center text-center"
                  >
                    Limpar filtro
                  </CommandItem>
                </CommandGroup>
              </>
            )}
          </CommandList>
        </Command>
      </PopoverContent>
    </Popover>
  );
}

