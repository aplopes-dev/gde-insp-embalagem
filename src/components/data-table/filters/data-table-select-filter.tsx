"use client";

import { Button } from "@/components/ui/button";
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from "@/components/ui/command";
import NotificationCount from "@/components/ui/notification-count";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { FilterType } from "@/types/filter";
import { Column } from "@tanstack/react-table";
import { CheckCircle, Circle } from "lucide-react";

interface DataTableSelectFilterProps<TData, TValue> {
  column?: Column<TData, TValue>;
  title?: string;
  placeholder?: string;
  notFoundMessage?: string;
  options: {
    label: string;
    value: string;
  }[];
}

export function DataTableSelectFilter<TData, TValue>({
  column,
  title,
  placeholder,
  notFoundMessage,
  options,
}: DataTableSelectFilterProps<TData, TValue>) {
  const selectedValue: any = column?.getFilterValue() || "";

  function onSelectionChange(value: any): void {
    const filter: FilterType = {
      value,
      operator: "equals",
    };
    if (selectedValue.value !== value) {
      column?.setFilterValue(filter);
    }
  }

  return (
    <Popover>
      <PopoverTrigger asChild>
        <Button
          variant="outline"
          size="sm"
          className="h-8 border-dashed relative"
        >
          {selectedValue ? (
            <CheckCircle className="mr-2 h-4 w-4" />
          ) : (
            <Circle className="mr-2 h-4 w-4" />
          )}
          {title}
          {selectedValue && <NotificationCount count={1} />}
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-auto p-0">
        <Command>
          <CommandInput placeholder={placeholder} />
          <CommandList>
            <CommandEmpty>{notFoundMessage}</CommandEmpty>
            <CommandGroup>
              {options?.map((opt) => (
                <CommandItem
                  key={opt.value}
                  value={opt.value}
                  onSelect={onSelectionChange}
                >
                  {selectedValue?.value === opt.value ? (
                    <CheckCircle className="mr-2 h-4 w-4" />
                  ) : (
                    <Circle className="mr-2 h-4 w-4" />
                  )}
                  {opt.label}
                </CommandItem>
              ))}
            </CommandGroup>
          </CommandList>
        </Command>
      </PopoverContent>
    </Popover>
  );
}
