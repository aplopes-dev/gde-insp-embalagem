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
import { CalendarIcon, ChevronDown } from "lucide-react";
import { useState } from "react";

interface DataTableDateFilterProps<TData, TValue> {
  column?: Column<TData, TValue>;
  title?: string;
  localeCode?: string;
}

export function DataTableDateFilter<TData, TValue>({
  column,
  title,
  localeCode = "enUS",
}: DataTableDateFilterProps<TData, TValue>) {
  const [operator, setOperator] = useState<FilterOperatorType>("equals");
  const selectedValue = column?.getFilterValue() as FilterType | undefined;
  const [showSelectFilter, setShowSelectFilter] = useState(false);

  function onSelectionChange(value: any): void {
    if (!value) {
      column?.setFilterValue(undefined);
      return;
    }

    const selectedDate = new Date(value);
    selectedDate.setHours(0, 0, 0, 0);

    let filterValue: any;
    if (operator === "equals") {
      const startDate = new Date(selectedDate);
      startDate.setHours(0, 0, 0, 0);

      const endDate = new Date(selectedDate);
      endDate.setHours(23, 59, 59, 999);

      filterValue = { gte: startDate, lte: endDate };
    } else {
      filterValue = {  operatorDate: selectedDate };
    }

    const filter: FilterType = {
      operator,
      value: filterValue,
    };

    column?.setFilterValue(filter);
  }

  return (
    <Popover>
      <PopoverTrigger asChild>
        <Button
          variant="outline"
          size="sm"
          className="border font-normal relative rounded h-8 text-zinc-400 px-4"
        >
          {title}
          <CalendarIcon className="ml-2 lg:ml-8 h-4 w-4 text-gray-500"  />
          {selectedValue?.value && <NotificationCount count={1} />}
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-auto p-0">
        <div>
          <div className="mb-4 relative">
            <button className="pl-3 flex justify-between"
            onClick={() => setShowSelectFilter(!showSelectFilter)}
            >
            Filtrar
            <ChevronDown className="w-4 ml-2" />
            </button>
            {showSelectFilter &&(
            <ul className="absolute z-10 mt-1 block w-full bg-white border border-gray-300 rounded-md shadow-lg">
              <li
                onClick={() => {
                  setOperator("equals");
                  setShowSelectFilter(false);
                }}
                className={`cursor-pointer py-2 px-4 hover:bg-gray-100 ${operator === "equals" ? 'bg-gray-100 font-medium' : ''}`}
              >
                Em uma data específica
              </li>
              <li
                onClick={() => {
                  setOperator("gte");
                  setShowSelectFilter(false);
                }}
                className={`cursor-pointer py-2 px-4 hover:bg-gray-100 ${operator === "gte" ? 'bg-gray-100 font-medium' : ''}`}
              >
                A partir de uma data
              </li>
              <li
                onClick={() => {
                  setOperator("lte");
                  setShowSelectFilter(false);
                }}
                className={`cursor-pointer py-2 px-4 hover:bg-gray-100 ${operator === "lte" ? 'bg-gray-100 font-medium' : ''}`}
              >
                Antes de uma data
              </li>
            </ul>
          )}
          </div>
          <Calendar
            selected={selectedValue?.value?.gte || selectedValue?.value?.lte}
            mode="single"
            locale={getDateLocale(localeCode)}
            onSelect={onSelectionChange}
            initialFocus
          />
        </div>
      </PopoverContent>
    </Popover>
  );
}
