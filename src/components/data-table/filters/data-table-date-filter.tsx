import { Button } from "@/components/ui/button";
import { Calendar } from "@/components/ui/calendar";
import NotificationCount from "@/components/ui/notification-count";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { FilterOperatorType, FilterType } from "@/types/filter";
import { getDateLocale } from "@/utils/locale";
import { Column } from "@tanstack/react-table";
import { CalendarIcon } from "lucide-react";

interface DataTableDateFilterProps<TData, TValue> {
  column?: Column<TData, TValue>;
  title?: string;
  operator?: FilterOperatorType;
  localeCode?: string;
}

export function DataTableDateFilter<TData, TValue>({
  column,
  title,
  operator = "equals",
  localeCode = "enUS",
}: DataTableDateFilterProps<TData, TValue>) {
  const selectedValue = column?.getFilterValue() as FilterType;

  function onSelectionChange(value: any): void {
    const filter: FilterType = {
      value,
      operator,
    };
    column?.setFilterValue(value ? filter : undefined);
  }

  return (
    <Popover>
      <PopoverTrigger asChild>
        <Button
          variant="outline"
          size="sm"
          className="h-8 border-dashed relative"
        >
          <CalendarIcon className="mr-2 h-4 w-4" />
          {title}
          {selectedValue?.value && <NotificationCount count={1} />}
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-auto p-0">
        <Calendar
          selected={selectedValue?.value}
          mode="single"
          locale={getDateLocale(localeCode)}
          onSelect={onSelectionChange}
          initialFocus
        />
      </PopoverContent>
    </Popover>
  );
}
